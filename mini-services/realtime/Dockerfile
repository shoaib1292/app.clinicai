# ClinicAI — Realtime Socket.io Service
FROM node:22-bookworm-slim AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY index.ts ./

EXPOSE 3003

CMD ["node", "--import", "tsx", "index.ts"]
