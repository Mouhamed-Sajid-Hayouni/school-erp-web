# School ERP Web

Web administration and portal frontend for the School ERP System.

## Project Overview

This application is the web frontend of an integrated ERP platform for managing a Tunisian public school.

It supports:

- admin user management
- teacher workflows
- class management
- subject management
- schedule management
- attendance management
- grade management
- student portal
- parent portal

## Project Lead

**Mouhamed Sajid Hayouni**

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- lucide-react
- jsPDF
- jspdf-autotable

## Main Features

### Admin / Teacher
- Create, edit, and delete users
- Create and delete classes
- Create and delete subjects
- Create, edit, and delete schedules
- Record attendance
- Record grades

### Student
- View timetable
- View grades
- View absences

### Parent
- View linked child
- View child timetable
- View child grades
- View child attendance

## Project Structure

```text
src/
  components/
    common/
      EmptyState.tsx
      ErrorState.tsx
      LoadingState.tsx
    layout/
      DashboardLayout.tsx
  features/
    attendance/
      AttendancePage.tsx
    classes/
      ClassesPage.tsx
    grades/
      GradesPage.tsx
    portal/
      MyPortalPage.tsx
    schedules/
      SchedulesPage.tsx
    subjects/
      SubjectsPage.tsx
    users/
      UsersPage.tsx
  lib/
    api.ts
  Dashboard.tsx