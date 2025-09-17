import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import jwt from "@fastify/jwt";
import { env } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    auth: {
      requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
      requireRole: (roles: string[]) =>
        (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    };
  }
}

async function plugin(app: FastifyInstance) {
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET });

  const requireAuth = async (req: FastifyRequest, reply: FastifyReply) => {
    try { await req.jwtVerify(); }
    catch { return reply.code(401).send({ error: "unauthorized" }); }
  };

  const requireRole = (roles: string[]) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      try { await req.jwtVerify(); }
      catch { return reply.code(401).send({ error: "unauthorized" }); }
      const r = (req.user?.roles ?? []) as string[];
      if (!r.some(x => roles.includes(x))) {
        return reply.code(403).send({ error: "forbidden" });
      }
    };

  app.decorate("auth", { requireAuth, requireRole });
}

export default fp(plugin, { name: "auth-plugin" });
