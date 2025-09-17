import mysql from "mysql2/promise";
import { env } from "./config.js";

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: env.DB_POOL_MAX,
  queueLimit: env.DB_POOL_QUEUE,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
});

export async function q<T = any>(
  sql: string,
  params: any[] = [],
): Promise<T> {
  const t0 = Date.now();
  const [rows] = await pool.query({ sql, values: params, timeout: env.DB_STMT_TIMEOUT });
  const dur = Date.now() - t0;
  if (dur > env.DB_SLOW_MS) {
    console.warn("slow_query", { dur, sql });
  }
  return rows as T;
}
