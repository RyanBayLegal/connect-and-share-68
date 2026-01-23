

# Implementation Plan: Task Notifications, Dashboard Widget, and Task Comments

This plan covers email notifications for task due dates and assignment changes, a dashboard widget for upcoming and overdue tasks, and task comments with activity history.

---

## Overview

| Feature | Description |
|---------|-------------|
| Email Notifications | Send reminders for due dates and notify users when assigned to tasks |
| Dashboard Widget | Show upcoming due dates and overdue tasks on the main dashboard |
| Task Comments | Allow users to add comments and track activity on tasks |

---

## Part 1: Database Schema Changes

### New Tables Required

**1. `task_comments` - Store comments on tasks**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| task_id | uuid | Reference to task |
| author_id | uuid | User who wrote the comment |
| content | text | Comment text |
| created_at | timestamptz | When comment was added |
| updated_at | timestamptz | Last edit time |

**2. `task_activity` - Track all task changes**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| task_id | uuid | Reference to task |
| user_id | uuid | User who made the change |
| action | text | Type of action (created, assigned, status_changed, etc.) |
| old_value | text | Previous value |
| new_value | text | New value |
| created_at | timestamptz | When action occurred |

**RLS Policies:**
- Users can view comments/activity for tasks in accessible projects
- Users can create comments on accessible tasks
- Users can edit/delete their own comments

---

## Part 2: Email Notifications

### Approach
Create edge functions to send emails via Resend for:
1. Task assignment notifications (immediate)
2. Due date reminders (scheduled via cron)

### Connector Required
The Resend connector needs to be connected to enable email sending. This will provide the `RESEND_API_KEY` secret.

### Edge Functions to Create

**1. `send-task-notification`**
- Triggered when a task is assigned or due date changes
- Sends immediate email to assignee
- Includes task title, description, due date, and link to task

**2. `check-due-reminders` (scheduled)**
- Runs daily via pg_cron
- Finds tasks due within 24 hours and 3 days
- Sends reminder emails to assignees
- Tracks sent reminders to avoid duplicates

### Database Trigger
Create a trigger on the `tasks` table to:
- Detect when `assignee_id` changes
- Detect when `due_date` changes
- Call notification edge function via pg_net

---

## Part 3: Dashboard Widget - Upcoming & Overdue Tasks

### Location
Add a new card to `src/pages/Dashboard.tsx` below the announcements section.

### Features
- **Overdue Tasks**: Red highlighting, sorted by most overdue first
- **Due Today**: Yellow/amber highlighting
- **Due This Week**: Regular styling
- Shows task title, project name, due date
- Quick link to task (navigates to Tasks page with project selected)
- Maximum 10 tasks displayed with "View All" link

### Data Fetching
Query tasks where:
- `assignee_id` matches current user's profile ID OR
- `created_by` matches current user's profile ID
- `due_date` is not null
- `status` is not "done"
- Order by due_date ascending

---

## Part 4: Task Comments & Activity

### UI Components

**1. Task Detail Panel (New Component)**
- Slide-out panel or modal when clicking a task card
- Shows full task details
- Tabbed interface: Details | Comments | Activity

**2. Comments Section**
- List of comments with author avatar, name, timestamp
- Rich text input for new comments
- Edit/delete own comments
- Relative timestamps ("2 hours ago")

**3. Activity Timeline**
- Chronological list of all task changes
- Shows who made what change and when
- Icons for different action types:
  - Created
  - Assigned
  - Status changed
  - Priority changed
  - Due date changed
  - Comment added

### Activity Tracking
Automatically log when:
- Task is created
- Assignee changes
- Status changes
- Priority changes
- Due date changes
- Comments are added/edited/deleted

---

## Implementation Summary

### Database Changes

| Change | Purpose |
|--------|---------|
| Create `task_comments` table | Store task comments |
| Create `task_activity` table | Track all task changes |
| Add `task_reminders_sent` table | Track sent reminders |
| Create trigger on `tasks` | Log activity on changes |

### Edge Functions

| Function | Purpose |
|----------|---------|
| `send-task-notification` | Send immediate assignment/update emails |
| `check-due-reminders` | Daily cron to send due date reminders |

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/tasks/TaskDetailPanel.tsx` | Full task detail with comments/activity |
| `src/components/tasks/TaskComments.tsx` | Comments list and input |
| `src/components/tasks/TaskActivity.tsx` | Activity timeline |
| `src/components/dashboard/TasksDueWidget.tsx` | Dashboard widget for due tasks |
| `supabase/functions/send-task-notification/index.ts` | Email notification function |
| `supabase/functions/check-due-reminders/index.ts` | Scheduled reminder function |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Add TasksDueWidget component |
| `src/pages/Tasks.tsx` | Add TaskDetailPanel integration |
| `src/components/tasks/TaskCard.tsx` | Add click handler to open detail panel |

---

## Technical Considerations

### Email Notifications
- Requires Resend connector to be connected
- Emails sent from verified domain (or Resend test domain during development)
- Include unsubscribe/preferences link in emails
- Rate limiting to prevent spam

### Due Date Reminders
- Send 3 days before due date (if not done)
- Send 1 day before due date (if not done)
- Send on due date morning (if not done)
- Track sent reminders to avoid duplicates

### Activity Logging
- Use database trigger for automatic logging
- Captures all changes regardless of frontend
- Efficient querying with proper indexes

### Performance
- Paginate comments and activity (load more on scroll)
- Index `task_id` and `created_at` columns
- Use realtime subscriptions for live updates

---

## Dependency: Resend Connector

For email notifications to work, the Resend connector must be connected. This will:
1. Prompt you to enter or create a Resend API key
2. Automatically inject `RESEND_API_KEY` into edge functions

Without this, email features will be disabled but all other features will work.

