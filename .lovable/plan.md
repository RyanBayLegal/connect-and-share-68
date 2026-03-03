

## Dashboard Redesign & Feature Updates

### Summary of Changes

Based on the reference image and requirements, there are 7 key changes:

1. **Remove "Your Resources" grid** from Dashboard — move resource links to TopNav
2. **Remove ChatGPT widget** from Dashboard
3. **Move HR Management widget** out of Dashboard into a separate HR tab/page only
4. **Announcements filtering** — department-scoped vs global, department leaders can create
5. **Birthdays/Anniversaries** — already based on profile `date_of_birth` and `date_hired` (confirmed working correctly)
6. **Announcements priority on Dashboard** — important/critical announcements surface at top
7. **Layout realignment** to match reference image design

---

### Database Changes

**Migration needed**: The `announcements` table already has `target_department_id` column. We need to:
- Add department-scoped filtering in the announcements query (show global + user's department only)
- Allow department managers to create announcements (not just admins)

No new tables needed.

---

### File Changes

#### 1. `src/components/layout/TopNav.tsx`
- Add all resource links to desktop nav: Directory, Announcements, Documents, Wiki, Tasks, Training, Messages, Events
- Add them to mobile menu as well
- Use a dropdown/mega-menu for "Resources" or list them directly

#### 2. `src/pages/Dashboard.tsx`
- **Remove**: `resourceCards` array, "Your Resources" grid section, `ChatGPTWidget`, `HRQuickActionsWidget`
- **Remove imports**: `ChatGPTWidget`, `HRQuickActionsWidget`, unused icons
- **Keep**: Hero section, Announcements sidebar widget, BirthdaysAnniversariesWidget, GoogleReviewsWidget, ManagerProgressWidget, TrainingQuickActionsWidget
- **Restructure layout**: Full-width hero → two-column layout below with Celebrations + Announcements on right, Google Reviews on left
- **Announcements widget**: Sort by priority (critical > important > general) so important news appears first

#### 3. `src/pages/Announcements.tsx`
- **Filter by department**: Query announcements where `target_department_id IS NULL` (global) OR `target_department_id = user's department`
- **Creation form**: Add a "Scope" selector (Global vs Department) — set `target_department_id` accordingly
- **Who can create**: Allow `department_manager` role users to create department-scoped announcements (not just `isAdmin`)

#### 4. `src/components/dashboard/HRQuickActionsWidget.tsx`
- No changes to the component itself, but it will be **removed from Dashboard.tsx**
- It already exists on `/hr-dashboard` page, so HR managers access it there

---

### Layout Reference (matching image)

```text
┌─────────────────────────────────────────────────────┐
│ TopNav: Logo | Directory Announcements Documents    │
│         Wiki Tasks Training Messages Events | 🔍 👤 │
├─────────────────────────────────────────────────────┤
│                  HERO BANNER                         │
│          Bay Legal, PC Hub                           │
│    [Explore Resources]  [Quick Wiki Access]          │
├──────────────────────────┬──────────────────────────┤
│                          │  🎂 Celebrations          │
│   Google Reviews         │  Sarah Jenkins - Bday     │
│   (carousel)             │  Marcus Webb - 5yr Anniv  │
│                          ├──────────────────────────┤
│                          │  📢 Announcements         │
│                          │  (priority-sorted)        │
│                          ├──────────────────────────┤
│                          │  Manager Progress         │
│                          │  Training Quick Actions   │
└──────────────────────────┴──────────────────────────┘
```

---

### Announcements Department Scoping Logic

```typescript
// Dashboard & Announcements page query
const query = supabase
  .from("announcements")
  .select("*, category:announcement_categories(*), author:profiles(*)")
  .eq("is_published", true)
  .or(`target_department_id.is.null,target_department_id.eq.${profile?.department_id}`)
  .order("published_at", { ascending: false });
```

For the Dashboard widget, additionally sort critical/important first:
```typescript
// Sort: critical > important > general, then by date
announcements.sort((a, b) => {
  const priorityOrder = { critical: 0, important: 1, general: 2 };
  const pA = priorityOrder[a.priority] ?? 2;
  const pB = priorityOrder[b.priority] ?? 2;
  if (pA !== pB) return pA - pB;
  return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
});
```

---

### Access Control for Announcements Creation

Currently only `isAdmin()` can create. Change to:
- `isAdmin()` → can create global or department announcements
- `hasRole("department_manager")` → can create department-scoped announcements for their own department

