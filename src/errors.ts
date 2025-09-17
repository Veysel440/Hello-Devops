export class AppError extends Error {
  status: number;
  code: string;
  data?: unknown;
  constructor(status: number, code: string, message?: string, data?: unknown) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

import type { FastifyInstance } from "fastify";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, _req, reply) => {
    const isProd = process.env.NODE_ENV === "production";
    const status = (err as any)?.status ?? 500;

    if (err instanceof AppError) {
      return reply.code(err.status).send({
        error: { code: err.code, message: err.message, ...(err.data ? { data: err.data } : {}) },
      });
    }

    app.log.error({ err }, "unhandled_error");
    return reply.code(status).send({
      error: {
        code: "internal_error",
        message: isProd ? "internal error" : (err as any)?.message ?? "internal error",
      },
    });
  });
}
