import type { FastifyInstance } from "fastify";
import { NoteCreate, NoteId } from "../schemas.js";
import * as repo from "../repos/notesRepo.js";


const NoteSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    msg: { type: "string" },
    created_at: { type: "string" }
  }
};

export async function noteRoutes(app: FastifyInstance) {
  app.get("/v1/notes",
    {
      schema: {
        tags: ["notes"],
        response: { 200: { type: "array", items: NoteSchema } }
      }
    },
    async () => repo.listNotes()
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
      return rows[0];
    }
  );
 app.post("/v1/notes", {
    schema: {
      tags: ["notes"],
      body: { type: "object", properties: { msg: { type: "string" } }, required: ["msg"] },
      response: { 201: {
        type: "object",
        properties: { id:{type:"number"}, msg:{type:"string"}, created_at:{type:"string"} }
      }}
    }
  }, async (req, reply) => {
    const body = NoteCreate.parse(req.body);
    const r = await repo.createNote(body.msg); 
    const id = Number(r.insertId ?? 0n);
    const rows = id ? await repo.getNote(id) : await repo.listNotes();
    const created = id ? rows[0] : rows.find(n => n.msg === body.msg);
    app.metrics?.notesCreated.inc();
    return reply.code(201).send(created ?? { id, msg: body.msg, created_at: new Date() });
  });

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
      const r = await repo.updateNote(id, body.msg);
      // @ts-ignore
      if (!r || r.numUpdatedRows === 0n) return reply.code(404).send({ error: "not_found" });
      const rows = await repo.getNote(id);
      return rows[0];
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
      const r = await repo.deleteNote(id);
      // @ts-ignore
      if (!r || r.numDeletedRows === 0n) return reply.code(404).send({ error: "not_found" });
      return reply.code(204).send();
    }
  );
}
