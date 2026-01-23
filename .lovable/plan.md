
# Implementation Plan: Version Comparison, Rich Text Editor, Sample Data, and Departmental Views

This plan adds four major features to enhance the wiki system and improve departmental resource organization.

---

## Overview

| Feature | Description |
|---------|-------------|
| Version Comparison | Side-by-side diff view showing what changed between article versions |
| Rich Text Editor | TipTap-based WYSIWYG editor replacing plain textarea for wiki content |
| Sample Data | Pre-populate wiki with articles/policies and create versions for testing |
| Departmental Views | Add department filtering to wiki articles and a unified department dashboard |

---

## Part 1: Version Comparison View

### Approach
Create a side-by-side comparison dialog that highlights additions, deletions, and changes between two versions using a text diff algorithm.

### New Files

**src/components/wiki/VersionCompareDialog.tsx**
- Modal showing two versions side-by-side
- Highlight additions (green), deletions (red), and changes
- Dropdown selectors to pick which two versions to compare
- Uses a simple diff algorithm (word-level comparison)
- Shows metadata: version numbers, editors, timestamps

### Modified Files

**src/components/wiki/VersionHistoryDialog.tsx**
- Add "Compare" button on each version row
- Track selected versions for comparison
- Open VersionCompareDialog when comparing

### UI Design

```text
+----------------------------------------------------------+
|  Compare Versions                                        |
+----------------------------------------------------------+
|  v2 (Jan 10)                  v3 (Jan 15)               |
|  Edited by: Jane Doe          Edited by: Ryan Smith      |
+----------------------------------------------------------+
|                                                          |
|  [Left panel - v2]            [Right panel - v3]         |
|                                                          |
|  The company policy...        The company policy...      |
|  -states that all             +requires all              |
|  employees must...            employees to...            |
|                                                          |
+----------------------------------------------------------+
|                                          [Close]         |
+----------------------------------------------------------+
```

---

## Part 2: Rich Text Editor (TipTap)

### Approach
Install TipTap and create a reusable rich text editor component with formatting toolbar.

### Dependencies to Install
- `@tiptap/react` - React bindings for TipTap
- `@tiptap/starter-kit` - Common extensions (bold, italic, headings, lists)
- `@tiptap/extension-placeholder` - Placeholder text support
- `@tiptap/extension-link` - Link support
- `@tiptap/extension-underline` - Underline formatting

### New Files

**src/components/ui/rich-text-editor.tsx**
- Reusable TipTap editor component
- Toolbar with: Bold, Italic, Underline, Strikethrough
- Headings: H1, H2, H3
- Lists: Bullet list, Numbered list
- Links, Blockquotes, Code blocks
- Clean, modern styling matching the app theme

### Modified Files

**src/components/wiki/ArticleFormDialog.tsx**
- Replace `<Textarea>` with `<RichTextEditor>`
- Handle HTML content instead of plain text
- Add content preview toggle

**src/pages/Wiki.tsx**
- Render HTML content safely using `dangerouslySetInnerHTML`
- Add proper prose styling for rendered content

### Editor Toolbar

```text
+----------------------------------------------------------+
| B | I | U | S | H1 | H2 | H3 | • | 1. | "" | </> | Link  |
+----------------------------------------------------------+
|                                                          |
|  [Editor content area]                                   |
|                                                          |
+----------------------------------------------------------+
```

---

## Part 3: Sample Wiki Articles and Policies

### Approach
Insert sample data via the database to demonstrate the wiki and versioning system.

### Sample Content Structure

**Wiki Categories** (if not existing)
- Company Policies
- HR Guidelines  
- IT & Security
- Getting Started

**Sample Policies (with versions)**

1. **Remote Work Policy** (3 versions)
   - v1: Initial remote work guidelines
   - v2: Added equipment requirements
   - v3: Updated to include hybrid model

2. **Code of Conduct** (2 versions)
   - v1: Basic conduct rules
   - v2: Added social media guidelines

3. **Data Security Policy** (2 versions)
   - v1: Initial security requirements
   - v2: Added password policy updates

**Sample Articles**

1. **Welcome to Bay Legal** (Getting Started)
2. **How to Submit Expense Reports** (HR Guidelines)
3. **VPN Setup Guide** (IT & Security)

---

## Part 4: Departmental Views and Enhanced Department Management

