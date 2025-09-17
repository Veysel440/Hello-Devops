import '@fastify/jwt';
import 'fastify';
import type { Registry, Histogram, Counter } from 'prom-client';

declare module 'fastify' {
  interface FastifyInstance {
    refresh: import('@fastify/jwt').JWT;
    auth: {
      requireAuth: any;
      requireRole: (roles: string[]) => any;
    };
    metrics?: {
      registry: Registry;
      httpDur: Histogram<string>;
      notesCreated: Counter<string>;
    };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: number; roles: string[]; jti?: string; type?: 'refresh' };
    user: { sub: number; roles: string[] };
  }
}
