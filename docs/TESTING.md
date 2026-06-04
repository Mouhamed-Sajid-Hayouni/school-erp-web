
---

## `docs/TESTING.md`

```md
# Testing Guide

## Role Matrix

### Admin
Should be able to:
- view users in read-only mode
- review pending parent/teacher account requests
- approve or reject pending account requests
- confirm direct user create/edit/delete/password/profile-image actions stay blocked
- manage classes
- manage subjects
- manage schedules
- view reports and academic summaries
- view grades reports

### Teacher
Should be able to:
- manage schedules
- manage attendance
- manage grades

### Student Records
Students do not have direct login accounts.
They are managed as school records only, and timetable, grades, and absences are accessed through linked parent accounts.

### Parent
Should be able to:
- log in
- view linked child data
- view child timetable
- view child grades
- view child attendance / absences

---

## Web Test Checklist

### Users
- Users page opens in read-only mode
- Direct ADMIN/TEACHER/STUDENT account creation through admin user management is blocked
- Parent and teacher accounts are requested through self-registration
- Student records remain school records without direct login
- Pending parent/teacher account requests load
- Approve pending request works
- Reject pending request works
- Direct create/edit/delete/password/profile-image API actions return 403
- Self-service forgot-password reset form is available from the login page
- Password-reset request with a valid email format returns a generic safe message
- Password-reset request with invalid email format returns 400
- Direct password update route remains protected/blocked
- Refresh works

### Classes
- list loads
- create works
- delete works
- refresh works

### Subjects
- list loads
- create works
- delete works
- coefficient displays correctly
- refresh works

### Schedules
- dropdowns load
- create works
- edit works
- delete works
- refresh works

### Attendance
- schedules load
- class students display
- status changes work
- save works
- saved values reload correctly

### Grades
- classes load
- subjects load
- students load
- score input works
- comments input works
- save works
- saved values reload
- exam type reload works

---

## Mobile Test Checklist

### Student Records
- no direct login
- managed as school records only
- timetable, grades, and absences are accessed through linked parent accounts

### Parent
- login works
- app does not close
- linked child displays
- timetable displays
- grades display
- attendance displays
- logout works

---

- Parent/teacher runtime smoke tests require known local credentials or a dedicated demo seed; if no such credentials exist, use code-side boundary scans instead.

## Regression Checklist

After backend changes:
- login still works
- JWT-protected routes still work
- `/api/my-portal` remains parent-only and direct student login remains blocked
- schedule update still works

After web frontend changes:
- dashboard still renders
- role routing still works
- no placeholder pages remain
- allowed pages still function according to role boundaries

After mobile changes:
- APK still builds
- student direct login is blocked
- parent login still works
- parent portal does not crash
