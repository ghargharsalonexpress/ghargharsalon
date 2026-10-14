import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

let replSet: MongoMemoryReplSet | undefined;

/** One replica set for the whole run (transactions need one); each test file uses its own database. */
export async function setup(project: TestProject): Promise<void> {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  project.provide("mongoUri", replSet.getUri());
}

export async function teardown(): Promise<void> {
  await replSet?.stop();
}
