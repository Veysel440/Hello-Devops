import type { FastifyInstance } from "fastify";
import { NoteCreate, NoteId } from "../schemas.js";
import * as repo from "../repos/notesRepo.js";
import type { InsertResult, UpdateResult, DeleteResult } from "kysely";

const NoteSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    msg: { type: "string" },
    created_at: { type: "string" } // ISO
  },
  required: ["id","msg","created_at"]
} as const;

export async function noteRoutes(app: FastifyInstance) {
  app.get("/v1/notes",
    {
      schema: {
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
      }
    },
    async (req) => {
      const q = req.query as { cursor?: number; limit?: number };
      const limit = Math.min(q.limit ?? 50, 100);
      const items = await repo.listNotesPage(q.cursor, limit);
      const nextCursor =
        items.length && items.length === limit ? items[items.length - 1].id : null;
      // tarihleri stringle
      return {
        items: items.map(r => ({ ...r, created_at: new Date(r.created_at).toISOString() })),
        nextCursor
      };
    }
  );

  app.get("/v1/notes/:id",
    {
      schema: {
        tags: ["notes"],
        params: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
        response: { 200: NoteSchema, 404: { type: "object", properties: { error: { type: "string" } } } }
      }
    },
    async (req, reply) => {
      const { id } = NoteId.parse(req.params);
      const rows = await repo.getNote(id);
      if (rows.length === 0) return reply.code(404).send({ error: "not_found" });
      const row = rows[0];
      return { ...row, created_at: new Date(row.created_at).toISOString() };
    }
  );

  app.post("/v1/notes",
    {
      schema: {
        tags: ["notes"],
        body: { type: "object", properties: { msg: { type: "string" } }, required: ["msg"] },
        response: { 201: NoteSchema }
      }
    },
    async (req, reply) => {
      const body = NoteCreate.parse(req.body);
      const r = (await repo.createNote(body.msg)) as InsertResult;
      const id = Number(r.insertId ?? 0);
      const [created] = await repo.getNote(id);
      app.metrics?.notesCreated.inc();
      const out = created
        ? { ...created, created_at: new Date(created.created_at).toISOString() }
        : { id, msg: body.msg, created_at: new Date().toISOString() };
      return reply.code(201).send(out);
    }
  );

  app.patch("/v1/notes/:id",
    {
      schema: {
        tags: ["notes"],
        params: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
        body: { type: "object", properties: { msg: { type: "string" } }, required: ["msg"] },
        response: { 200: NoteSchema, 404: { type: "object", properties: { error: { type: "string" } } } }
      }
    },
    async (req, reply) => {
      const { id } = NoteId.parse(req.params);
      const body = NoteCreate.parse(req.body);
      const res = (await repo.updateNote(id, body.msg)) as UpdateResult;
      if (!res || res.numUpdatedRows === 0n) return reply.code(404).send({ error: "not_found" });
      const [row] = await repo.getNote(id);
      return { ...row, created_at: new Date(row.created_at).toISOString() };
    }
  );

  app.delete("/v1/notes/:id",
    {
      schema: {
        tags: ["notes"],
        params: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
        response: { 204: { type: "null" }, 404: { type: "object", properties: { error: { type: "string" } } } }
      }
    },
    async (req, reply) => {
      const { id } = NoteId.parse(req.params);
      const res = (await repo.deleteNote(id)) as DeleteResult;
      if (!res || res.numDeletedRows === 0n) return reply.code(404).send({ error: "not_found" });
      return reply.code(204).send();
    }
  );
}
