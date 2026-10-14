/**
 * Local MongoDB without Docker: a one-node replica set (transactions need one, plan C16)
 * on port 27018, with data kept in apps/api/.data/mongo between runs.
 * With Docker Desktop running you can use infra/docker-compose.dev.yml instead.
 */
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const PORT = 27018;
const REPLICA_SET = "rs0";
const dbPath = fileURLToPath(new URL("../.data/mongo", import.meta.url));
const firstRun = !existsSync(dbPath);
mkdirSync(dbPath, { recursive: true });

const replSet = await MongoMemoryReplSet.create({
  replSet: { name: REPLICA_SET, count: 1, storageEngine: "wiredTiger" },
  instanceOpts: [{ port: PORT, dbPath, storageEngine: "wiredTiger" }],
});

console.log(`MongoDB ${firstRun ? "created" : "started"} (data in apps/api/.data/mongo).`);
console.log(`MONGODB_URI=mongodb://127.0.0.1:${PORT}/brand?replicaSet=${REPLICA_SET}`);
console.log("Press Ctrl+C to stop.");

const stop = async () => {
  await replSet.stop({ doCleanup: false });
  process.exit(0);
};
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
