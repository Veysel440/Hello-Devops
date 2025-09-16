import "fastify";
declare module "fastify" {
  interface FastifyRequest { __start?: number }
  interface FastifyInstance { metrics?: any }
}