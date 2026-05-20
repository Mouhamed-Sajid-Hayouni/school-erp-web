
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
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
JWT_SECRET="CHANGE_ME_TO_A_LONG_RANDOM_SECRET"
PORT=5000