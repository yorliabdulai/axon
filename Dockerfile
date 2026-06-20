FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/core/package.json ./packages/core/
COPY packages/widget/package.json ./packages/widget/
COPY packages/whatsapp/package.json ./packages/whatsapp/
COPY packages/voice/package.json ./packages/voice/
COPY packages/dashboard/package.json ./packages/dashboard/
COPY adapters/package.json ./adapters/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS builder
COPY . .
RUN pnpm build

FROM base AS api
COPY --from=builder /app /app
WORKDIR /app/packages/core
EXPOSE 3000
CMD ["node", "dist/server/index.js"]

FROM base AS dashboard
COPY --from=builder /app /app
WORKDIR /app/packages/dashboard
EXPOSE 3001
ENV PORT=3001
CMD ["pnpm", "start"]
