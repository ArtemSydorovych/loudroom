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

## Auth endpoints (presenter)

All auth routes are exposed under `/api/auth/*` by better-auth. The presenter flow uses email + password.

```bash
# Sign up
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"you@example.com","password":"yourpassword","name":"You"}'

# Sign in
curl -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -c cookies.txt -b cookies.txt \
  -d '{"email":"you@example.com","password":"yourpassword"}'

# Current session
curl http://localhost:3001/api/me -b cookies.txt

# Sign out
curl -X POST http://localhost:3001/api/auth/sign-out -b cookies.txt
```

Protect a route in your own handler by calling `app.requireAuth(req, reply)` — it returns `{ user, session }` or sends `401`.

## REST endpoints

All routes live under `/api`.

**Sessions** (presenter, requires auth)
- `GET    /api/sessions` — list the caller's sessions
- `POST   /api/sessions` — create one (`{ title }`); a unique 6-char join code is generated
- `GET    /api/sessions/:id` — fetch own session
- `PATCH  /api/sessions/:id/status` — transition (`WAITING` → `ACTIVE` → `ENDED`)

**Sessions** (public, no auth)
- `GET    /api/sessions/by-code/:code` — audience lookup; case-insensitive
- `POST   /api/sessions/:id/participants` — register an anonymous `Participant` (`{ nickname }`); rejects if session is `ENDED`

**Polls** (presenter, requires auth)
- `GET    /api/sessions/:sessionId/polls` — list polls in a session
- `POST   /api/sessions/:sessionId/polls` — create a poll with options in a single transaction
- `DELETE /api/polls/:id` — delete a poll the caller owns

## Socket.io events

The realtime hub is attached to the same HTTP port as the REST API at `path: /socket.io`. CORS matches `FRONTEND_URL` with credentials enabled. Each session has its own room (`session:<id>`).

Client → server: `joinSession`, `vote`, `submitQuestion`, `startPoll`, `endPoll`, `approveQuestion`.
Server → client: `sessionJoined`, `participantCountUpdate`, `pollStarted`, `voteUpdate`, `pollEnded`, `questionReceived`, `error`.

A typical audience flow:

1. Client calls `POST /api/sessions/by-code/:code` then `POST /api/sessions/:id/participants` to obtain a `participantId`.
2. Client connects to Socket.io and emits `joinSession` with `{ sessionId, participantId, nickname }`.
3. Server replies with `sessionJoined` and broadcasts `participantCountUpdate` to the room.
4. Client emits `vote` / `submitQuestion`; server broadcasts `voteUpdate` / `questionReceived` to everyone in the same room.

The full event contract lives in `packages/types/src/socket.ts`.

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
| `npm run test` | Run vitest (unit + integration) once |
| `npm run test:watch` | Run vitest in watch mode |
| `npm run lint` | Lint with Biome |
| `npm run format` | Format with Biome |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run docker:up` | Start PostgreSQL container |
| `npm run docker:down` | Stop PostgreSQL container |
