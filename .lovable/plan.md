

# Implementation Plan: Directory Enhancements

This plan covers adding profile photo uploads in the directory, an admin "Add Member" button for creating new employees, and adding proper page margins.

---

## Overview

| Feature | Description |
|---------|-------------|
| Profile Photo Upload | Enable photo uploads when viewing/editing employee profiles in the directory |
| Add Member Button | Admin-only button to create new employee profiles directly from directory |
| Page Margins | Add consistent padding/margins to page content that's currently too close to edges |

---

## Part 1: Page Margins Fix

### Problem
The Directory page content is too close to the edges because it uses `space-y-6` without any horizontal padding or container.

### Solution
Wrap the Directory page content in a container with proper padding, matching the pattern used in other pages like Dashboard (which uses `container` class for sections).

### Changes to `src/pages/Directory.tsx`
- Add `px-4 md:px-6 lg:px-8 py-6` to the main wrapper div
- Or wrap content in a container class for consistency

---

## Part 2: Profile Photo Upload in Directory

### Current State
- The Settings page already has avatar upload functionality using the `avatars` storage bucket
- The code uploads to `{user_id}/avatar.{ext}` path
- The bucket is public (verified in storage-buckets config)

### Approach
Add a photo upload option to the employee detail dialog, but only for:
1. The logged-in user viewing their own profile
2. Admins viewing any profile

### Changes to `src/pages/Directory.tsx`

**1. Import additions:**
- Import `useAuth` hook to check current user and admin status
- Import `Camera` icon from lucide-react
- Import `toast` from sonner

**2. Add state for upload:**
```typescript
const [isAvatarLoading, setIsAvatarLoading] = useState(false);
```

**3. Add upload handler function:**
- Reuse the same pattern from Settings.tsx
- Upload to `avatars` bucket at `{user_id}/avatar.{ext}`
- Update the profile's `avatar_url` field
- Refresh the employee list after upload

**4. Modify the employee detail dialog:**
- Add camera icon overlay on avatar (like Settings page)
- Show only when viewing own profile or when user is admin
- Handle file input and trigger upload

---

## Part 3: Add Member Button (Admin Only)

### Current State
- The `AdminUsers` component in `/admin` page already has full user creation functionality
- It creates auth user via `supabase.auth.signUp` and then creates profile and role records

### Approach
Create a reusable "Add Member" dialog component that can be used in the Directory page for admins.

### New Component: `src/components/directory/AddMemberDialog.tsx`

**Features:**
- Form fields: First Name, Last Name, Email, Temporary Password
- Optional fields: Department, Role, Job Title, Phone, Location
- Department dropdown populated from departments table
- Role dropdown with available roles
- Avatar upload option in the form

**Form Flow:**
1. Create auth user with email + password
2. Create profile record with all details
3. Assign role in user_roles table
4. Optionally upload avatar if provided
5. Show success message and refresh directory

### Changes to `src/pages/Directory.tsx`

**1. Import the new dialog component**

**2. Add "Add Member" button next to the search/filter controls:**
- Only visible when `isAdmin()` returns true
- Uses Plus icon
- Triggers the AddMemberDialog

**3. Pass refresh callback to dialog:**
- When a new member is created, refetch the employee list

---

## Implementation Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/directory/AddMemberDialog.tsx` | Dialog form for creating new employee profiles |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Directory.tsx` | Add margins, photo upload in detail dialog, Add Member button |

---

## UI/UX Details

### Add Member Dialog Layout
```
+----------------------------------+
|     Create New Team Member       |
+----------------------------------+
| [Avatar Upload Area]             |
|                                  |
| First Name*     Last Name*       |
| [___________]   [___________]    |
|                                  |
| Email*                           |
| [_____________________________]  |
|                                  |
| Temporary Password*              |
| [_____________________________]  |
|                                  |
| Department        Role           |
| [Select v]        [Select v]     |
|                                  |
| Job Title                        |
| [_____________________________]  |
|                                  |
| Phone             Location       |
| [___________]     [___________]  |
|                                  |
|          [Cancel]  [Create]      |
+----------------------------------+
```

### Photo Upload in Detail Dialog
- Camera icon appears on hover over avatar (for self or admin)
- Click opens file picker
- Shows loading spinner during upload
- Avatar updates immediately after success

### Page Margins
- Consistent horizontal padding: `px-4 md:px-6 lg:px-8`
- Vertical padding: `py-6`
- Content doesn't touch screen edges

---

## Technical Notes

### Security Considerations
- Only admins can access Add Member functionality (enforced by `isAdmin()` check)
- Profile RLS policies already allow admins to manage profiles
- Users can only upload their own avatar (or admins can upload for anyone)
- Email verification can be skipped since these are admin-created accounts

### Avatar Storage
- Uses existing public `avatars` bucket
- Path format: `{user_id}/avatar.{extension}`
- Upsert mode to replace existing avatars
- Public URL stored in `profiles.avatar_url`

### Dependencies
- Uses existing Supabase client and storage
- No new packages required
- Reuses patterns from Settings.tsx and AdminUsers.tsx

