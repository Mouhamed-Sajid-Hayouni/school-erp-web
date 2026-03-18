
---

## `docs/DEPLOYMENT.md`

```md
# Deployment Guide

## Overview

The project is deployed across multiple services:

- Database: Neon
- Backend API: Render
- Web frontend: Vercel
- Mobile preview builds: Expo EAS

---

## Backend Deployment

### Service
Render

### Required environment variables

```env
DATABASE_URL="postgresql://neondb_owner:npg_4Uyb6jqaunRS@ep-orange-shape-alrgercn.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
JWT_SECRET="super_secret_school_key_123"
PORT=5000