#!/bin/sh
export DATABASE_URL="file:/app/data/prod.db"
node /app/migrate.mjs
node server.js
