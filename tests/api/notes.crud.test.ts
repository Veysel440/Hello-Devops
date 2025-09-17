import { describe, it, expect } from "vitest";
import { createApp } from "../../src/app.js";
const fakeRepo = {
  listNotesPage: async () => [{ id: 1, msg: "hi", created_at: "now" }],
  getNote: async (id:number)=> id===1 ? [{ id:1, msg:"hi", created_at:"now"}] : [],
  createNote: async (_msg:string)=>({ insertId: 2n }),
  updateNote: async ()=>({ numUpdatedRows: 1n }),
  deleteNote: async ()=>({ numDeletedRows: 1n }),
};

describe("notes (mock repo)", () => {
  it("list", async () => {
    const app = await createApp(undefined, { notesRepo: fakeRepo as any });
    const r = await app.inject({ method:"GET", url:"/v1/notes" });
    expect(r.statusCode).toBe(200);
  });
});
