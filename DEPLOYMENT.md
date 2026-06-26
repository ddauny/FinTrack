# FinTrack Deployment Architecture

This document describes the dual-environment setup for FinTrack, allowing for safe development and stable production deployment sharing the same database.

## 1. Environments Overview

| Environment | Frontend Port | Backend Port | Goal |
| :--- | :--- | :--- | :--- |
| **Production** | **5173** | **4000** | Stable version for daily use. Optimized for speed (Nginx). |
| **Development** | **5174** | **4001** | Hot-reload enabled for testing new features. |

## 2. Infrastructure (Docker)

The project uses a single `docker-compose.yml` to orchestrate 5 containers:

1.  **db**: Shared PostgreSQL 15 database instance.
2.  **app-prod**: Production backend (Node.js/TypeScript compiled to JS).
3.  **client-prod**: Production frontend (React/Vite served via Nginx).
4.  **app-dev**: Development backend (Runs `tsx watch` for instant updates).
5.  **client-dev**: Development frontend (Vite dev server).

## 3. Data Persistence & Safety

- **Shared Database:** Both environments point to the same PostgreSQL volume (`fintrack_fintrack-dev-data`). 
- **Volume Safety:** The volume is marked as `external` in the docker-compose file to prevent accidental deletion during `docker-compose down`.
- **Environment Isolation:** Even though they share the DB, the applications run in separate containers with isolated environment variables (`.env.production` vs `.env.development`).

## 4. Workflows

### Standard Development Cycle
1. Work on the `develop` Git branch.
2. Test your changes at `http://localhost:5174`.
3. When ready, merge `develop` into the `main` branch.

### Deployment Updates
To apply changes to production:
```bash
git checkout main
git merge develop
docker-compose up -d --build app-prod client-prod
```

## 5. Security Measures
- **Production Client:** Uses a hardened Nginx configuration.
- **Backend Protection:** Production backend uses compiled code and does not include development dependencies.
- **Git Safety:** Sensitive `.env.*` files are included in `.gitignore` to prevent leaking credentials.

## 6. Port Troubleshooting
If a port is already in use, you can modify the `ports` section in `docker-compose.yml`. Production is currently mapped to `5173` to maintain compatibility with Cloudflare tunnels.
