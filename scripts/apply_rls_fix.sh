#!/bin/bash
# Try to apply RLS fix using standard local Supabase credentials
export PGPASSWORD=${DB_PASSWORD:-postgres}
HOST=${DB_HOST:-localhost}
USER=${DB_USER:-postgres}
PORT=${DB_PORT:-54322}
DB=${DB_NAME:-postgres}

echo "Attempting to apply fix to $HOST:$PORT/$DB as $USER..."
psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" -f docs/db/fix_rls_policy.sql
