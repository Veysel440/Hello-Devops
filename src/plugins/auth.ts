import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { env } from '../config.js';

async function plugin(app: FastifyInstance) {
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET });
  await app.register(jwt, { secret: env.JWT_REFRESH_SECRET, namespace: 'refresh' });

  const requireAuth = async (req: any, reply: any) => {
    try { await req.jwtVerify(); }
    catch { return reply.code(401).send({ error: 'unauthorized' }); }
  };

  const requireRole = (roles: string[]) => async (req: any, reply: any) => {
    try { await req.jwtVerify(); }
    catch { return reply.code(401).send({ error: 'unauthorized' }); }
    const user = req.user as { roles?: string[] };
    if (!user?.roles?.some(r => roles.includes(r))) {
      return reply.code(403).send({ error: 'forbidden' });
    }
  };

  app.decorate('auth', { requireAuth, requireRole });
}

export default fp(plugin, { name: 'auth-plugin' });
