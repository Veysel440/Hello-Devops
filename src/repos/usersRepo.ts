import { kdb } from '../db.kysely.js';
import bcrypt from 'bcryptjs';

export async function findByUsername(username: string) {
  return kdb
    .selectFrom('users')
    .selectAll()
    .where('username', '=', username)
    .executeTakeFirst();
}

export async function createUser(username: string, password: string, roles: string[]) {
  const password_hash = await bcrypt.hash(password, 10);
  await kdb
    .insertInto('users')
    .values({
      username,
      password_hash,
      roles: JSON.stringify(roles), 
      
    })
    .executeTakeFirst();
}

export async function verifyPassword(user: { password_hash: string }, plain: string) {
  return bcrypt.compare(plain, user.password_hash);
}

export async function saveRefresh(user_id: number, jti: string, expires_at: Date) {
  await kdb
    .insertInto('refresh_tokens')
    .values({ user_id, jti, expires_at })
    .executeTakeFirst();
}

export async function revokeRefresh(jti: string) {
  await kdb
    .updateTable('refresh_tokens')
    .set({ revoked_at: new Date() })
    .where('jti', '=', jti)
    .executeTakeFirst();
}

export async function isRefreshValid(jti: string) {
  const row = await kdb
    .selectFrom('refresh_tokens')
    .selectAll()
    .where('jti', '=', jti)
    .executeTakeFirst();

  if (!row) return false;
  if (row.revoked_at) return false;
  return row.expires_at.getTime() > Date.now();
}
