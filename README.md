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
- Admin consults users in read-only mode
- Admin approves or rejects pending parent/teacher account requests
- Direct user create/edit/delete/password/profile-image actions stay blocked
- Forgot-password requests generate a secure self-service reset link from the login page
- Password-reset requests show a generic message and direct users to contact school administration
- Admin creates and deletes classes
- Admin creates and deletes subjects
- Admin creates, edits, and deletes schedules
- Teachers record attendance for their assigned schedules
- Teachers record grades within their assigned teaching scope

### Student Records
- Students are school records only
- No direct student login
- Follow-up is done through linked parent accounts

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
