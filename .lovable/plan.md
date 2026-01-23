

# Implementation Plan: Directory Profile Editing & Manager Assignment

This plan adds profile editing for employees, manager selection for org chart relationships, and fixes the page margins.

---

## Overview

| Feature | Description |
|---------|-------------|
| Profile Editing | Employees can edit their own job title, phone, location, and bio from directory |
| Manager Assignment | Admins can set manager relationships when creating/editing profiles |
| Increased Margins | Apply larger, more consistent margins to the Directory page |

---

## Part 1: Fix Page Margins

### Problem
Current margins (`px-4 md:px-6 lg:px-8 py-6`) are too close to the edge for the user's preference.

### Solution
Apply larger padding similar to the Dashboard pattern, using a container approach with more generous spacing.

### Changes to `src/pages/Directory.tsx`
- Change wrapper padding to `px-6 md:px-10 lg:px-16 py-8`
- This provides approximately 1.5rem on mobile, 2.5rem on tablet, and 4rem on desktop

---

## Part 2: Profile Editing from Directory

### Current Behavior
- The employee detail dialog is read-only
- Users must go to Settings to edit their profile

### New Behavior
- Users clicking their own profile see an "Edit Profile" mode
- Admins can edit any profile
- Editable fields: Job Title, Phone, Location, Bio
- Non-editable: Name, Email, Department (admin-only changes)

### UI Approach
Add an "Edit" button in the detail dialog that switches to edit mode with input fields.

### Changes to `src/pages/Directory.tsx`

**1. New state variables:**
```text
isEditMode: boolean
editJobTitle: string
editPhone: string
editLocation: string
editBio: string
isSaving: boolean
```

**2. Add edit permission check:**
```text
canEditProfile(employee) = own profile OR isAdmin()
```

**3. Add edit handler function:**
- Update the profile record in database
- Show success toast
- Refresh the employee list
- Exit edit mode

**4. Modify detail dialog:**
- Add Edit button in header (when can edit)
- Toggle between view mode and edit mode
- Edit mode shows input fields instead of static text
- Save/Cancel buttons in edit mode

---

## Part 3: Manager Assignment

### Current State
- Profiles have `manager_id` field (already exists)
- OrgChart uses this to build hierarchy
- AddMemberDialog does not include manager selection

### Solution
Add manager selection dropdown to both:
1. AddMemberDialog (when creating new members)
2. Directory edit mode (for admins editing existing profiles)

### New Component: Manager Select Dropdown
- Dropdown showing all other employees
- Grouped by department for easier finding
- Search/filter capability
- "No Manager" option for top-level positions

### Changes to `src/components/directory/AddMemberDialog.tsx`

**1. Add manager state:**
```text
managerId: string | null
```

**2. Fetch employees list (for manager dropdown)**

**3. Add Manager select field after Department/Role row:**
- Label: "Reports To"
- Dropdown with employee names
- Show department next to name for context

**4. Include manager_id in profile creation**

### Changes to `src/pages/Directory.tsx`

**1. Add edit state for manager:**
```text
editManagerId: string | null
```

**2. In edit mode (admin only), show manager dropdown**

**3. Include manager_id in profile update**

---

## Implementation Summary

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Directory.tsx` | Larger margins, edit mode in detail dialog, manager selection for admins |
| `src/components/directory/AddMemberDialog.tsx` | Add manager selection dropdown |

---

## UI/UX Details

### Employee Detail Dialog - View Mode
```text
+----------------------------------+
| Employee Profile          [Edit] |
+----------------------------------+
|         [Avatar + Upload]        |
|       Name + Badge + Title       |
|                                  |
|   Bio text if present            |
|                                  |
|   Email: value                   |
|   Phone: value                   |
|   Location: value                |
|   Department: value              |
|   Reports To: Manager Name       |
|                                  |
|  [Send Email]  [Message]         |
+----------------------------------+
```

### Employee Detail Dialog - Edit Mode
```text
+----------------------------------+
| Edit Profile                     |
+----------------------------------+
|         [Avatar + Upload]        |
|                                  |
|   Job Title                      |
|   [__________________________]   |
|                                  |
|   Phone                          |
|   [__________________________]   |
|                                  |
|   Location                       |
|   [__________________________]   |
|                                  |
|   Bio                            |
|   [__________________________]   |
|   [__________________________]   |
|                                  |
|   Reports To (admin only)        |
|   [Select Manager v]             |
|                                  |
|   [Cancel]  [Save Changes]       |
+----------------------------------+
```

### Add Member Dialog - With Manager
```text
+----------------------------------+
|     Create New Team Member       |
+----------------------------------+
| ... existing fields ...          |
|                                  |
| Reports To                       |
| [Select Manager v]               |
|                                  |
| ... rest of form ...             |
+----------------------------------+
```

---

## Security Considerations

### Profile Editing Permissions
- Users can only edit their own profile (job_title, phone, location, bio)
- Admins can edit any profile including manager assignment
- RLS policy "Users can update own profile" already allows this
- RLS policy "Admins can manage profiles" allows admin updates

### Manager Assignment
- Only admins can set manager relationships (enforced in UI and validated by RLS)
- Self-referential manager assignment prevented in code

---

## Technical Notes

### Manager Dropdown Implementation
- Query all active profiles except the current employee
- Sort alphabetically by name
- Show format: "First Last (Department)"
- Include "No Manager" option at top

### State Management
- Edit mode state stays local to dialog
- On successful save, refresh employee list
- On cancel, revert to original values

### Responsive Behavior
- Edit form uses same responsive grid as AddMemberDialog
- Margins scale with screen size for consistent appearance

