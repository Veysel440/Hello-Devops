import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export class AppError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, status = 400, message?: string, details?: unknown) {
    super(message ?? code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: any, _req: FastifyRequest, reply: FastifyReply) => {
  
    if (err?.code === "ER_BAD_DB_ERROR" || err?.code === "ECONNREFUSED") {
      try { app.metrics?.dbErrors.inc(); } catch {}
    }

 
    if (err instanceof AppError) {
      return reply
        .code(err.status)
        .send({ error: err.code, details: err.details ?? undefined });
    }

  
   const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
const body: any = { error: "internal_error" };

if (process.env.NODE_ENV !== "production") {
  body.details = { message: err?.message, stack: err?.stack };
}
return reply.code(status).send(body);
  });
}
