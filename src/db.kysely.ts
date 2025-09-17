import { Kysely, MysqlDialect, Generated, ColumnType } from 'kysely';
import mysql from 'mysql2/promise';
import { env } from './config.js';

export interface NotesTable {
  id: Generated<number>;
  msg: string;
  created_at: ColumnType<Date, Date | undefined, never>;
}

export interface UsersTable {
  id: Generated<number>;
  username: string;
  password_hash: string;
  roles: string;
  created_at: ColumnType<Date, Date | undefined, never>;
}

export interface RefreshTokensTable {
  id: Generated<number>;
  user_id: number;
  jti: string;
  created_at: ColumnType<Date, Date | undefined, never>;
  expires_at: Date;
  revoked_at: ColumnType<Date | null, Date | null | undefined, Date | null>;
}

export interface DB {
  notes: NotesTable;
  users: UsersTable;
  refresh_tokens: RefreshTokensTable;
}

export const kdb = new Kysely<any>({
  dialect: new MysqlDialect({
    pool: mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: env.DB_POOL_MAX,
    }) as any,
  }),
});