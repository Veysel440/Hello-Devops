import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import * as users from '../repos/usersRepo.js';
import { env } from '../config.js';

function ttlToMs(ttl: string) {
  const m = /^(\d+)([smhd])$/.exec(ttl);
  if (!m) return Number(ttl) * 1000;
  const n = Number(m[1]); const u = m[2];
  return n * (u === 's' ? 1e3 : u === 'm' ? 6e4 : u === 'h' ? 36e5 : 864e5);
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (req, reply) => {
    const b = (req.body ?? {}) as { username?: string; password?: string };
    if (!b.username || !b.password) return reply.code(400).send({ error: 'username_password_required' });
    await users.createUser(b.username, b.password, ['admin']);
    return reply.code(201).send({ ok: true });
  });

  app.post('/auth/login', async (req, reply) => {
    const b = (req.body ?? {}) as { username?: string; password?: string };
    if (!b.username || !b.password) return reply.code(400).send({ error: 'username_password_required' });

    const user = await users.findByUsername(b.username);
    if (!user || !(await users.verifyPassword(user, b.password))) {
      return reply.code(401).send({ error: 'invalid_credentials' });
    }

    const roles: string[] = Array.isArray(user.roles) ? (user.roles as any) : JSON.parse(String(user.roles));
    const access = app.jwt.sign({ sub: user.id, roles }, { expiresIn: env.JWT_ACCESS_TTL });

    const jti = crypto.randomUUID();
    const refreshExp = new Date(Date.now() + ttlToMs(env.JWT_REFRESH_TTL));
    await users.saveRefresh(user.id, jti, refreshExp);
    const refresh = app.refresh.sign({ sub: user.id, roles, jti, type: 'refresh' }, { expiresIn: env.JWT_REFRESH_TTL });

    return { token_type: 'Bearer', access_token: access, refresh_token: refresh, roles };
  });

  app.post('/auth/refresh', async (req, reply) => {
    const b = (req.body ?? {}) as { refresh_token?: string };
    if (!b.refresh_token) return reply.code(400).send({ error: 'refresh_token_required' });

    try {
      const payload = app.refresh.verify(b.refresh_token) as any;
      if (!payload?.jti || !(await users.isRefreshValid(payload.jti))) {
        return reply.code(401).send({ error: 'invalid_refresh' });
      }
      await users.revokeRefresh(payload.jti);
      const jti = crypto.randomUUID();
      const refreshExp = new Date(Date.now() + ttlToMs(env.JWT_REFRESH_TTL));
      await users.saveRefresh(payload.sub, jti, refreshExp);

      const access = app.jwt.sign({ sub: payload.sub, roles: payload.roles ?? [] }, { expiresIn: env.JWT_ACCESS_TTL });
      const refresh = app.refresh.sign({ sub: payload.sub, roles: payload.roles ?? [], jti, type: 'refresh' },
        { expiresIn: env.JWT_REFRESH_TTL });

      return { token_type: 'Bearer', access_token: access, refresh_token: refresh };
    } catch {
      return reply.code(401).send({ error: 'invalid_refresh' });
    }
  });

  app.post('/auth/logout', async (req, reply) => {
    const b = (req.body ?? {}) as { refresh_token?: string };
    if (!b.refresh_token) return reply.code(400).send({ error: 'refresh_token_required' });
    try {
      const payload = app.refresh.verify(b.refresh_token) as any;
      if (payload?.jti) await users.revokeRefresh(payload.jti);
    } catch { /* noop */ }
    return reply.code(204).send();
  });

  app.get('/auth/me', { preHandler: app.auth.requireAuth }, async (req) => req.user);
}
