import type { FastifyInstance } from "fastify";
import client from "prom-client";
import { performance } from "node:perf_hooks";
import crypto from "node:crypto";
import { buildInfo } from "../version.js";

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

  const configHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(process.env))
    .digest("hex")
    .slice(0, 12);

  const build = new client.Gauge({
    name: "app_build_info",
    help: "build labels",
    labelNames: ["version", "sha", "config_hash"],
    registers: [registry],
  });
  build.labels(buildInfo.version, buildInfo.sha, configHash).set(1);

  const notesCreated = new client.Counter({
    name: "notes_created_total",
    help: "created notes",
    registers: [registry],
  });

  app.addHook("onRequest", (req, reply, done) => {
    reply.header("x-request-id", req.id);
   
    req.__start = performance.now(); 
    done();
  });

  app.addHook("onResponse", (req, reply, done) => {
  
    const start: number = req.__start ?? performance.now();
    const durMs = performance.now() - start;
    const route = req.routeOptions?.url ?? req.url;
    httpDur
      .labels({ route, method: req.method, status: String(reply.statusCode) })
      .observe(durMs);
    done();
  });

  app.get("/metrics", async (_req, reply) => {
    reply.header("Content-Type", registry.contentType);
    return registry.metrics();
  });

  app.decorate("metrics", { registry, httpDur, notesCreated });
}

