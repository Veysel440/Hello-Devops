import { describe, it, expect, vi } from "vitest";
import type { OpenAPIV3 } from "openapi-types";
import OpenAPIResponseValidator from "openapi-response-validator";
import { createApp } from "../../src/app.js";
import { env as baseEnv } from "../../src/config.js";

const testEnv = { ...baseEnv, SWAGGER_ENABLED: true };

vi.mock("../../src/repos/usersRepo.js", () => ({
  findByUsername: async () => ({ id: 1, username: "admin", password_hash: "x", roles: '["admin"]' }),
  verifyPassword: async () => true,
  saveRefresh: async () => ({}),
  revokeRefresh: async () => ({}),
  isRefreshValid: async () => true,
  enforceRefreshLimit: async () => {},
}));

// --- usersRepo MOCK'u: DB'ye gitmeden login/refresh/logout akışını yürütür ---
vi.mock("../../src/repos/usersRepo.js", () => {
  const mem = {
    tokens: new Map<string, { userId: number; exp: number; revoked?: boolean }>(),
  };
  return {
    findByUsername: async (u: string) =>
      ({ id: 1, username: u, password_hash: "x", roles: '["admin"]' }),
    verifyPassword: async () => true,
    saveRefresh: async (userId: number, jti: string, expiresAt: Date) => {
      mem.tokens.set(jti, { userId, exp: +expiresAt });
      return {};
    },
    revokeRefresh: async (jti: string) => {
      const t = mem.tokens.get(jti);
      if (t) t.revoked = true;
      return {};
    },
    isRefreshValid: async (jti: string) => {
      const t = mem.tokens.get(jti);
      if (!t || t.revoked) return false;
      return t.exp > Date.now();
    },
    enforceRefreshLimit: async () => {},
  };
});

// küçük yardımcı
const validatorOf = (spec: OpenAPIV3.Document, path: string, method: "get" | "post") =>
  new OpenAPIResponseValidator({
    responses: (spec.paths?.[path] as OpenAPIV3.PathItemObject)[method]!.responses as any,
    components: spec.components as any,
  });

describe("OpenAPI contract /auth", () => {
  it("POST /auth/login 200", async () => {
    const app = await createApp(testEnv as any);
    await app.ready();
    const spec = (app as any).swagger() as OpenAPIV3.Document;

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "admin", password: "admin123" },
    });

    expect(res.statusCode).toBe(200);
    const v = validatorOf(spec, "/auth/login", "post");
    expect(v.validateResponse(200, res.json())).toBeUndefined();
    await app.close();
  }, 10000);

  it("POST /auth/refresh 200", async () => {
    const app = await createApp(testEnv as any);
    await app.ready();
    const spec = (app as any).swagger() as OpenAPIV3.Document;

    const login = await app.inject({
      method: "POST", url: "/auth/login",
      payload: { username: "admin", password: "admin123" },
    });
    const { refresh_token } = login.json() as any;

    const res = await app.inject({
      method: "POST", url: "/auth/refresh", payload: { refresh_token },
    });

    expect(res.statusCode).toBe(200);
    const v = validatorOf(spec, "/auth/refresh", "post");
    expect(v.validateResponse(200, res.json())).toBeUndefined();
    await app.close();
  }, 10000);

  it("POST /auth/logout 204", async () => {
    const app = await createApp(testEnv as any);
    await app.ready();

    const login = await app.inject({
      method: "POST", url: "/auth/login",
      payload: { username: "admin", password: "admin123" },
    });
    const { refresh_token } = login.json() as any;

    const res = await app.inject({
      method: "POST", url: "/auth/logout", payload: { refresh_token },
    });

    expect(res.statusCode).toBe(204);
    await app.close();
  }, 10000);

  it("GET /auth/me 200", async () => {
    const app = await createApp(testEnv as any);
    await app.ready();
    const spec = (app as any).swagger() as OpenAPIV3.Document;

    const token = app.jwt.sign({ sub: 1, roles: ["admin"] }, { expiresIn: "10m" });
    const res = await app.inject({
      method: "GET", url: "/auth/me",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const v = validatorOf(spec, "/auth/me", "get");
    expect(v.validateResponse(200, res.json())).toBeUndefined();
    await app.close();
  }, 10000);
});
