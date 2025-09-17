import type { FastifyInstance } from "fastify";
import { NoteCreate, NoteId } from "../schemas.js";
import * as repo from "../repos/notesRepo.js";

const NoteSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    msg: { type: "string" },
    created_at: { type: "string" }
  },
  required: ["id","msg","created_at"]
};

export async function noteRoutes(app: FastifyInstance) {
  app.get("/v1/notes",
    { schema: {
        tags: ["notes"],
        querystring: {
          type: "object",
          properties: {
            cursor: { type: "number", nullable: true },
            limit: { type: "number", minimum: 1, maximum: 100, default: 50 }
          }
        },
        response: {
          200: {
            type: "object",
            properties: {
              items: { type: "array", items: NoteSchema },
              nextCursor: { type: "number", nullable: true }
            },
            required: ["items"]
          }
        }
      } },
    async (req) => {
      const q = req.query as { cursor?: number; limit?: number };
      const items = await repo.listNotesPage(q.cursor, q.limit ?? 50);
      const nextCursor = items.length && items.length === Math.min(q.limit ?? 50, 100)
        ? items[items.length - 1].id
        : null;
      return { items, nextCursor };
    }
  );

  app.get("/v1/notes/:id",
    { schema: {
        tags: ["notes"],
        params: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
        response: { 200: NoteSchema, 404: { type: "object", properties: { error: { type: "string" } } } }
      } },
    async (req, reply) => {
      const { id } = NoteId.parse(req.params);
      const rows = await repo.getNote(id);
      if (rows.length === 0) return reply.code(404).send({ error: "not_found" });
      return rows[0];
    }
  );

  app.post("/v1/notes",
    { schema: {
        tags: ["notes"],
        body: { type: "object", properties: { msg: { type: "string" } }, required: ["msg"] },
        response: { 201: NoteSchema }
      } },
    async (req, reply) => {
      const body = NoteCreate.parse(req.body);
      const r = await repo.createNote(body.msg);
      const id = Number(r.insertId ?? 0n);
      const [created] = await repo.getNote(id);
      app.metrics?.notesCreated.inc();
      return reply.code(201).send(created ?? { id, msg: body.msg, created_at: new Date() });
    }
  );

  app.patch("/v1/notes/:id",
    { schema: {
        tags: ["notes"],
        params: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
        body: { type: "object", properties: { msg: { type: "string" } }, required: ["msg"] },
        response: { 200: NoteSchema, 404: { type: "object", properties: { error: { type: "string" } } } }
      } },
    async (req, reply) => {
      const { id } = NoteId.parse(req.params);
      const body = NoteCreate.parse(req.body);
      const res = await repo.updateNote(id, body.msg);
      // @ts-ignore Kysely MySQL sonucu
      if (!res || res.numUpdatedRows === 0n) return reply.code(404).send({ error: "not_found" });
      const [row] = await repo.getNote(id);
      return row;
    }
  );

  app.delete("/v1/notes/:id",
    { schema: {
        tags: ["notes"],
        params: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
        response: { 204: { type: "null" }, 404: { type: "object", properties: { error: { type: "string" } } } }
      } },
    async (req, reply) => {
      const { id } = NoteId.parse(req.params);
      const res = await repo.deleteNote(id);
      // @ts-ignore
      if (!res || res.numDeletedRows === 0n) return reply.code(404).send({ error: "not_found" });
      return reply.code(204).send();
    }
  );
}