### Existing Infrastructure
The database already has:
- `departments` table with RLS policies
- `user_roles` table for role management
- Department associations on: profiles, documents, events, projects, announcements

### Database Changes

**Modify wiki_articles table:**
Add `department_id` column to allow department-specific wiki articles/policies.

```sql
ALTER TABLE wiki_articles 
ADD COLUMN department_id uuid REFERENCES departments(id);

-- Update RLS policy for department filtering
CREATE POLICY "Users can view department articles"
  ON wiki_articles FOR SELECT
  USING (
    is_published = true AND (
      department_id IS NULL OR
      department_id = get_user_department(auth.uid()) OR
      is_admin(auth.uid())
    )
    OR author_id = get_profile_id(auth.uid())
    OR is_admin(auth.uid())
  );
```

### New Files

**src/pages/DepartmentHub.tsx**
- Central hub page showing department-specific resources
- Sections: My Team, Documents, Wiki Articles, Announcements, Events
- Department selector for admins to view other departments
- Quick stats: team size, recent documents, open tasks

### Modified Files

**src/pages/Wiki.tsx**
- Add department filter dropdown
- Show department badge on articles
- Department selector when creating articles

**src/components/wiki/ArticleFormDialog.tsx**
- Add department selector field
- Option for "Company-wide" (null department) or specific department

**src/App.tsx**
- Add route for `/department` (DepartmentHub)

**src/components/layout/AppSidebar.tsx**
- Add "My Department" navigation item

### UI Design: Department Hub

```text
+----------------------------------------------------------+
|  Legal Department                    [Change Department] |
|  12 team members                                         |
+----------------------------------------------------------+
|                                                          |
|  +----------------+  +----------------+  +---------------+
|  | Team Members   |  | Documents      |  | Policies     |
|  | 12 active      |  | 24 files       |  | 8 articles   |
|  | View All ->    |  | View All ->    |  | View All ->  |
|  +----------------+  +----------------+  +---------------+
|                                                          |
|  Recent Documents                                        |
|  +----------------------------------------------------+ |
|  | Contract Template v2.docx           2 hours ago    | |
|  | Client Onboarding Guide.pdf         Yesterday      | |
|  +----------------------------------------------------+ |
|                                                          |
|  Department Announcements                                |
|  +----------------------------------------------------+ |
|  | Q1 Performance Review Deadlines     Jan 15, 2026   | |
|  +----------------------------------------------------+ |
+----------------------------------------------------------+
```

---

## Implementation Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/wiki/VersionCompareDialog.tsx` | Side-by-side version comparison |
| `src/components/ui/rich-text-editor.tsx` | TipTap WYSIWYG editor |
| `src/pages/DepartmentHub.tsx` | Department-centric resource view |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/wiki/VersionHistoryDialog.tsx` | Add compare functionality |
| `src/components/wiki/ArticleFormDialog.tsx` | Rich text editor, department field |
| `src/pages/Wiki.tsx` | Department filter, HTML rendering |
| `src/App.tsx` | Add DepartmentHub route |
| `src/components/layout/AppSidebar.tsx` | Add department nav link |

### Database Changes
| Change | Purpose |
|--------|---------|
| Add `department_id` to `wiki_articles` | Enable department-specific articles |
| Insert sample wiki categories | Test data |
| Insert sample articles with versions | Demonstrate versioning |

### Dependencies to Install
| Package | Purpose |
|---------|---------|
| `@tiptap/react` | TipTap React integration |
| `@tiptap/starter-kit` | Common formatting extensions |
| `@tiptap/extension-placeholder` | Placeholder text |
| `@tiptap/extension-link` | Link support |
| `@tiptap/extension-underline` | Underline formatting |

---

## Technical Considerations

### Rich Text Editor
- Content stored as HTML in database
- Sanitize HTML on render to prevent XSS
- Provide backward compatibility for existing plain text content

### Version Comparison
- Implement word-level diff for readable comparisons
- Color coding: green for additions, red for deletions
- Handle large content gracefully with scrollable panels

### Department Views
- Leverage existing RLS policies that already use `get_user_department()`
- Admins can view all departments
- Regular users see only their department's resources

### Sample Data
- Insert data respecting existing RLS policies
- Use admin profile IDs for author references
- Create realistic version history timestamps
