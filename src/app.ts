import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import client from "prom-client";
import { performance } from "node:perf_hooks";
import { env as envReal } from "./config.js";
import { registerErrorHandler } from "./errors.js";
import { NoteCreate, NoteId } from "./schemas.js";
import { buildInfo } from "./version.js";
import { q } from "./db.js";
import crypto from "node:crypto";

export async function createApp(env = envReal) {
  const app = Fastify({
    logger: { level: "info" },
    genReqId: () => crypto.randomUUID(),
    requestTimeout: env.REQUEST_TIMEOUT,
    bodyLimit: env.BODY_LIMIT,
  });

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    hsts: env.HELMET_HSTS ? { maxAge: 15552000 } : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  const origins = env.CORS_ORIGINS === "*" ? true : env.CORS_ORIGINS.split(",").map(s => s.trim());
  await app.register(cors, {
    origin: origins,
    methods: ["GET","POST","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization","X-Request-Id"],
    credentials: true,
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME,
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
  });

  registerErrorHandler(app);

  app.addHook("onRequest", (req, reply, done) => {
    reply.header("x-request-id", req.id);
    req.__start = performance.now();
    done();
  });

  
  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry });

  const httpDur = new client.Histogram({
    name: "http_request_duration_ms",
    help: "HTTP request duration",
    labelNames: ["route","method","status"],
    buckets: [50,100,200,300,500,1000,2000],
    registers: [registry],
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

  app.get("/healthz", async () => ({ ok: true }));
  app.get("/version", async () => buildInfo);

  app.get("/v1/notes", async () =>
    q("SELECT id,msg,created_at FROM notes ORDER BY id DESC LIMIT 50")
  );

  app.get("/v1/notes/:id", async (req, reply) => {
    const { id } = NoteId.parse(req.params);
    const rows = await q<any[]>("SELECT id,msg,created_at FROM notes WHERE id=?", [id], "select_one");
    if (rows.length === 0) return reply.code(404).send({ error: "not_found" });
    return rows[0];
  });

  app.post("/v1/notes", async (req, reply) => {
    const body = NoteCreate.parse(req.body);
    const r = await q<any>("INSERT INTO notes(msg) VALUES (?)", [body.msg], "insert");
   
    return reply.code(201).send({ id: r.insertId, msg: body.msg });
  });

  app.patch("/v1/notes/:id", async (req, reply) => {
    const { id } = NoteId.parse(req.params);
    const body = NoteCreate.partial().refine(b => b.msg !== undefined, "msg required").parse(req.body);
    const r = await q<any>("UPDATE notes SET msg=? WHERE id=?", [body.msg, id], "update");
   
    if (r.affectedRows === 0) return reply.code(404).send({ error: "not_found" });
    return { id, msg: body.msg };
  });

  app.delete("/v1/notes/:id", async (req, reply) => {
    const { id } = NoteId.parse(req.params);
    const r = await q<any>("DELETE FROM notes WHERE id=?", [id], "delete");
  
    if (r.affectedRows === 0) return reply.code(404).send({ error: "not_found" });
    return reply.code(204).send();
  });

  return app;
}
