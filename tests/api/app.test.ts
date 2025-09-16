import { describe, it, expect } from "vitest";
import { createApp } from "../../src/app.js";
import * as db from "../../src/db.js";

describe("API", () => {
  it("healthz", async () => {
    const app = await createApp();
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
  });

  it("list notes", async () => {
    vi.spyOn(db, "q").mockResolvedValueOnce([{ id: 1, msg: "a", created_at: "now" }] as any);
    const app = await createApp();
    const res = await app.inject({ method: "GET", url: "/v1/notes" });
    expect(res.json()).toEqual([{ id: 1, msg: "a", created_at: "now" }]);
  });
});
