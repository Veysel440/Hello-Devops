import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { env } from './config.js';

const MIGR_DIR = path.resolve('src/migrations');

async function ensureTable(conn: mysql.Connection) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);
}

async function applied(conn: mysql.Connection): Promise<Set<string>> {
  const [rows] = await conn.query<any[]>('SELECT name FROM migrations');
  return new Set(rows.map(r => r.name));
}

async function up() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
    multipleStatements: true,
  });

  try {
    await ensureTable(conn);
    const done = await applied(conn);

    const files = fs.readdirSync(MIGR_DIR).filter(f => f.endsWith('.sql')).sort();
    for (const f of files) {
      if (done.has(f)) continue;
      const sql = fs.readFileSync(path.join(MIGR_DIR, f), 'utf8');
      await conn.query(sql);
      await conn.query('INSERT INTO migrations(name) VALUES (?)', [f]);
      console.log('applied:', f);
    }
  } finally {
    await conn.end();
  }
}

async function status() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
  });
  try {
    await ensureTable(conn);
    const [rows] = await conn.query<any[]>('SELECT name, applied_at FROM migrations ORDER BY id');
    console.table(rows);
  } finally {
    await conn.end();
  }
}

const cmd = process.argv[2] ?? 'up';
if (cmd === 'up') up();
else if (cmd === 'status') status();
else {
  console.error('usage: tsx src/migrate.ts [up|status]');
  process.exit(1);
}
