import type { FastifyInstance } from "fastify";
import client from "prom-client";
import { performance } from "node:perf_hooks";

export function registerMetrics(app: FastifyInstance) {
  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry });

  const httpDur = new client.Histogram({
    name: "http_request_duration_ms",
    help: "HTTP request duration",
    labelNames: ["route", "method", "status"],
    buckets: [50, 100, 200, 300, 500, 1000, 2000],
    registers: [registry],
  });

  app.addHook("onRequest", (req, reply, done) => {
    reply.header("x-request-id", req.id);
    
    req.__start = performance.now();
    done();
  });

  app.addHook("onResponse", (req, reply, done) => {
   
    const start = req.__start ?? performance.now();
    const dur = performance.now() - start;
    const route = req.routeOptions?.url ?? req.url;
    httpDur.labels({ route, method: req.method, status: String(reply.statusCode) }).observe(dur);
    done();
  });

  app.get("/metrics", async (_req, reply) => {
    reply.header("Content-Type", registry.contentType);
    return registry.metrics();
  });

  return { registry, httpDur };
}
