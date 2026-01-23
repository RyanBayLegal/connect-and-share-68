

# Implementation Plan: Page Transitions + Policy Versioning System

This plan adds smooth page transitions between routes and enhances the Knowledge Base (Wiki) with full policy management, versioning, and author/date tracking.

---

## Overview

| Feature | Description |
|---------|-------------|
| Page Transitions | Smooth fade/slide animations when navigating between pages |
| Policy Management | Create, edit, and manage knowledge base articles/policies |
| Versioning System | Track version history with changes, dates, and authors |
| Enhanced UI | View version history, compare versions, restore previous versions |

---

## Part 1: Smooth Page Transitions

### Approach
Install `framer-motion` and create a page transition wrapper component that animates route changes.

### New Files

**src/components/layout/PageTransition.tsx**
- Wrapper component using framer-motion's `motion` and `AnimatePresence`
- Fade-in and slide-up animation on page enter
- Smooth fade-out on page exit
- Uses `useLocation` from react-router-dom as animation key

### Modified Files

**src/components/layout/AppLayout.tsx**
- Wrap `{children}` with `PageTransition` component
- Import and integrate the transition wrapper

**package.json**
- Add `framer-motion` dependency

---

## Part 2: Database Schema for Policy Versioning

### New Table: `wiki_article_versions`

Stores the complete history of all article changes:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| article_id | uuid | Reference to wiki_articles |
| version_number | integer | Sequential version (1, 2, 3...) |
| title | text | Article title at this version |
| content | text | Full article content at this version |
| change_summary | text | What changed (optional) |
| edited_by | uuid | Profile ID of editor |
| created_at | timestamp | When this version was saved |

### Modified Table: `wiki_articles`

Add new columns to track versioning metadata:

| New Column | Type | Default | Description |
|------------|------|---------|-------------|
| current_version | integer | 1 | Current version number |
| last_edited_by | uuid | null | Last editor's profile ID |
| article_type | text | 'article' | Type: 'article' or 'policy' |

### RLS Policies for `wiki_article_versions`
- Admins can manage all versions
- Authenticated users can view versions of published articles

---

## Part 3: Enhanced Wiki Page with Policy Management

### New Features in Wiki.tsx

**1. Article Type Filter**
- Filter by "All", "Articles", or "Policies"
- Visual distinction between types (policies have a shield badge)

**2. Enhanced Create/Edit Dialog**
- Article type selector (Article vs Policy)
- Change summary field when editing
- Rich form with all metadata fields

**3. Version History Panel**
- "View History" button on each article
- Shows all versions with:
  - Version number
  - Date/time of change
  - Editor name
  - Change summary
- "Restore" option to revert to previous version
- "Compare" option to see differences (optional, future enhancement)

**4. Article Detail View Enhancements**
- Display current version number
- Show "Last edited by [Name] on [Date]"
- Badge for "Policy" vs "Article" type
- Version history access button

### UI Mockup: Version History Dialog

```text
+------------------------------------------+
|  Version History: [Article Title]        |
+------------------------------------------+
|                                          |
|  v3 (Current)              Jan 15, 2026  |
|  Edited by: Ryan Smith                   |
|  "Updated compliance section"            |
|                                [Restore] |
|  ----------------------------------------|
|  v2                        Jan 10, 2026  |
|  Edited by: Jane Doe                     |
|  "Added new procedures"                  |
|                                [Restore] |
|  ----------------------------------------|
|  v1                        Jan 5, 2026   |
|  Created by: Ryan Smith                  |
|  "Initial version"                       |
|                                          |
+------------------------------------------+
```

---

## Part 4: Implementation Details

### File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add framer-motion |
| `src/components/layout/PageTransition.tsx` | Create | Page transition wrapper |
| `src/components/layout/AppLayout.tsx` | Modify | Integrate PageTransition |
| `supabase/migrations/` | Create | Add versioning tables |
| `src/types/database.ts` | Modify | Add WikiArticleVersion type |
| `src/pages/Wiki.tsx` | Modify | Add policy management, versioning UI |
| `src/components/wiki/VersionHistoryDialog.tsx` | Create | Version history component |
| `src/components/wiki/ArticleFormDialog.tsx` | Create | Create/Edit article dialog |

### Database Migration SQL

```sql
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
```

### PageTransition Component

```tsx
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.3
};

export function PageTransition({ children }) {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

### New TypeScript Type

```ts
// src/types/database.ts
export interface WikiArticleVersion {
  id: string;
  article_id: string;
  version_number: number;
  title: string;
  content: string;
  change_summary: string | null;
  edited_by: string | null;
  created_at: string;
  editor?: Profile;
}

// Update WikiArticle interface
export interface WikiArticle {
  // ... existing fields
  current_version: number;
  last_edited_by: string | null;
  article_type: 'article' | 'policy';
  last_editor?: Profile;
}
```

---

## Part 5: User Workflow

### Creating a New Policy

1. Admin clicks "New Article" button
2. Selects "Policy" as article type
3. Fills in title, content, category
4. Clicks "Publish"
5. System creates article with version 1

### Editing an Existing Policy

1. Admin opens article detail
2. Clicks "Edit" button
3. Makes changes to content
4. Enters change summary (e.g., "Updated compliance requirements")
5. Clicks "Save"
6. System:
   - Saves current version to `wiki_article_versions`
   - Updates article with new content
   - Increments `current_version`
   - Updates `last_edited_by` and `updated_at`

### Viewing Version History

1. User opens article detail
2. Clicks "Version History" button
3. Dialog shows all versions with:
   - Version number
   - Editor name
   - Date
   - Change summary
4. Admin can click "Restore" to revert to any version

---

## Benefits

- **Audit Trail**: Complete history of all policy changes
- **Accountability**: Track who made each change and when
- **Rollback**: Easy restoration of previous versions
- **Compliance**: Essential for legal firms tracking policy updates
- **Smooth UX**: Professional page transitions enhance feel

