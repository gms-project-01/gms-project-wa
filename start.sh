#!/bin/sh
set -e
export DATABASE_URL="file:/app/data/prod.db"
echo "[start] DATABASE_URL=$DATABASE_URL"
echo "[start] NODE_ENV=$NODE_ENV"
echo "[start] Node version: $(node --version)"
echo "[start] Checking data dir..."
ls -la /app/data/ 2>/dev/null || echo "[start] /app/data is empty or missing"
echo "[start] Running migration..."
node /app/migrate.mjs
echo "[start] Migration OK, starting server..."
node server.js
