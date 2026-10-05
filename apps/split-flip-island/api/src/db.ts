import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, type QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { env } from './util.js';

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true }
});

export const table = () => env('TABLE_NAME');
export const leagueId = () => env('LEAGUE_ID');

// Key builders. One place for every key shape (see CLAUDE.md data model).
export const keys = {
  league: (l: string) => `LEAGUE#${l}`,
  meta: () => 'META',
  team: (teamId: string) => `TEAM#${teamId}`,
  teamPrivate: (teamId: string) => `TEAM#${teamId}#PRIVATE`,
  teamName: (name: string) => `TEAMNAME#${normalizeName(name)}`,
  machine: (machineId: string) => `MACHINE#${machineId}`,
  night: (date: string) => `NIGHT#${date}`,
  nightPartition: (l: string, date: string) => `NIGHT#${l}#${date}`,
  score: (teamId: string, machineId: string, at: string, id: string) => `SCORE#${teamId}#${machineId}#${at}#${id}`,
  audit: (l: string) => `AUDIT#${l}`,
  teamScores: (l: string, teamId: string) => `TEAM#${l}#${teamId}`
};

export function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Query that follows pagination. League data is small, so loading it all is fine.
export async function queryAll<T = Record<string, unknown>>(input: Omit<QueryCommandInput, 'TableName'>): Promise<T[]> {
  const items: T[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const out = await ddb.send(new QueryCommand({ ...input, TableName: table(), ExclusiveStartKey }));
    items.push(...((out.Items ?? []) as T[]));
    ExclusiveStartKey = out.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}
