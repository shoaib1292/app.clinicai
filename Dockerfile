# ── Stage 1: Install dependencies + Build ──
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package manifests
COPY package.json bun.lock ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# Copy application source
COPY tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs ./
COPY src/ ./src/
COPY public/ ./public/
COPY components.json ./

# Generate Prisma client
RUN bunx prisma generate

# Build Next.js standalone
RUN bun run build

# ── Stage 2: Production runtime ──
FROM oven/bun:1 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema + client for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy .env.example as reference (real .env mounted at runtime)
COPY .env.example .env.example

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/api/health').then(r => { process.exit(r.ok ? 0 : 1) }).catch(() => process.exit(1))"

CMD ["bun", "server.js"]
