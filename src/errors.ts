import { FastifyInstance } from "fastify";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, _req, reply) => {
    const code = (err as any).statusCode ?? 500;
    const body = {
      error: {
        code,
        name: err.name,
        message: err.message,
      },
    };
    app.log.error({ err }, "unhandled_error");
    reply.code(code).send(body);
  });
}
