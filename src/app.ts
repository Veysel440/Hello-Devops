import crypto from "node:crypto";
import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { env as envReal } from "./config.js";
import { registerErrorHandler } from "./errors.js";
import { registerMetrics } from "./plugins/metrics.js";
import { healthRoutes } from "./routes/health.js";
import { noteRoutes } from "./routes/notes.js";

export async function createApp(env = envReal) {
  const app = Fastify({
    logger: {
      level: "info",
      redact: {
        paths: [
          "req.headers.authorization",
          "body.password",
          "body.token",
          'res.headers["set-cookie"]'
        ],
        censor: "[REDACTED]"
      }
    },
    genReqId: () => crypto.randomUUID(),
    requestTimeout: env.REQUEST_TIMEOUT,
    bodyLimit: env.BODY_LIMIT
  });

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    hsts: env.HELMET_HSTS ? { maxAge: 15552000 } : false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  });

  await app.register(swagger, {
    openapi: {
      info: { title: "hello-devops API", version: "1.0.0" },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      tags: [{ name: "notes" }, { name: "health" }]
    }
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  const origins = env.CORS_ORIGINS === "*" ? true : env.CORS_ORIGINS.split(",").map(s => s.trim());
  await app.register(cors, {
    origin: origins,
    methods: ["GET","POST","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization","X-Request-Id"],
    credentials: true
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME,
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true
    }
  });

  registerErrorHandler(app);
  registerMetrics(app);
  await app.register(healthRoutes);
  await app.register(noteRoutes);
  return app;
}