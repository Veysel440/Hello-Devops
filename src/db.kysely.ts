import { Kysely, MysqlDialect, Generated } from "kysely";
import mysql from "mysql2";
import { env } from "./config.js";

export interface NotesTable {
  id: Generated<number>;
  msg: string;
  created_at: Generated<Date>;
}
export interface DB { notes: NotesTable }

export const kdb = new Kysely<DB>({
  dialect: new MysqlDialect({
    pool: mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
    }),
  }),
});
