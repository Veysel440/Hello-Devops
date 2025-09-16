import Fastify from "fastify";
import client from "prom-client";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { performance } from "node:perf_hooks";
import { env } from "./config.js";
import { registerErrorHandler } from "./errors.js";
import { q, pool } from "./db.js";
import { NoteCreate, NoteId } from "./schemas.js";

const app = Fastify({
  logger: { level: "info" },
  genReqId: () => crypto.randomUUID(),
});

await app.register(cors, { origin: env.CORS_ORIGINS === "*" ? true : env.CORS_ORIGINS.split(",") });
await app.register(rateLimit, {
  max: env.RATE_LIMIT_MAX,
  timeWindow: env.RATE_LIMIT_TIME,
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
    'retry-after': true,
  },
});

registerErrorHandler(app);

client.collectDefaultMetrics();
const httpDur = new client.Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request duration",
  labelNames: ["route", "method", "status"],
  buckets: [50, 100, 200, 300, 500, 1000, 2000],
});
app.addHook("onRequest", (req, _reply, done) => {
  // @ts-expect-error augment
  req.__start = performance.now();
  done();
});
app.addHook("onResponse", (req, reply, done) => {
  // @ts-expect-error augment
  const start = req.__start ?? performance.now();
  const dur = performance.now() - start;
  const route = req.routeOptions?.url ?? req.url;
  httpDur.labels({ route, method: req.method, status: String(reply.statusCode) }).observe(dur);
  done();
});
app.get("/metrics", async (_req, reply) => {
  reply.header("Content-Type", client.register.contentType);
  return client.register.metrics();
});

app.get("/healthz", async () => ({ ok: true }));

app.get("/v1/notes", async () => {
  return q("SELECT id,msg,created_at FROM notes ORDER BY id DESC LIMIT 50");
});

app.get("/v1/notes/:id", async (req, reply) => {
  const { id } = NoteId.parse(req.params);
  const rows = await q<any[]>("SELECT id,msg,created_at FROM notes WHERE id=?", [id], "select_one");
  if (rows.length === 0) return reply.code(404).send({ error: "not_found" });
  return rows[0];
});

app.post("/v1/notes", async (req, reply) => {
  const body = NoteCreate.parse(req.body);
  const res = await q<any>("INSERT INTO notes(msg) VALUES (?)", [body.msg], "insert");
  return reply.code(201).send({ id: res.insertId, msg: body.msg });
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

const close = async () => {
  app.log.info("shutting_down");
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on("SIGINT", close);
process.on("SIGTERM", close);

await app.listen({ host: "0.0.0.0", port: env.PORT });