import { createApp } from "./app.js";
import { env } from "./config.js";
import { pool } from "./db.js";

const app = await createApp(env);

const close = async () => {
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on("SIGINT", close);
process.on("SIGTERM", close);

await app.listen({ host: "0.0.0.0", port: env.PORT });
