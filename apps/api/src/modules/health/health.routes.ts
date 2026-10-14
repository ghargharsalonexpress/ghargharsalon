import { Router } from "express";
import mongoose from "mongoose";

async function mongoReady(): Promise<boolean> {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return false;
  try {
    await Promise.race([
      mongoose.connection.db.admin().ping(),
      new Promise((_resolve, reject) => setTimeout(() => reject(new Error("ping timeout")), 2_000)),
    ]);
    return true;
  } catch {
    return false;
  }
}

/** /health/live for "is the process up", /health/ready for "can it serve" (plan C14). */
export function healthRouter(): Router {
  const router = Router();

  router.get("/live", (_req, res) => {
    res.set("Cache-Control", "no-store").json({ status: "ok" });
  });

  router.get("/ready", async (_req, res) => {
    const mongo = await mongoReady();
    res
      .status(mongo ? 200 : 503)
      .set("Cache-Control", "no-store")
      .json({ status: mongo ? "ok" : "unavailable", checks: { mongo: mongo ? "ok" : "down" } });
  });

  return router;
}
