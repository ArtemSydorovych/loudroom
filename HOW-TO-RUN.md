# How to run Loudroom

## Prerequisites

- [Node.js 22](https://nodejs.org/) (LTS)
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Quick start

```bash
# 1. Clone and install
git clone <repo-url> && cd loudroom
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and set BETTER_AUTH_SECRET to a random string (min 32 characters)

# 3. Start the database
npm run docker:up

# 4. Push the Prisma schema to the database
npm run db:push

# 5. Start development servers
npm run dev
```

Backend runs on `http://localhost:3001`, frontend on `http://localhost:5173`.

## Project structure

```
loudroom/
├── apps/
│   ├── backend/              # Fastify + Socket.io API server
│   │   ├── prisma/           # Prisma schema
│   │   └── src/
│   │       ├── plugins/      # Fastify plugins (auth, cors, prisma)
│   │       ├── routes/       # REST endpoints (sessions, polls)
│   │       └── socket/       # Socket.io event handlers
│   └── frontend/             # React SPA (Vite)
│       └── src/
│           ├── api/          # Axios client
│           ├── audience/     # Audience views (join, poll, quiz, leaderboard)
│           ├── components/   # Shared components
│           ├── hooks/        # Custom hooks (auth, socket)
│           ├── presenter/    # Presenter views (dashboard, session setup, live)
│           ├── socket/       # Socket.io client
│           └── store/        # Zustand stores
├── packages/
│   └── types/                # Shared TypeScript interfaces
├── docs/
│   └── adr/                  # Architecture Decision Records
├── docker-compose.yml        # PostgreSQL 16
├── tsconfig.base.json        # Shared TypeScript config
├── biome.json                # Linting and formatting
└── package.json              # All dependencies and scripts
```

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://loudroom:loudroom@localhost:5432/loudroom` |
| `PORT` | Backend server port | `3001` |
| `NODE_ENV` | Runtime mode (`development`, `test`, `production`) | `development` |
| `LOG_LEVEL` | Pino log level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`) | `info` |
| `BETTER_AUTH_SECRET` | Auth signing secret (min 32 chars) | — |
| `BETTER_AUTH_URL` | Backend URL for auth callbacks | `http://localhost:3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

Generate a secret with `openssl rand -base64 32` (or any 32+ char random string).

## Verify the backend is up

Once `npm run dev` is running:

```bash
curl http://localhost:3001/health         # liveness
curl http://localhost:3001/health/ready   # checks DB connectivity
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start backend and frontend in parallel |
| `npm run dev:backend` | Start backend only (tsx watch) |
| `npm run dev:frontend` | Start frontend only (Vite) |
| `npm run build` | Build backend and frontend |
| `npm run build:backend` | Build backend only |
| `npm run build:frontend` | Build frontend only |
| `npm run typecheck` | TypeScript checks for both apps |
| `npm run lint` | Lint with Biome |
| `npm run format` | Format with Biome |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run docker:up` | Start PostgreSQL container |
| `npm run docker:down` | Stop PostgreSQL container |
