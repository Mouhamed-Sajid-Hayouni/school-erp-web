
---

## `docs/TESTING.md`

```md
# Testing Guide

## Role Matrix

### Admin
Should be able to:
- create users
- edit users
- delete users
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
- Add User opens the create form
- creating ADMIN works
- creating TEACHER works
- creating STUDENT works with class selection
- creating PARENT works with student linking
- Edit updates first name, last name, and email
- Delete works
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
- CRUD pages still function

After mobile changes:
- APK still builds
- student login still works
- parent login still works
- parent portal does not crash