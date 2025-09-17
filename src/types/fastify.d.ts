import type { Registry, Histogram, Counter } from "prom-client";
import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: number; roles: string[] };
    user: { sub: number; roles: string[] };
  }
}

type JwtNs = {
  sign: (payload: import("@fastify/jwt").FastifyJWT["payload"], options?: import("@fastify/jwt").SignOptions) => string;
  verify: (token: string, options?: import("@fastify/jwt").VerifyOptions) => import("@fastify/jwt").FastifyJWT["user"];
  decode: (token: string) => unknown;
};

declare module "fastify" {
  interface FastifyRequest { __start?: number }
  interface FastifyInstance {
    metrics: { registry: Registry; httpDur: Histogram<string>; notesCreated: Counter<string> };
    auth: {
      requireAuth: import("fastify").preHandlerHookHandler;
      requireRole: (roles: string[]) => import("fastify").preHandlerHookHandler;
    };
    // jwt namespace='refresh'
    refresh: JwtNs;
  }
}
