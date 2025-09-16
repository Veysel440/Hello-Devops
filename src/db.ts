import mysql from "mysql2/promise";
import client from "prom-client";
import { env } from "./config.js";

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
  connectionLimit: 10,
});

const dbDur = new client.Histogram({
  name: "db_query_duration_ms",
  help: "DB query duration",
  labelNames: ["op"],
  buckets: [5, 10, 20, 50, 100, 200, 500, 1000],
});

export async function q<T = any>(sql: string, params: any[] = [], op = "query") {
  const end = dbDur.startTimer({ op });
  try {
    const [rows] = await pool.query(sql, params as any);
    return rows as T;
  } finally {
    end();
  }
}