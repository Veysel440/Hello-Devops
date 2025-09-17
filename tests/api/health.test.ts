import { describe, it, expect, beforeAll } from "vitest";
import { createApp } from "../../src/app.js";

beforeAll(() => {
  process.env.SWAGGER_ENABLED = "false";
});

describe("health", () => {
  it("healthz 200", async () => {
    const app = await createApp();
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
  });
});
