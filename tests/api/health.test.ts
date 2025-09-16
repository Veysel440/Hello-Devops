import { describe, it, expect } from "vitest";
import { createApp } from "../../src/app.js";

describe("health", () => {
  it("healthz 200", async () => {
    const app = await createApp();
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
  });
});