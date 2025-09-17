import { describe, it, expect } from "vitest";
import type { OpenAPIV3 } from "openapi-types";
import OpenAPIResponseValidator from "openapi-response-validator";
import { createApp } from "../../src/app.js";
import { env as baseEnv } from "../../src/config.js";

const testEnv = { ...baseEnv, SWAGGER_ENABLED: true };

const repo = {
  listNotesPage: async () => [{ id: 1, msg: "hi", created_at: "now" }],
  getNote: async (id: number) => [{ id, msg: "hi", created_at: "now" }],
  createNote: async (_: string) => ({ insertId: 2n }),
  updateNote: async () => ({ numUpdatedRows: 1n }),
  deleteNote: async () => ({ numDeletedRows: 1n }),
};

const vOf = (spec: OpenAPIV3.Document, path: string, method: "post"|"patch"|"delete") =>
  new OpenAPIResponseValidator({
    responses: (spec.paths?.[path] as OpenAPIV3.PathItemObject)[method]!.responses as any,
    components: spec.components as any,
  });

describe("OpenAPI contract /v1/notes (write)", () => {
  it("POST/PATCH/DELETE uyumlu", async () => {
    const app = await createApp(testEnv as any, { notesRepo: repo as any });
    await app.ready();
    const spec = (app as any).swagger() as OpenAPIV3.Document;
    const token = app.jwt.sign({ sub: 1, roles: ["admin"] }, { expiresIn: "10m" });

    // POST
    const r1 = await app.inject({
      method: "POST", url: "/v1/notes",
      headers: { Authorization: `Bearer ${token}` },
      payload: { msg: "hello" },
    });
    expect(r1.statusCode).toBe(201);
    expect(vOf(spec, "/v1/notes", "post").validateResponse(201, r1.json())).toBeUndefined();

    // PATCH
    const r2 = await app.inject({
      method: "PATCH", url: "/v1/notes/2",
      headers: { Authorization: `Bearer ${token}` },
      payload: { msg: "edited" },
    });
    expect(r2.statusCode).toBe(200);
    expect(vOf(spec, "/v1/notes/{id}", "patch").validateResponse(200, r2.json())).toBeUndefined();

    // DELETE
    const r3 = await app.inject({
      method: "DELETE", url: "/v1/notes/2",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r3.statusCode).toBe(204);
    expect(vOf(spec, "/v1/notes/{id}", "delete").validateResponse(204, null)).toBeUndefined();

    await app.close();
  });
});
