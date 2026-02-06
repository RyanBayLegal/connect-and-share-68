
## Add HR Manager Quick Actions Widget to Dashboard

This plan adds an HR-specific quick actions section to the main Dashboard that is only visible to users with the `hr_manager` role or Super Admins.

---

### Overview

Create a new widget similar to `TrainingQuickActionsWidget` that displays:
- Key HR metrics (pending leave requests, active employees, pending approvals)
- Quick action buttons for the 7 requested HR functions

---

### Cross-Reference: Existing Pages

| HR Button | Existing Page | Route |
|-----------|---------------|-------|
| Employee Records | Directory | `/directory` |
| Payroll Management | Payroll | `/payroll` |
| Leave Requests | Time Management | `/time-management` |
| Compliance Reports | Documents | `/documents` |
| Recruitment Dashboard | HR Onboarding | `/hr-onboarding` |
| Employee Benefits | HR Settings | `/hr-settings` |
| Training & Development | Training Management | `/training-management` |

All pages already exist - we just need to surface them with the widget.

---

### Albonn's Role Status

Verified in database: `albonn@baylegal.com` already has the `hr_manager` role assigned.

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/dashboard/HRQuickActionsWidget.tsx` | HR-specific widget with stats and navigation buttons |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Import and render the new HR widget |

---

### Widget Design

```
+------------------------------------------------------------------+
| HR Management                                                     |
+------------------------------------------------------------------+
|  [Pending Requests: 5]  [Active Employees: 42]  [Approvals: 3]   |
+------------------------------------------------------------------+
|                                                                   |
| [Employee Records]  [Payroll Management]  [Leave Requests]       |
|                                                                   |
| [Compliance Reports]  [Recruitment]  [Employee Benefits]          |
|                                                                   |
| [Training & Development]                                          |
+------------------------------------------------------------------+
```

---

### Implementation Details

**1. `HRQuickActionsWidget.tsx`**

- Import `useAuth` and check `isHRManager()` and `rolesLoaded`
- Show only if user is HR Manager or Super Admin
- Fetch quick stats:
  - Pending time-off requests (from `time_off_requests` where status = 'pending')
  - Active employees (from `profiles` where is_active = true)
  - Pending timesheet approvals (from `timesheets` where status = 'submitted')
- Display 7 navigation buttons with icons:
  - Users icon for Employee Records
  - DollarSign for Payroll Management
  - Calendar for Leave Requests
  - FileText for Compliance Reports
  - ClipboardList for Recruitment Dashboard
  - Heart for Employee Benefits
  - GraduationCap for Training & Development

**2. Dashboard Integration**

Add the widget after the Birthdays section and before Training Quick Actions:
```typescript
import { HRQuickActionsWidget } from "@/components/dashboard/HRQuickActionsWidget";

// In the return statement
<section className="container pt-4">
  <HRQuickActionsWidget />
</section>
```

---

### Access Control

- Uses `isHRManager()` from AuthContext which returns `true` for:
  - Users with `hr_manager` role
  - Users with `super_admin` role
- Uses `rolesLoaded` to prevent flash of incorrect content

---

### Visual Style

- Matches the existing `TrainingQuickActionsWidget` gradient style
- Uses a blue/teal gradient to differentiate from training (purple)
- Responsive grid layout for buttons (3 columns on desktop, 2 on tablet, 1 on mobile)
- Each button has an icon and label

---

### User Experience

When an HR manager (like Albonn) loads the Dashboard:
1. The widget appears after Birthdays section
2. Shows real-time stats for pending items
3. Provides one-click access to all HR functions
4. Regular employees do not see this widget
