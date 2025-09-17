// src/plugins/metrics.ts
import type { FastifyInstance } from "fastify";
import client from "prom-client";
import { performance } from "node:perf_hooks";
import crypto from "node:crypto";
import { buildInfo } from "../version.js";

declare module "fastify" {
  interface FastifyInstance {
    metrics?: {
      registry: client.Registry;
      httpDur: client.Histogram<"route" | "method" | "status">;
      notesCreated: client.Counter<string>;
      dbErrors: client.Counter<"op">;
    };
  }
  interface FastifyRequest {
    __start?: number;
  }
}

export function registerMetrics(app: FastifyInstance) {
  // idempotent guard: aynı instance'a ikinci kez ekleme
  // @ts-ignore fastify v4'te hasDecorator var
  if (typeof app.hasDecorator === "function" && app.hasDecorator("metrics")) return;

  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry });

  const httpDur = new client.Histogram<"route" | "method" | "status">({
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

  const buildGauge = new client.Gauge({
    name: "app_build_info",
    help: "build labels",
    labelNames: ["version", "sha", "config_hash"],
    registers: [registry],
  });
  buildGauge.labels(buildInfo.version, buildInfo.sha, configHash).set(1);

  const notesCreated = new client.Counter({
    name: "notes_created_total",
    help: "created notes",
    registers: [registry],
  });

  const dbErrors = new client.Counter<"op">({
    name: "app_db_errors_total",
    help: "database errors",
    labelNames: ["op"],
    registers: [registry],
  });

  app.decorate("metrics", { registry, httpDur, notesCreated, dbErrors });

  app.addHook("onRequest", (req, reply, done) => {
    reply.header("x-request-id", req.id);
    req.__start = performance.now();
    done();
  });

  app.addHook("onResponse", (req, reply, done) => {
    const start = req.__start ?? performance.now();
    const durMs = performance.now() - start;
    const route = (req as any).routeOptions?.url ?? req.url;
    // label sırası: route, method, status
    httpDur.labels(route, req.method, String(reply.statusCode)).observe(durMs);
    done();
  });

  app.get("/metrics", async (_req, reply) => {
    reply.header("Content-Type", registry.contentType);
    return registry.metrics();
  });
}
