# ClinicAI — Realtime Socket.io Service
FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY index.ts ./

EXPOSE 3003

CMD ["bun", "index.ts"]
