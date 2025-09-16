import "dotenv/config";
import { pool } from "./db.js";

async function main() {
  const sql = `
  CREATE TABLE IF NOT EXISTS notes(
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    msg VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY ix_notes_created (created_at)
  ) ENGINE=InnoDB;`;
  const conn = await pool.getConnection();
  try {
    await conn.query(sql);
    console.log("migrated");
  } finally {
    conn.release();
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
