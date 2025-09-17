import crypto from "node:crypto";
import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import basicAuth from "@fastify/basic-auth";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import { env as envReal } from "./config.js";
import { registerErrorHandler } from "./errors.js";
import { registerMetrics } from "./plugins/metrics.js";
import authPlugin from "./plugins/auth.js";
import { healthRoutes } from "./routes/health.js";
import { noteRoutes } from "./routes/notes.js";
import { buildInfo } from "./version.js";
import * as notesRepo from "./repos/notesRepo.js";

type Deps = { notesRepo?: typeof notesRepo };

export async function createApp(env = envReal, deps: Deps = {}) {
  const app = Fastify({
    logger: {
      level: "info",
      redact: {
        paths: [
          "req.headers.authorization",
          "req.body.password",
          "req.body.token",
          'res.headers["set-cookie"]',
        ],
        censor: "[REDACTED]",
      },
    },
    genReqId: () => crypto.randomUUID(),
    requestTimeout: env.REQUEST_TIMEOUT,
    bodyLimit: env.BODY_LIMIT,
  });

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    hsts: env.HELMET_HSTS ? { maxAge: 15552000 } : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  const origins =
    env.CORS_ORIGINS === "*"
      ? true
      : env.CORS_ORIGINS.split(",").map((s) => s.trim());

  await app.register(cors, {
    origin: origins,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    credentials: true,
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME,
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
  });

  registerErrorHandler(app);
  registerMetrics(app);
  await app.register(authPlugin);

  
  await app.register(basicAuth, {
    validate: async (u, p) => {
      if (u !== env.DOCS_USER || p !== env.DOCS_PASS) throw new Error("Unauthorized");
    },
    authenticate: { realm: "docs" },
  });

  const swaggerEnabled = env.SWAGGER_ENABLED;
  if (swaggerEnabled) {
    await app.register(swagger, {
      openapi: {
        info: { title: "Hello DevOps API", version: buildInfo.version },
        components: {
          securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
        },
      },
    });

    await app.register(
      async (s) => {
        s.addHook("onRequest", s.basicAuth as any);
        await s.register(swaggerUI, {
          routePrefix: "/",
          staticCSP: true,
          transformStaticCSP: (h) => h,
        });
      },
      { prefix: "/docs" }
    );
  }

  await app.register(healthRoutes);

  await app.register(async (inst) =>
    noteRoutes(inst, { repo: deps.notesRepo ?? notesRepo })
  );

  return app;
}
