FinTrack

Personal finance web application per `docs/fintrack_sdd.md`.

Stack
- Backend: Node.js (>=22), Express, Prisma, PostgreSQL
- Frontend: Vite + React + TypeScript, Tailwind CSS, ECharts

Prerequisites
- Node.js 22+
- PostgreSQL 14+

Setup (Windows PowerShell)

```powershell
# 1) Backend deps
cd .\server
npm install
Copy-Item .env.example .env -Force

# 2) Create database (adjust credentials if needed)
# In psql: CREATE DATABASE fintrack;

# 3) Generate Prisma client and create migrations
npx prisma migrate dev --name init

# 4) Run API
npm run dev

# 5) Frontend deps & run
cd ..\client
npm install
npm run dev
```

- API: `http://localhost:4000`
- Web: `http://localhost:5173` (dev proxy to `/api`)

Environment
- Server `.env`:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `PORT`
  - Optional: `ALLOW_DEMO_SEED=true` (only if you want demo seed data)

Documentation
See `docs/fintrack_sdd.md` for features, endpoints, and UI requirements.

Data policy
- This repo excludes user data. No CSVs or database dumps are committed.
- The seed script is disabled by default and only runs when `ALLOW_DEMO_SEED=true` is set.


