// A small in-memory stand-in for DynamoDB and S3, just enough for the handler tests.
// It understands the commands and expressions this API actually uses and throws on anything else,
// so a new kind of query fails loudly here instead of passing by accident.

type Item = Record<string, unknown>;
type Values = Record<string, unknown>;
type Names = Record<string, string>;

interface Write {
  TableName?: string;
  Key?: { PK: string; SK: string };
  Item?: Item;
  UpdateExpression?: string;
  ConditionExpression?: string;
  ExpressionAttributeNames?: Names;
  ExpressionAttributeValues?: Values;
}

class Cancelled extends Error {
  name = 'TransactionCanceledException';
}
class ConditionFailed extends Error {
  name = 'ConditionalCheckFailedException';
}

export class FakeTable {
  items = new Map<string, Item>();

  private id = (k: { PK: unknown; SK: unknown }) => `${String(k.PK)}|${String(k.SK)}`;
  get = (PK: string, SK: string) => this.items.get(this.id({ PK, SK }));
  put = (item: Item) => void this.items.set(this.id(item as { PK: string; SK: string }), structuredClone(item));
  all = (PK: string) => [...this.items.values()].filter((i) => i.PK === PK).sort((a, b) => String(a.SK).localeCompare(String(b.SK)));

  private name = (token: string, names: Names = {}) => (token.startsWith('#') ? names[token] : token);

  private passes(existing: Item | undefined, w: Write): boolean {
    const cond = w.ConditionExpression;
    if (!cond) return true;
    if (cond === 'attribute_not_exists(PK)') return existing === undefined;
    if (cond === 'attribute_exists(PK)') return existing !== undefined;
    const eq = /^(#?\w+) = (:\w+)$/.exec(cond);
    if (eq) return existing !== undefined && existing[this.name(eq[1], w.ExpressionAttributeNames)] === w.ExpressionAttributeValues?.[eq[2]];
    throw new Error(`fake-aws: unsupported condition "${cond}"`);
  }

  private applyUpdate(existing: Item | undefined, w: Write): Item {
    const item: Item = { ...(existing ?? { PK: w.Key!.PK, SK: w.Key!.SK }) };
    const values = w.ExpressionAttributeValues ?? {};
    const [, setPart = '', removePart = ''] = /^(?:SET (.*?))?(?: ?REMOVE (.*))?$/.exec(w.UpdateExpression ?? '') ?? [];
    // Split on the commas between clauses, not the one inside if_not_exists(a, :b).
    for (const clause of setPart.split(/,(?![^(]*\))/).map((c) => c.trim()).filter(Boolean)) {
      const [target, expr] = clause.split(' = ').map((p) => p.trim());
      const attr = this.name(target, w.ExpressionAttributeNames);
      const counter = /^if_not_exists\((\w+), (:\w+)\) \+ (:\w+)$/.exec(expr);
      if (counter) item[attr] = Number(item[counter[1]] ?? values[counter[2]]) + Number(values[counter[3]]);
      else if (/^:\w+$/.test(expr)) item[attr] = values[expr];
      else throw new Error(`fake-aws: unsupported update "${clause}"`);
    }
    for (const attr of removePart.split(',').map((c) => c.trim()).filter(Boolean)) delete item[this.name(attr, w.ExpressionAttributeNames)];
    return item;
  }

  send = async (command: { constructor: { name: string }; input: Record<string, unknown> }): Promise<Record<string, unknown>> => {
    const input = command.input;
    switch (command.constructor.name) {
      case 'GetCommand': {
        const item = this.items.get(this.id(input.Key as { PK: string; SK: string }));
        return { Item: item ? structuredClone(item) : undefined };
      }
      case 'QueryCommand': {
        if (input.KeyConditionExpression !== 'PK = :pk') throw new Error('fake-aws: unsupported query');
        let found = this.all((input.ExpressionAttributeValues as Values)[':pk'] as string);
        if (input.ScanIndexForward === false) found = found.reverse();
        if (typeof input.Limit === 'number') found = found.slice(0, input.Limit);
        return { Items: structuredClone(found) };
      }
      case 'UpdateCommand': {
        const w = input as Write;
        const existing = this.items.get(this.id(w.Key!));
        if (!this.passes(existing, w)) throw new ConditionFailed('The conditional request failed');
        this.put(this.applyUpdate(existing, w));
        return {};
      }
      case 'TransactWriteCommand': {
        const steps = input.TransactItems as Array<{ Put?: Write; Update?: Write; Delete?: Write }>;
        // All conditions are checked before anything is written, like the real thing.
        for (const step of steps) {
          const w = (step.Put ?? step.Update ?? step.Delete)!;
          const key = step.Put ? (w.Item as { PK: string; SK: string }) : w.Key!;
          if (!this.passes(this.items.get(this.id(key)), w)) throw new Cancelled('Transaction cancelled');
        }
        for (const step of steps) {
          if (step.Put) this.put(step.Put.Item!);
          else if (step.Update) this.put(this.applyUpdate(this.items.get(this.id(step.Update.Key!)), step.Update));
          else if (step.Delete) this.items.delete(this.id(step.Delete.Key!));
        }
        return {};
      }
      default:
        throw new Error(`fake-aws: unsupported command ${command.constructor.name}`);
    }
  };
}

export class FakeBucket {
  objects = new Map<string, Uint8Array>();

  send = async (command: { constructor: { name: string }; input: { Key?: string; Body?: Uint8Array } }): Promise<Record<string, unknown>> => {
    const key = command.input.Key!;
    switch (command.constructor.name) {
      case 'HeadObjectCommand': {
        const body = this.objects.get(key);
        if (!body) throw new Error('NotFound');
        return { ContentLength: body.length };
      }
      case 'GetObjectCommand': {
        const body = this.objects.get(key);
        if (!body) throw new Error('NoSuchKey');
        return { Body: { transformToByteArray: async () => body } };
      }
      case 'PutObjectCommand':
        this.objects.set(key, command.input.Body!);
        return {};
      case 'DeleteObjectCommand':
        this.objects.delete(key);
        return {};
      default:
        throw new Error(`fake-aws: unsupported command ${command.constructor.name}`);
    }
  };
}
