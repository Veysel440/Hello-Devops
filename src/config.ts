import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  PORT: z.coerce.number().default(8080),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().default("app"),
  DB_USER: z.string().default("root"),
  DB_PASS: z.string().default(""),
  RATE_LIMIT_MAX: z.coerce.number().default(60),
  RATE_LIMIT_TIME: z.coerce.number().default(60_000),
  CORS_ORIGINS: z.string().default("*"),
});

export const env = Env.parse(process.env);
