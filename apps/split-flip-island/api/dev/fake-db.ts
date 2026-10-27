// Dev only (see dev/build-local.mjs): the real db module with an in-memory table and bucket.
export * from '../src/db.ts';
import { FakeBucket, FakeTable } from '../src/testing/fake-aws.ts';
export const fakeTable = new FakeTable();
export const fakeBucket = new FakeBucket();
export const ddb = { send: fakeTable.send };
export const s3 = { send: fakeBucket.send };
export const queryAll = async (input: { ExpressionAttributeValues: Record<string, string> }) => fakeTable.all(input.ExpressionAttributeValues[':pk']);
