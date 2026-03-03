
-- Unlink articles from categories being deleted
UPDATE public.wiki_articles SET category_id = NULL
WHERE category_id IN (
  SELECT id FROM public.wiki_categories 
  WHERE name IN ('Company Policies', 'HR Guidelines', 'HR & Benefits', 'IT & Security', 'Onboarding', 'Getting Started', 'FAQs')
);

-- Now delete the categories
DELETE FROM public.wiki_categories 
WHERE name IN ('Company Policies', 'HR Guidelines', 'HR & Benefits', 'IT & Security', 'Onboarding', 'Getting Started', 'FAQs');
