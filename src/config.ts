import "dotenv/config";
import { z } from "zod";

const Bool = z
  .union([z.string(), z.boolean()])
  .transform(v => (typeof v === "boolean" ? v : String(v ?? "").toLowerCase() === "true"))
  .pipe(z.boolean());

const EnvSchema = z.object({
  PORT: z.coerce.number().default(8080),

  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().default("app"),
  DB_USER: z.string().default("root"),
  DB_PASS: z.string().default(""),

  JWT_ACCESS_SECRET: z.string().default("dev-access"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  CORS_ORIGINS: z.string().default("*"),
  RATE_LIMIT_MAX: z.coerce.number().default(60),
  RATE_LIMIT_TIME: z.coerce.number().default(60_000),
  BODY_LIMIT: z.coerce.number().default(1_000_000),
  REQUEST_TIMEOUT: z.coerce.number().default(15_000),
  HELMET_HSTS: Bool.default(false),

  // ↓ EKLENDİ
  SWAGGER_ENABLED: Bool.default(false),

  // docs basic auth
  DOCS_USER: z.string().default("admin"),
  DOCS_PASS: z.string().default("admin"),
});

export const env = EnvSchema.parse(process.env);
export type Env = z.infer<typeof EnvSchema>;
