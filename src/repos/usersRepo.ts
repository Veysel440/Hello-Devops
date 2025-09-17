import { kdb } from "../db.kysely.js";
import bcrypt from "bcryptjs";

export type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  roles: string | string[];
};

export async function findByUsername(username: string): Promise<UserRow | undefined> {
  const row = await kdb
    .selectFrom("users")
    .selectAll()
    .where("username", "=", username)
    .executeTakeFirst();
  return row as unknown as UserRow | undefined;
}

export const verifyPassword = (u: Pick<UserRow, "password_hash">, plain: string) =>
  bcrypt.compare(plain, u.password_hash);

export async function createUser(username: string, password: string, roles: string[]) {
  const password_hash = await bcrypt.hash(password, 10);
  await kdb
    .insertInto("users")
    .values({ username, password_hash, roles: JSON.stringify(roles) as any })
    .executeTakeFirst();
}

export async function saveRefresh(user_id: number, jti: string, expires_at: Date) {
  await kdb.insertInto("refresh_tokens")
    .values({ user_id, jti, expires_at: expires_at as any })
    .executeTakeFirst();
}

export async function revokeRefresh(jti: string) {
  await kdb.updateTable("refresh_tokens")
    .set({ revoked_at: new Date() as any })
    .where("jti", "=", jti)
    .executeTakeFirst();
}

export async function isRefreshValid(jti: string) {
  const row = await kdb.selectFrom("refresh_tokens").selectAll().where("jti","=",jti).executeTakeFirst();
  if (!row) return false;
  if ((row as any).revoked_at) return false;
  return new Date((row as any).expires_at).getTime() > Date.now();
}

export async function enforceRefreshLimit(userId: number, maxActive = 5) {
  const actives = await kdb.selectFrom("refresh_tokens")
    .select(["id","created_at"])
    .where("user_id","=",userId)
    .where("revoked_at","is",null)
    .orderBy("created_at","desc")
    .execute();
  if (actives.length <= maxActive) return;
  const ids = actives.slice(maxActive).map((r: any) => r.id);
  if (ids.length) {
    await kdb.updateTable("refresh_tokens")
      .set({ revoked_at: new Date() as any })
      .where("id","in",ids as any)
      .execute();
  }
}
