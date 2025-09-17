import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import * as users from "../repos/usersRepo.js";
import type { UserRow } from "../repos/usersRepo.js";
import { env } from "../config.js";

function ttlToMs(ttl: string) {
  const m = /^(\d+)([smhd])$/.exec(ttl);
  if (!m) return Number(ttl) * 1000;
  const n = Number(m[1]);
  const u = m[2];
  return n * (u === "s" ? 1e3 : u === "m" ? 6e4 : u === "h" ? 36e5 : 864e5);
}

export async function authRoutes(app: FastifyInstance) {
  // REGISTER (opsiyonel)
  app.post(
    "/auth/register",
    {
      schema: {
        tags: ["auth"],
        body: {
          type: "object",
          required: ["username", "password"],
          properties: { username: { type: "string" }, password: { type: "string" } },
        },
        response: { 201: { type: "object", properties: { ok: { type: "boolean" } } } },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as { username?: string; password?: string };
      if (!b.username || !b.password) {
        return reply.code(400).send({ error: "username_password_required" });
      }
      await users.createUser(b.username, b.password, ["admin"]);
      return reply.code(201).send({ ok: true });
    }
  );

  // LOGIN
  app.post(
    "/auth/login",
    {
      schema: {
        tags: ["auth"],
        body: {
          type: "object",
          required: ["username", "password"],
          properties: { username: { type: "string" }, password: { type: "string" } },
        },
        response: {
          200: {
            type: "object",
            required: ["token_type", "access_token"],
            properties: {
              token_type: { type: "string", enum: ["Bearer"] },
              access_token: { type: "string" },
              refresh_token: { type: "string" },
              roles: { type: "array", items: { type: "string" } },
            },
          },
          401: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as { username?: string; password?: string };
      if (!b.username || !b.password) {
        return reply.code(400).send({ error: "username_password_required" });
      }

      const user = (await users.findByUsername(b.username)) as UserRow | undefined;
      if (!user) return reply.code(401).send({ error: "invalid_credentials" });

      const ok = await users.verifyPassword(user, b.password);
      if (!ok) return reply.code(401).send({ error: "invalid_credentials" });

      const roles: string[] = Array.isArray(user.roles)
        ? (user.roles as string[])
        : JSON.parse(String(user.roles));

      const access = app.jwt.sign({ sub: user.id, roles }, { expiresIn: env.JWT_ACCESS_TTL });

      const jti = crypto.randomUUID();
      const refreshExp = new Date(Date.now() + ttlToMs(env.JWT_REFRESH_TTL));
      await users.saveRefresh(user.id, jti, refreshExp);
      await users.enforceRefreshLimit(user.id, 5);

      // Tek jwt plugin kullanıldığı için burada 'secret' verME!
      const refresh = app.jwt.sign(
        { sub: user.id, roles, jti, type: "refresh" },
        { expiresIn: env.JWT_REFRESH_TTL }
      );

      return { token_type: "Bearer", access_token: access, refresh_token: refresh, roles };
    }
  );

  // REFRESH
  app.post(
    "/auth/refresh",
    {
      schema: {
        tags: ["auth"],
        body: { type: "object", required: ["refresh_token"], properties: { refresh_token: { type: "string" } } },
        response: {
          200: {
            type: "object",
            required: ["token_type", "access_token", "refresh_token"],
            properties: {
              token_type: { type: "string", enum: ["Bearer"] },
              access_token: { type: "string" },
              refresh_token: { type: "string" },
            },
          },
          401: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as { refresh_token?: string };
      if (!b.refresh_token) return reply.code(400).send({ error: "refresh_token_required" });

      try {
        const payload = app.jwt.verify(b.refresh_token) as any;
        if (!payload?.jti || !(await users.isRefreshValid(payload.jti))) {
          return reply.code(401).send({ error: "invalid_refresh" });
        }

        // rotate
        await users.revokeRefresh(payload.jti);
        const jti = crypto.randomUUID();
        const refreshExp = new Date(Date.now() + ttlToMs(env.JWT_REFRESH_TTL));
        await users.saveRefresh(payload.sub as number, jti, refreshExp);
        await users.enforceRefreshLimit(payload.sub as number, 5);

        const access = app.jwt.sign(
          { sub: payload.sub, roles: payload.roles ?? [] },
          { expiresIn: env.JWT_ACCESS_TTL }
        );
        const refresh = app.jwt.sign(
          { sub: payload.sub, roles: payload.roles ?? [], jti, type: "refresh" },
          { expiresIn: env.JWT_REFRESH_TTL }
        );

        return { token_type: "Bearer", access_token: access, refresh_token: refresh };
      } catch {
        return reply.code(401).send({ error: "invalid_refresh" });
      }
    }
  );

  // LOGOUT
  app.post(
    "/auth/logout",
    {
      schema: {
        tags: ["auth"],
        body: { type: "object", required: ["refresh_token"], properties: { refresh_token: { type: "string" } } },
        response: { 204: { type: "null" } },
      },
    },
    async (req, reply) => {
      const b = (req.body ?? {}) as { refresh_token?: string };
      if (!b.refresh_token) return reply.code(400).send({ error: "refresh_token_required" });
      try {
        const payload = app.jwt.verify(b.refresh_token) as any;
        if (payload?.jti) await users.revokeRefresh(payload.jti);
      } catch { /* noop */ }
      return reply.code(204).send();
    }
  );

  // ME
  app.get(
    "/auth/me",
    {
      preHandler: app.auth.requireAuth,
      schema: {
        tags: ["auth"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              sub: { type: "number" },
              roles: { type: "array", items: { type: "string" } },
              iat: { type: "number" },
              exp: { type: "number" },
            },
          },
        },
      },
    },
    async (req) => req.user as any
  );
}
