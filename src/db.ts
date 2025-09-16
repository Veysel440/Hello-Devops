import mysql from "mysql2/promise";
import { env } from "./config.js";

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 5_000
});

export async function q<T=any>(sql: string, params: any[] = [], kind?: "select_one"|"insert"|"update"|"delete"): Promise<T> {
  const [rows] = await pool.query(sql, params);
  // @ts-ignore
  return rows;
}
