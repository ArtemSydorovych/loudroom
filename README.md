# Loudroom

Loudroom is a real-time audience interaction platform. A presenter creates a live session, shares a join code or QR code, and audience members join anonymously from their phones or laptops. During the session the presenter can run polls, quizzes with scored leaderboards, and moderate live Q&A — all updating in real time.

## Who is it for

- **Presenters** — lecturers, speakers, teachers, or meeting hosts who want to engage their audience interactively. They sign up, create sessions, build polls and quizzes, and control the flow live.
- **Audience members** — anyone who joins with a code and a nickname. No account needed. They vote on polls, answer quizzes, submit questions, and see results live.

## What it does

- **Live sessions** — a presenter creates a session and gets a unique join code and QR code to share. The session moves through waiting, active, and ended states.
- **Polls** — multiple-choice questions pushed to all connected audience members in real time. Results update live as votes come in.
- **Quizzes** — timed questions with a correct answer. Participants are scored and ranked on a leaderboard.
- **Q&A** — audience members submit questions. The presenter approves and surfaces them. Questions can be upvoted.
- **Leaderboard** — tracks quiz scores per participant across the session.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, TypeScript, Zustand, TanStack React Query, Recharts, Framer Motion |
| Backend | Fastify 5, Socket.io 4, TypeScript |
| Auth | better-auth (presenters only, audience is anonymous) |
| Database | PostgreSQL 16, Prisma 5 |
| Tooling | Biome (linting + formatting), tsx (dev runner), concurrently |

## Architecture

The project is a single TypeScript repository with two apps and a shared types package.

```
loudroom/
├── apps/
│   ├── backend/              # Fastify REST API + Socket.io server
│   │   ├── prisma/           # Database schema
│   │   └── src/
│   │       ├── plugins/      # Fastify plugins (auth, cors, prisma)
│   │       ├── routes/       # REST endpoints (sessions, polls)
│   │       └── socket/       # Real-time event handlers
│   └── frontend/             # React SPA
│       └── src/
│           ├── api/          # HTTP client (Axios)
│           ├── audience/     # Audience views (join, poll, quiz, leaderboard)
│           ├── components/   # Shared components (auth guard, loading)
│           ├── hooks/        # Custom hooks (auth, socket)
│           ├── presenter/    # Presenter views (dashboard, session setup, live)
│           ├── socket/       # Socket.io client
│           └── store/        # Client state (Zustand)
├── packages/
│   └── types/                # Shared TypeScript interfaces and Socket.io event maps
├── docs/
│   └── adr/                  # Architecture Decision Records
├── docker-compose.yml        # PostgreSQL
├── tsconfig.base.json        # Shared TypeScript config
└── biome.json                # Linting and formatting config
```

### How it fits together

1. The **frontend** communicates with the backend over REST (via Axios through a Vite proxy) for CRUD operations and over WebSockets (via Socket.io) for real-time events.
2. The **backend** exposes REST routes for session and poll management, and a Socket.io server for live interactions (joining, voting, broadcasting results).
3. **Presenter auth** is handled by better-auth running inside the Fastify process — no external identity provider needed.
4. **Audience members** are anonymous. They join a session with a code and nickname, tracked as Participant records in the database.
5. The **types package** defines shared interfaces for sessions, polls, participants, and the full Socket.io event contract. Both apps import these via relative paths.

## Data model

- **User** / **Session** / **Account** / **Verification** — better-auth managed tables for presenter accounts
- **LoudroomSession** — a presenter's live session (title, join code, status)
- **Poll** — a question attached to a session (multiple choice or quiz)
- **PollOption** — answer choices for a poll
- **Vote** — an audience member's vote on a poll option
- **Participant** — an anonymous audience member in a session (nickname, score)
- **Question** — a Q&A submission from an audience member

## Getting started

See [HOW-TO-RUN.md](HOW-TO-RUN.md) for prerequisites, setup instructions, environment variables, and available scripts.

## Architecture decisions

Significant technical decisions are documented as ADRs in [`docs/adr/`](docs/adr/):

- [ADR-001: Repository structure](docs/adr/ADR-001-monorepo-structure.md)
- [ADR-002: Authentication strategy](docs/adr/ADR-002-authentication-strategy.md)
