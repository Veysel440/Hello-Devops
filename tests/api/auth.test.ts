
import { describe, it, expect, vi } from "vitest";
vi.mock("../../src/repos/usersRepo.js", () => ({
  findByUsername: async () => ({ id: 1, username: "admin", password_hash: "x", roles: '["admin"]' }),
  verifyPassword: async () => true,
  saveRefresh: async () => ({}),
  revokeRefresh: async () => ({}),
  isRefreshValid: async () => true,
  enforceRefreshLimit: async () => ({}),
}));

import { createApp } from "../../src/app.js";

describe("auth", () => {
  it("login -> access/refresh alır", async () => {
    const app = await createApp(undefined, { notesRepo: {
      listNotesPage: async () => [], getNote: async () => [], createNote: async () => ({ insertId: 1n }),
      updateNote: async () => ({ numUpdatedRows: 1n }), deleteNote: async () => ({ numDeletedRows: 1n }),
    } as any });

    const r = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "admin", password: "x" },
    });
    expect(r.statusCode).toBe(200);
    const b = r.json();
    expect(b.token_type).toBe("Bearer");
    expect(b.access_token).toBeTypeOf("string");
    expect(b.refresh_token).toBeTypeOf("string");
  });
});
