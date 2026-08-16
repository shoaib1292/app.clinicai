#!/bin/sh
# Next.js standalone binds to process.env.HOSTNAME, which Docker sets to the
# container ID. Force 0.0.0.0 so the server is reachable from Traefik.
export HOSTNAME=0.0.0.0

echo "Starting Next.js server..."
exec node /app/server.js
