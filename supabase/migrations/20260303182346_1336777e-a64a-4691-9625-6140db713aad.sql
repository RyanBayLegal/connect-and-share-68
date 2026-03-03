
-- Add attachments column to wiki_articles for storing file references
ALTER TABLE public.wiki_articles ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
