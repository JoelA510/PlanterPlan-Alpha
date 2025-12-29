-- supabase/migrations/20251227220000_rag_init.sql

-- 1. Enable Extensions
create extension if not exists vector;

-- 2. Create RPC for Context Retrieval (Structured)
create or replace function public.rag_get_project_context(
  p_project_id uuid,
  p_limit int default 200
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'project_id', p_project_id,
    'tasks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id,
        'parent_id', t.parent_task_id, 
        'title', t.title,
        'status', t.status,
        'notes', t.notes,
        'updated_at', t.updated_at
      ) order by t.updated_at desc), '[]'::jsonb)
      from public.tasks t
      where t.root_id = p_project_id 
      limit p_limit
    ),
    'resources', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'task_id', r.task_id,
        'type', r.resource_type,
        'title', r.resource_text, 
        'url', r.resource_url,
        'text', r.resource_text,
        'updated_at', r.created_at 
      ) order by r.created_at desc), '[]'::jsonb)
      from public.task_resources r
      join public.tasks t on r.task_id = t.id
      where t.root_id = p_project_id 
      limit p_limit
    )
  );
$$;

-- 3. Create Chunks Table (Unstructured)
create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null, 
  task_id uuid references public.tasks(id) on delete cascade,
  resource_id uuid references public.task_resources(id) on delete cascade,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(1536), 
  fts tsvector generated always as (to_tsvector('english', content)) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Create Indexes
create index if not exists rag_chunks_project_id_idx on public.rag_chunks(project_id);
create index if not exists rag_chunks_task_id_idx on public.rag_chunks(task_id);
create index if not exists rag_chunks_resource_id_idx on public.rag_chunks(resource_id);
create index if not exists rag_chunks_fts_idx on public.rag_chunks using gin(fts);

-- 5. RLS Policies
alter table public.rag_chunks enable row level security;

create policy "Project members can read chunks"
  on public.rag_chunks
  for select
  using (
    exists (
      select 1 from public.project_members
      where project_members.project_id = rag_chunks.project_id
      and project_members.user_id = auth.uid()
    )
  );

create policy "Project members can insert chunks"
  on public.rag_chunks
  for insert
  with check (
    exists (
      select 1 from public.project_members
      where project_members.project_id = rag_chunks.project_id
      and project_members.user_id = auth.uid()
    )
  );

create policy "Project members can update chunks"
  on public.rag_chunks
  for update
  using (
    exists (
      select 1 from public.project_members
      where project_members.project_id = rag_chunks.project_id
      and project_members.user_id = auth.uid()
    )
  );

create policy "Project members can delete chunks"
  on public.rag_chunks
  for delete
  using (
    exists (
      select 1 from public.project_members
      where project_members.project_id = rag_chunks.project_id
      and project_members.user_id = auth.uid()
    )
  );
