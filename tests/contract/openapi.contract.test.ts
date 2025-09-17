import { describe, it, expect } from "vitest";
import type { OpenAPIV3 } from "openapi-types";
import OpenAPIResponseValidator from "openapi-response-validator";
import { createApp } from "../../src/app.js";
import { env as baseEnv } from "../../src/config.js";

const testEnv = { ...baseEnv, SWAGGER_ENABLED: true };

const fakeRepo = {
  listNotesPage: async () => [{ id: 1, msg: "hi", created_at: "now" }],
};

describe("OpenAPI contract", () => {
  it("GET /v1/notes => spec ile uyumlu", async () => {
    const app = await createApp(testEnv as any, { notesRepo: fakeRepo as any });
    await app.ready();

    const spec = (app as any).swagger() as OpenAPIV3.Document;
    const res = await app.inject({ method: "GET", url: "/v1/notes" });
    expect(res.statusCode).toBe(200);

    const path = (spec.paths?.["/v1/notes"] as OpenAPIV3.PathItemObject).get!;
    const validator = new OpenAPIResponseValidator({
      responses: path.responses as any,
      components: spec.components as any,
    });

    const validation = validator.validateResponse(200, res.json());
    expect(validation).toBeUndefined();

    await app.close();
  });
});
