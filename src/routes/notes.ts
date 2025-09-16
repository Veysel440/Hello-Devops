import type { FastifyInstance } from "fastify";
import { NoteCreate, NoteId } from "../schemas.js";
import * as repo from "../repos/notesRepo.js";

export async function noteRoutes(app: FastifyInstance) {
  app.get("/v1/notes", async () => repo.listNotes());

  app.get("/v1/notes/:id", async (req, reply) => {
    const { id } = NoteId.parse(req.params);
    const rows = await repo.getNote(id);
    if (rows.length === 0) return reply.code(404).send({ error: "not_found" });
    return rows[0];
  });

  app.post("/v1/notes", async (req, reply) => {
    const body = NoteCreate.parse(req.body);
    const r = await repo.createNote(body.msg);
    return reply.code(201).send({ id: (r as any).insertId, msg: body.msg });
  });

  app.patch("/v1/notes/:id", async (req, reply) => {
    const { id } = NoteId.parse(req.params);
    const body = NoteCreate.partial().refine(b => b.msg !== undefined, "msg required").parse(req.body);
    const r = await repo.updateNote(id, body.msg!);
    if ((r as any).affectedRows === 0) return reply.code(404).send({ error: "not_found" });
    return { id, msg: body.msg };
  });

  app.delete("/v1/notes/:id", async (req, reply) => {
    const { id } = NoteId.parse(req.params);
    const r = await repo.deleteNote(id);
    if ((r as any).affectedRows === 0) return reply.code(404).send({ error: "not_found" });
    return reply.code(204).send();
  });
}
