-- Harden permissive task INSERT policies so non-admin users cannot create
-- template-origin rows through project-root or subtask insertion paths.

DROP POLICY IF EXISTS "Allow project creation" ON "public"."tasks";
CREATE POLICY "Allow project creation" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK (
  (
    (("root_id" IS NULL) OR ("root_id" = "id"))
    AND ("parent_task_id" IS NULL)
    AND ("creator" = (SELECT (("auth"."jwt"() ->> 'sub'::"text"))::"uuid" AS "uuid"))
    AND (
      ("origin" IS DISTINCT FROM 'template'::"text")
      OR "public"."is_admin"((SELECT (("auth"."jwt"() ->> 'sub'::"text"))::"uuid" AS "uuid"))
    )
  )
);

DROP POLICY IF EXISTS "Allow subtask creation by members" ON "public"."tasks";
CREATE POLICY "Allow subtask creation by members" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK (
  (
    ("root_id" IS NOT NULL)
    AND "public"."has_project_role"(
      "root_id",
      (SELECT (("auth"."jwt"() ->> 'sub'::"text"))::"uuid" AS "uuid"),
      ARRAY['owner'::"text", 'editor'::"text"]
    )
    AND (
      ("origin" IS DISTINCT FROM 'template'::"text")
      OR "public"."is_admin"((SELECT (("auth"."jwt"() ->> 'sub'::"text"))::"uuid" AS "uuid"))
    )
  )
);
