import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { buildInfo } from "../version.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/healthz", async () => ({ ok: true }));
  app.get("/readyz", async () => { await pool.query("SELECT 1"); return { ok: true }; });
  app.get("/version", async () => buildInfo);
}
