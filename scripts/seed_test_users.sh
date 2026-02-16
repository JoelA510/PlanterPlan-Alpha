#!/bin/bash
# Apply seed data for test users
export PGPASSWORD=${DB_PASSWORD:-postgres}
HOST=${DB_HOST:-localhost}
USER=${DB_USER:-postgres}
PORT=${DB_PORT:-54322}
DB=${DB_NAME:-postgres}

echo "Seeding test users to $HOST:$PORT/$DB as $USER..."
psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -f docs/db/seed_auth_users.sql
