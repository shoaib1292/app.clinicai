#!/bin/sh
set -e

echo "Applying database schema..."
node /app/node_modules/prisma/build/index.js db push --accept-data-loss --skip-generate

echo "Starting Next.js server..."
exec node /app/server.js
