import type { FastifyInstance } from "fastify";
import { NoteCreate, NoteId } from "../schemas.js";
import * as realRepo from "../repos/notesRepo.js";

const NoteSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    msg: { type: "string" },
    created_at: { type: "string" },
  },
  required: ["id", "msg", "created_at"],
} as const;

type Deps = { repo?: typeof realRepo };

export async function noteRoutes(app: FastifyInstance, deps?: Deps) {
  const repo = deps?.repo ?? realRepo;

  app.get("/v1/notes", {
    schema: {
      tags: ["notes"],
      querystring: {
        type: "object",
        properties: {
          cursor: { type: "number", nullable: true },
          limit: { type: "number", minimum: 1, maximum: 100, default: 50 },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            items: { type: "array", items: NoteSchema },
            nextCursor: { type: "number", nullable: true },
          },
          required: ["items"],
        },
      },
    },
  }, async (req) => {
    const q = req.query as { cursor?: number; limit?: number };
    const limit = Math.min(q.limit ?? 50, 100);
    const items = await repo.listNotesPage(q.cursor, limit);
    const nextCursor = items.length && items.length === limit ? Number(items.at(-1)!.id) : null;
    return { items, nextCursor };
  });

  app.get("/v1/notes/:id", {
    schema: {
      tags: ["notes"],
      params: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
      response: { 200: NoteSchema, 404: { type: "object", properties: { error: { type: "string" } } } },
    },
  }, async (req, reply) => {
    const { id } = NoteId.parse(req.params);
    const rows = await repo.getNote(id);
    if (!rows.length) return reply.code(404).send({ error: "not_found" });
    return rows[0];
  });

  const canWrite = { preHandler: app.auth.requireRole(["writer", "admin"]) };

  app.post("/v1/notes", {
    ...canWrite,
    schema: {
      tags: ["notes"], security: [{ bearerAuth: [] }],
      body: { type: "object", properties: { msg: { type: "string" } }, required: ["msg"] },
      response: { 201: NoteSchema },
    },
  }, async (req, reply) => {
    const body = NoteCreate.parse(req.body);
    const r = await repo.createNote(body.msg);
    const id = Number((r as any).insertId ?? 0n);
    const [created] = await repo.getNote(id);
    app.metrics?.notesCreated.inc();
    return reply.code(201).send(created ?? { id, msg: body.msg, created_at: new Date().toISOString() });
  });

  app.patch("/v1/notes/:id", {
    ...canWrite,
    schema: {
      tags: ["notes"], security: [{ bearerAuth: [] }],
      params: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
      body: { type: "object", properties: { msg: { type: "string" } }, required: ["msg"] },
      response: { 200: NoteSchema, 404: { type: "object", properties: { error: { type: "string" } } } },
    },
  }, async (req, reply) => {
    const { id } = NoteId.parse(req.params);
    const body = NoteCreate.parse(req.body);
    const res = await repo.updateNote(id, body.msg);
    // @ts-ignore Kysely/MySQL result
    if (!res || res.numUpdatedRows === 0n) return reply.code(404).send({ error: "not_found" });
    const [row] = await repo.getNote(id);
    return row ?? { id, msg: body.msg, created_at: new Date().toISOString() };
  });

  app.delete("/v1/notes/:id", {
    ...canWrite,
    schema: {
      tags: ["notes"], security: [{ bearerAuth: [] }],
      params: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
      response: { 204: { type: "null" }, 404: { type: "object", properties: { error: { type: "string" } } } },
    },
  }, async (req, reply) => {
    const { id } = NoteId.parse(req.params);
    const res = await repo.deleteNote(id);
    // @ts-ignore
    if (!res || res.numDeletedRows === 0n) return reply.code(404).send({ error: "not_found" });
    return reply.code(204).send();
  });
}
