# Safe Database Migration Guide

This guide explains how to safely apply schema updates while ensuring zero data loss.

## 1. Understanding "Code" vs "Data" in Postgres

In a relational database, we distinguish between:

*   **Data Objects (Tables)**: Ensure your `INSERT`, `UPDATE`, values, and rows live here. **We are NOT dropping these.**
*   **Logic Objects (Views, Functions, Triggers)**: These are "saved code" that run on top of your data.
    *   *Dropping a Function*: Is like deleting a `.js` file. The data in your DB is safe.
    *   *Dropping a Table*: Is like formatting your hard drive. We avoid this at all costs.

**The proposed migration ONLY uses `DROP` on Logic Objects (Functions and Views). It uses `ALTER` on Tables.**

## 2. Backup Procedure (Safety Net)

Before running any migration, perform a full backup.

### Option A: Using Supabase Dashboard (Remote)
1. Go to **Database** -> **Backups**.
2. Click **Download** or **Restore Point**.

### Option B: Using CLI (Local or Remote)
Run this command in your terminal to create a snapshot of your entire database (Schema + Data).

```bash
# Verify connection first
pg_isready -h 127.0.0.1 -p 54322

# Create Backup (Schema + Data)
PGPASSWORD=postgres pg_dump \
  -h 127.0.0.1 \
  -p 54322 \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  --format=plain \
  --file=backup_$(date +%Y%m%d_%H%M%S).sql
```

## 3. Restoration Procedure (Rollback)

If anything goes wrong, you can restore your database to the exact state of the backup.

```bash
# WARNING: This overwrites the current database state
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 54322 \
  -U postgres \
  -d postgres \
  -f backup_YYYYMMDD_HHMMSS.sql
```

## 4. Why "Reseeding" is (Usually) Unnecessary

"Reseeding" means inserting initial data (like template tasks) into an empty table. Since our migration (`ALTER TABLE`) keeps your existing data intact, you do not need to re-run seeds.

*   **Existing Data**: Preserved.
*   **New Columns**: Added with `NULL` or default values.
*   **Views/Functions**: Replaced with newer versions.

If you ever *accidentally* truncate a table, you can recover the initial templates using:
`docs/db/seed_recovery.sql`
