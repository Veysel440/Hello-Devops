# ---------- deps
FROM node:20-alpine AS deps
WORKDIR /app
RUN addgroup -S nodejs && adduser -S node -G nodejs
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm i --frozen-lockfile

# ---------- build
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY src ./src
RUN corepack enable && pnpm build

# ---------- prod deps (prune)
FROM node:20-alpine AS proddeps
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm prune --prod

# ---------- runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache curl
COPY --chown=node:node package.json pnpm-lock.yaml ./
COPY --chown=node:node --from=proddeps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=5 CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1
CMD ["node","dist/server.js"]