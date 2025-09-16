# deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm i --frozen-lockfile

# build
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY src ./src
RUN corepack enable && pnpm build

# prod deps (prune)
FROM node:20-alpine AS proddeps
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm prune --prod

# runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
COPY --from=proddeps /app/node_modules node_modules
COPY --from=build /app/dist dist
EXPOSE 8080
CMD ["node","dist/server.js"]
