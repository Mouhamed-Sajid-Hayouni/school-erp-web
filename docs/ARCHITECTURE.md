# Architecture Overview

## System Summary

The School ERP System is a multi-interface platform for managing a Tunisian public school across:

- a web administration dashboard
- a mobile student/parent portal
- a shared backend API
- a PostgreSQL relational database

## High-Level Architecture

```text
Web Frontend (Vercel) --------\
                               \
Mobile App (Expo / APK) -------> Express API (Render) -------> PostgreSQL (Neon)
                               /
Admin / Teacher users ---------/