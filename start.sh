#!/bin/sh
set -e
export DATABASE_URL="file:/app/data/prod.db"
echo "[start] DATABASE_URL=$DATABASE_URL"
node /app/migrate.mjs
echo "[start] Migration OK, starting server..."
node server.js
