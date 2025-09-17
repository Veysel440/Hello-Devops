import type { FastifyInstance } from "fastify";
import { ping } from "../repos/notesRepo.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/healthz", async () => ({ ok: true }));

  app.get("/readyz", async (_req, reply) => {
    try {
      await ping();
      return { ready: true };
    } catch {
      return reply.code(503).send({ ready: false });
    }
  });
}
