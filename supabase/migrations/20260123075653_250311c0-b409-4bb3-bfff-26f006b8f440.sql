-- Add versioning columns to wiki_articles
ALTER TABLE wiki_articles 
ADD COLUMN current_version integer NOT NULL DEFAULT 1,
ADD COLUMN last_edited_by uuid REFERENCES profiles(id),
ADD COLUMN article_type text NOT NULL DEFAULT 'article';

-- Create versions table
CREATE TABLE wiki_article_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES wiki_articles(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  change_summary text,
  edited_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(article_id, version_number)
);

-- Enable RLS
ALTER TABLE wiki_article_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage versions"
  ON wiki_article_versions FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view versions of published articles"
  ON wiki_article_versions FOR SELECT
  USING (
    article_id IN (
      SELECT id FROM wiki_articles WHERE is_published = true
    )
    OR is_admin(auth.uid())
  );