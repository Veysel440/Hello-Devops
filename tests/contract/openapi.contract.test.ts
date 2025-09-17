import { describe, it, expect } from "vitest";
import OpenAPIResponseValidator from "openapi-response-validator";
import type { OpenAPIV3 } from "openapi-types";
import { createApp } from "../../src/app.js";
import { env as envReal } from "../../src/config.js";

const fakeRepo = {
  listNotesPage: async () => [{ id: 1, msg: "hi", created_at: "now" }],
};

describe("OpenAPI contract", () => {
  it("GET /v1/notes => spec ile uyumlu", async () => {
    const app = await createApp(
      { ...envReal, SWAGGER_ENABLED: true } as any,
      { notesRepo: fakeRepo as any }
    );
    await app.ready();

    // @ts-ignore fastify-swagger runtime API
    const spec = app.swagger() as unknown as OpenAPIV3.Document;

    const res = await app.inject({ method: "GET", url: "/v1/notes" });
    expect(res.statusCode).toBe(200);

    const path = spec.paths?.["/v1/notes"] as OpenAPIV3.PathItemObject;
    const validator = new OpenAPIResponseValidator({
      responses: (path.get!.responses as unknown) as any,
      components: (spec.components as unknown) as any,
    });

    const validation = validator.validateResponse(200, res.json());
    expect(validation).toBeUndefined();

    await app.close();
  });
});
