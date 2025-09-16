import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../../src/app.js";
import * as repo from "../../src/repos/notesRepo.js";

beforeEach(() => { vi.restoreAllMocks(); });

describe("API", () => {
  it("healthz", async () => {
    const app = await createApp();
    const r = await app.inject({ method: "GET", url: "/healthz" });
    expect(r.statusCode).toBe(200);
  });

  it("list notes", async () => {
    vi.spyOn(repo, "listNotes").mockResolvedValue([{ id: 1, msg: "hi", created_at: "now" }] as any);
    const app = await createApp();
    const r = await app.inject({ method: "GET", url: "/v1/notes" });
    expect(r.json()).toEqual([{ id: 1, msg: "hi", created_at: "now" }]);
  });
});