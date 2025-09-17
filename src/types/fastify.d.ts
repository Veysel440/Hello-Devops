import "@fastify/jwt";
import type { Registry, Histogram, Counter } from "prom-client";

declare module "@fastify/jwt" {
  interface FastifyJWT {
  
    payload: { sub: number; roles: string[]; jti?: string; type?: "refresh" };

    user: { sub: number; roles: string[] };
  }
}

declare module "fastify" {
  interface FastifyInstance {
   
    refresh: import("@fastify/jwt").FastifyJwt;
    auth: {
      requireAuth: (req: any, reply: any) => Promise<void>;
      requireRole: (roles: string[]) => (req: any, reply: any) => Promise<void>;
    };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    metrics?: {
      registry: Registry;
      httpDur: Histogram<string>;
      notesCreated: Counter<string>;
    };
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    // imzaladığın payload
    payload: { sub: number; roles: string[]; jti?: string; type?: "refresh" };
    // req.user tipi
    user: { sub: number; roles: string[] };
  }
}