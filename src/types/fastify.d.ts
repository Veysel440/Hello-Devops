import type { Registry, Histogram, Counter } from "prom-client";

declare module "fastify" {
  interface FastifyRequest {
    __start?: number;
  }
  interface FastifyInstance {
    metrics: {
      registry: Registry;
      httpDur: Histogram<string>;
      notesCreated: Counter<string>;
    };
  }
}
