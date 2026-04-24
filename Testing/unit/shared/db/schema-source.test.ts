import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const schema = readFileSync('docs/db/schema.sql', 'utf8');

describe('docs/db/schema.sql source of truth', () => {
 it('contains the Wave 34, 35, and 36 database objects', () => {
  [
   'CREATE OR REPLACE FUNCTION "public"."admin_search_users"',
   'CREATE OR REPLACE FUNCTION "public"."admin_user_detail"',
   'CREATE OR REPLACE FUNCTION "public"."admin_recent_activity"',
   'CREATE OR REPLACE FUNCTION "public"."admin_list_users"',
   'CREATE OR REPLACE FUNCTION "public"."admin_analytics_snapshot"',
   'CREATE OR REPLACE FUNCTION "public"."admin_search_root_tasks"',
   'CREATE OR REPLACE FUNCTION "public"."admin_template_roots"',
   'CREATE OR REPLACE FUNCTION "public"."admin_template_clones"',
   'CREATE TABLE IF NOT EXISTS "public"."ics_feed_tokens"',
   '"template_version" integer DEFAULT 1 NOT NULL',
   '"cloned_from_task_id" "uuid"',
   'CREATE OR REPLACE TRIGGER "trg_bump_template_version"',
   'CREATE INDEX "idx_tasks_cloned_from_task_id"',
  ].forEach((needle) => {
   expect(schema).toContain(needle);
  });
 });

 it('keeps only the hardened timestamptz clone_project_template overload', () => {
  expect(schema).toContain('"p_start_date" timestamp with time zone');
  expect(schema).toContain('"p_due_date" timestamp with time zone');
  expect(schema).not.toMatch(/CREATE OR REPLACE FUNCTION "public"\."clone_project_template"\([^)]*"p_start_date" date/is);
  expect(schema).not.toMatch(
   /CREATE OR REPLACE FUNCTION "public"\."clone_project_template"\("p_template_id" "uuid", "p_new_parent_id" "uuid", "p_new_origin" "text", "p_user_id" "uuid"\)/is,
  );
 });

 it('keeps tasks_with_primary_resource joined to task_resources with Wave 36 columns', () => {
  const viewStart = schema.indexOf('CREATE OR REPLACE VIEW "public"."tasks_with_primary_resource" AS');
  const viewEnd = schema.indexOf('CREATE OR REPLACE VIEW "public"."view_master_library" AS');
  const viewSql = schema.slice(viewStart, viewEnd);

  expect(viewStart).toBeGreaterThanOrEqual(0);
  expect(viewEnd).toBeGreaterThan(viewStart);
  expect(viewSql).toContain('LEFT JOIN "public"."task_resources"');
 expect(viewSql).toContain('"t"."template_version"');
 expect(viewSql).toContain('"t"."cloned_from_task_id"');
 expect(viewSql).not.toContain('NULL::"uuid" AS "resource_id"');
 });

 it('keeps public views as caller-RLS security invoker views', () => {
  expect(schema).toContain('ALTER VIEW "public"."tasks_with_primary_resource" SET ("security_invoker"=\'true\');');
  expect(schema).toContain('ALTER VIEW "public"."view_master_library" SET ("security_invoker"=\'true\');');
 });
});
