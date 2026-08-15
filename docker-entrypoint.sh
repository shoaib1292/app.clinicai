#!/bin/sh

echo "Applying database schema (best-effort)..."
node /app/node_modules/prisma/build/index.js db push --accept-data-loss --skip-generate 2>&1 || echo "db push skipped (will retry on next deploy)"

echo "Starting Next.js server..."
exec node /app/server.js
