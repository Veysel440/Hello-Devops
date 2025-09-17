import { describe, it, expect } from "vitest";
import { createApp } from "../../src/app.js";

const fakeRepo = {
  listNotesPage: async () => [{ id: 1, msg: "hi", created_at: "now" }],
  getNote: async (_id: number) => [],
  createNote: async (_msg: string) => ({ insertId: 1n }),
  updateNote: async () => ({ numUpdatedRows: 1n }),
  deleteNote: async () => ({ numDeletedRows: 1n }),
};

describe("API", () => {
  it("healthz", async () => {
    const app = await createApp(undefined, { notesRepo: fakeRepo as any });
    const r = await app.inject({ method: "GET", url: "/healthz" });
    expect(r.statusCode).toBe(200);
  });

  it("list notes", async () => {
    const app = await createApp(undefined, { notesRepo: fakeRepo as any });
    const r = await app.inject({ method: "GET", url: "/v1/notes" });
    expect(r.json()).toEqual({ items: [{ id: 1, msg: "hi", created_at: "now" }], nextCursor: null });
  });
});
