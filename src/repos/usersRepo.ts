import { kdb } from "../db.kysely.js";
import bcrypt from "bcryptjs";

export type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  roles: string | string[];
  created_at: Date;
};

export async function findByUsername(username: string) {
  return kdb
    .selectFrom("users")
    .selectAll()
    .where("username", "=", username)
    .executeTakeFirst() as Promise<UserRow | undefined>;
}

export async function createUser(username: string, password: string, roles: string[]) {
  const password_hash = await bcrypt.hash(password, 10);
  await kdb
    .insertInto("users")
    .values({ username, password_hash, roles: JSON.stringify(roles) })
    .executeTakeFirst();
}

export const verifyPassword = (hash: string, plain: string) =>
  bcrypt.compare(plain, hash);

export async function saveRefresh(user_id: number, jti: string, expires_at: Date) {
  await kdb
    .insertInto("refresh_tokens")
    .values({ user_id, jti, expires_at })
    .executeTakeFirst();
}

export async function revokeRefresh(jti: string) {
  await kdb
    .updateTable("refresh_tokens")
    .set({ revoked_at: new Date() })
    .where("jti", "=", jti)
    .executeTakeFirst();
}

export async function isRefreshValid(jti: string) {
  const row = await kdb
    .selectFrom("refresh_tokens")
    .selectAll()
    .where("jti", "=", jti)
    .executeTakeFirst();

  if (!row) return false;
  if (row.revoked_at) return false;
  return new Date(row.expires_at).getTime() > Date.now();
}

export async function enforceRefreshLimit(userId: number, maxActive = 5) {
  const actives = await kdb
    .selectFrom("refresh_tokens")
    .select(["id", "jti", "created_at"])
    .where("user_id", "=", userId)
    .where("revoked_at", "is", null)
    .orderBy("created_at", "desc")
    .execute();

  if (actives.length <= maxActive) return;

  const toRevoke = actives.slice(maxActive);
  const ids = toRevoke.map((r: any) => r.id);
  if (ids.length) {
    await kdb
      .updateTable("refresh_tokens")
      .set({ revoked_at: new Date() })
      .where("id", "in", ids)
      .execute();
  }
}
