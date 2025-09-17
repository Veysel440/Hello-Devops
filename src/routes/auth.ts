import type { FastifyInstance } from "fastify";
import { env } from "../config.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (req, reply) => {
    const body = (req.body ?? {}) as { username?: string; password?: string };
    if (body.username !== env.DOCS_USER || body.password !== env.DOCS_PASS) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }
    const userId = 1;
    const roles = ["admin", "writer"];

    const access = app.jwt.sign({ sub: userId, roles });     // access
    const refresh = app.refresh.sign({ sub: userId, roles });      // refresh (namespace)

    return { token_type: "Bearer", access_token: access, refresh_token: refresh, roles };
  });

  app.post("/auth/refresh", async (req, reply) => {
    const body = (req.body ?? {}) as { refresh_token?: string };
    if (!body.refresh_token) return reply.code(400).send({ error: "refresh_token_required" });
    try {
      const payload = app.refresh.verify(body.refresh_token) as any;
      const access = app.jwt.sign({ sub: payload.sub, roles: payload.roles ?? [] });
      return { token_type: "Bearer", access_token: access };
    } catch {
      return reply.code(401).send({ error: "invalid_refresh" });
    }
  });

  app.get("/auth/me", { preHandler: app.auth.requireAuth }, async (req) => req.user);
}
