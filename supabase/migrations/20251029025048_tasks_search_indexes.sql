-- Enable trigram search for fast ILIKE/%% queries
create extension if not exists pg_trgm;

-- Trigram indexes for title + description
create index if not exists tasks_title_trgm_idx on tasks using gin (title gin_trgm_ops);
create index if not exists tasks_description_trgm_idx on tasks using gin (description gin_trgm_ops);

-- Optional full-text index if you prefer to_tsquery/websearch_to_tsquery
-- alter table tasks add column if not exists fts tsvector
--   generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))) stored;
-- create index if not exists tasks_fts_idx on tasks using gin (fts);
