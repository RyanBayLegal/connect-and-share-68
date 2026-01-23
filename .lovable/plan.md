
# Implementation Plan: Kanban Enhancements, Wiki Features, and Admin Role Assignment

This plan covers drag-and-drop Kanban, PDF export for wiki articles, article templates, full-text search with highlighting, non-admin messaging, and assigning admin role to Ryan.

---

## Overview

| Feature | Description |
|---------|-------------|
| Drag-and-Drop Kanban | Reorder tasks by dragging between columns and within columns |
| PDF Export | Download wiki articles as formatted PDF documents |
| Article Templates | Pre-defined templates for common policy and article formats |
| Search Highlighting | Highlight matching terms in search results |
| Non-Admin Message | Inform users that only admins can create/edit articles |
| Role Assignment | Give Ryan (ryan@baylegal.com) super_admin role |

---

## Part 1: Assign Admin Role to Ryan

A database insert to assign the `super_admin` role to Ryan.

**SQL to execute:**
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('57cb22e8-c27d-4450-9a58-619d55357209', 'super_admin');
```

---

## Part 2: Non-Admin User Message

Add an informational banner on the Wiki page for non-admin users explaining that only administrators can create and manage articles.

**File to modify: `src/pages/Wiki.tsx`**

Add below the header section when user is not admin:
- Display an info banner with lock icon
- Text: "Only administrators can create and edit Knowledge Base articles and policies."
- Styled as a subtle, non-intrusive info box

---

## Part 3: Drag-and-Drop Kanban Board

### Approach
Install `@dnd-kit` library (modern, accessible drag-and-drop for React) and implement column-to-column task movement with position updates.

### Dependencies to Install
- `@dnd-kit/core` - Core drag-and-drop functionality
- `@dnd-kit/sortable` - Sortable lists within columns
- `@dnd-kit/utilities` - Utility functions

### Files to Modify

**src/pages/Tasks.tsx**
- Wrap Kanban board with `DndContext`
- Each column becomes a `SortableContext`
- Task cards become `useSortable` draggable items
- Add visual feedback during drag (shadow, opacity)
- Handle `onDragEnd` to update task status and position
- Batch update positions in database

### UI Behavior
- Drag task card → shows drag overlay
- Drop in different column → changes status
- Drop in same column → reorders position
- Smooth animations during transitions
- Cursor changes to grab/grabbing

---

## Part 4: PDF Export for Wiki Articles

### Approach
Use `html2pdf.js` library to convert article HTML content to downloadable PDF with proper styling.

### Dependencies to Install
- `html2pdf.js` - HTML to PDF conversion (client-side)

### Files to Modify

**src/pages/Wiki.tsx**
- Add "Export PDF" button in article detail dialog
- Create `handleExportPdf` function that:
  - Clones article content container
  - Applies print-friendly styling
  - Generates PDF with article title as filename
  - Downloads automatically

### PDF Styling
- Article title as header
- Author and date metadata
- Clean, readable body text
- Page numbers at bottom
- Bay Legal logo/header (optional)

---

## Part 5: Article Templates

### Approach
Create a template system allowing admins to start new articles from pre-defined formats.

### Database Changes

**New table: `wiki_templates`**
```sql
CREATE TABLE wiki_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  content text NOT NULL,
  article_type text NOT NULL DEFAULT 'article',
  category_id uuid REFERENCES wiki_categories(id),
  created_by uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: Admins can manage, all authenticated can view
ALTER TABLE wiki_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage templates"
  ON wiki_templates FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view templates"
  ON wiki_templates FOR SELECT
  USING (is_active = true);
```

**Seed default templates:**
- Policy Template (header, purpose, scope, procedure, enforcement)
- SOP Template (objective, responsibilities, steps, references)
- FAQ Template (question/answer format)
- Guide Template (introduction, prerequisites, steps, troubleshooting)

### Files to Create

**src/components/wiki/TemplateSelector.tsx**
- Dialog showing available templates
- Preview of template content
- "Use Template" button

### Files to Modify

**src/pages/Wiki.tsx**
- Fetch templates alongside categories
- Pass templates to ArticleFormDialog

**src/components/wiki/ArticleFormDialog.tsx**
- Add "Start from Template" button
- Open TemplateSelector dialog
- Populate content when template selected

---

## Part 6: Full-Text Search with Highlighting

### Approach
Implement search term highlighting in article cards and detail view, making it easy to see where matches occur.

### New Files

**src/lib/highlightText.tsx**
- Utility function to wrap matching text in highlight spans
- Case-insensitive matching
- Returns React elements with highlighted portions

```typescript
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => 
    regex.test(part) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark> : part
  );
}
```

### Files to Modify

**src/pages/Wiki.tsx**
- Pass `searchQuery` to ArticleCard component
- Use `highlightText` for title display
- Highlight matching text in article preview
- Highlight matches in full article content view

### UI Behavior
- Yellow highlight on matching terms
- Works in both card previews and detail view
- Smooth visual indication of search matches
- Dark mode compatible styling

---

## Implementation Summary

### Database Changes
| Change | Purpose |
|--------|---------|
| Insert role for Ryan | Enable admin access |
| Create `wiki_templates` table | Store article templates |
| Seed default templates | Provide starting templates |

### Dependencies to Install
| Package | Purpose |
|---------|---------|
| `@dnd-kit/core` | Drag-and-drop core |
| `@dnd-kit/sortable` | Sortable lists |
| `@dnd-kit/utilities` | DnD utilities |
| `html2pdf.js` | PDF generation |

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/wiki/TemplateSelector.tsx` | Template selection dialog |
| `src/lib/highlightText.tsx` | Search highlighting utility |

### Files to Modify
| File | Changes |
|------|---------|
| `src/pages/Tasks.tsx` | Add drag-and-drop functionality |
| `src/pages/Wiki.tsx` | PDF export, templates, highlighting, non-admin message |
| `src/components/wiki/ArticleFormDialog.tsx` | Template selection integration |

---

## Technical Considerations

### Drag-and-Drop
- Use `@dnd-kit` for accessibility compliance (keyboard support, screen readers)
- Optimistic UI updates with database sync
- Handle concurrent edits gracefully
- Debounce position updates to reduce database calls

### PDF Export
- Client-side generation (no server needed)
- Preserve rich text formatting
- Handle long articles with page breaks
- Include metadata (author, version, date)

### Article Templates
- Templates are company-wide (not department-specific)
- Only admins can create/edit templates
- All authenticated users can use templates
- Templates can be category-specific

### Search Highlighting
- Escape special regex characters in search query
- Highlight in stripped HTML for previews
- Highlight in rendered HTML for detail view
- Performance-optimized for large result sets
