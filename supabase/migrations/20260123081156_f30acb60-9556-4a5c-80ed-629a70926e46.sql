-- Add department_id to wiki_articles for department-specific content
ALTER TABLE wiki_articles 
ADD COLUMN department_id uuid REFERENCES departments(id);

-- Drop existing SELECT policy and create updated one with department filtering
DROP POLICY IF EXISTS "Users can view published articles" ON wiki_articles;

CREATE POLICY "Users can view published articles"
  ON wiki_articles FOR SELECT
  USING (
    (is_published = true AND (
      department_id IS NULL OR
      department_id = get_user_department(auth.uid()) OR
      is_admin(auth.uid())
    ))
    OR author_id = get_profile_id(auth.uid())
    OR is_admin(auth.uid())
  );