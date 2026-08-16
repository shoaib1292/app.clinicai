# ── Stage 1: Install dependencies + Build ──
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps

# Copy application source
COPY tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs ./
COPY sentry.client.config.ts sentry.edge.config.ts sentry.server.config.ts ./
COPY src/ ./src/
COPY public/ ./public/
COPY components.json ./

# Generate Prisma client
RUN npx prisma generate

# Apply DB schema (DB is reachable from Coolify's build network via --network host + --add-host)
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma db push --accept-data-loss --skip-generate

# Build Next.js standalone
RUN npm run build

# ── Stage 2: Production runtime ──
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install curl for Coolify healthcheck + ca-certificates for TLS + passwd for useradd
RUN apt-get update -qq && \
    apt-get install -qq --no-install-recommends curl ca-certificates passwd && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid 1001 --no-create-home --shell /bin/sh nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema + generated client for runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy .env.example as reference (real .env mounted at runtime)
COPY .env.example .env.example

# Entrypoint binds to 0.0.0.0 then starts the server
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
