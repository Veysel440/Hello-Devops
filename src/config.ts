import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  PORT: z.coerce.number().default(8080),

  DB_HOST: z.string().default("mysql"),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().default("app"),
  DB_USER: z.string().default("app"),
  DB_PASS: z.string().default("app"),

  RATE_LIMIT_MAX: z.coerce.number().default(60),
  RATE_LIMIT_TIME: z.coerce.number().default(60_000),

  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  BODY_LIMIT: z.coerce.number().default(1_000_000),
  REQUEST_TIMEOUT: z.coerce.number().default(15_000),
  HELMET_HSTS: z.coerce.boolean().default(false),
});

export const env = Env.parse(process.env);
