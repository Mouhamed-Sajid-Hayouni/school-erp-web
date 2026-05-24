
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
- manage attendance
- manage grades

### Teacher
Should be able to:
- manage schedules
- manage attendance
- manage grades

### Student
Should be able to:
- log in
- view timetable
- view grades
- view absences

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

### Student
- login works
- timetable displays
- grades display
- absences display
- logout works

### Parent
- login works
- app does not close
- linked child displays
- timetable displays
- grades display
- attendance displays
- logout works

---

## Regression Checklist

After backend changes:
- login still works
- JWT-protected routes still work
- `/api/my-portal` still works for both student and parent
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
