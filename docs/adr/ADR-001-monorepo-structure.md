# ADR-001: Monorepo structure

**Status:** Accepted
**Date:** 2026-04-07
**Contributors:** Loudroom team

## Problem statement

Loudroom is a full-stack TypeScript project built by a four-person team over a 12-week timeline. The frontend and backend share a significant number of types — Socket.io event maps, session models, poll structures — and keeping these in sync is critical for developer velocity and runtime correctness. The team needs a repository strategy that makes type sharing frictionless, keeps the developer experience simple, and does not introduce tooling overhead disproportionate to the project's size.

## Research insights

- For small teams (fewer than six developers), workspace tooling adds configuration overhead without measurable productivity gains when build times are already short.
- Relative imports to a shared types folder provide the same type-safety guarantees as workspace-resolved packages, with zero configuration.
- Separate repositories require either publishing shared packages to a registry or using `npm link`, which introduces version drift and CI complexity.

## Design options

### Option A — Separate repositories

Maintain independent repos for backend, frontend, and shared types.

**Benefits:**
- Clear ownership boundaries per repo
- Independent CI pipelines
- Familiar model for teams coming from microservices backgrounds

**Risks:**
- Sharing types requires publishing to a private registry or using git submodules
- Version drift between repos leads to runtime type mismatches
- PRs that span frontend and backend require coordinating merges across repos
- Increases onboarding friction for new team members

### Option B — npm/pnpm workspaces

Use npm or pnpm workspaces to manage local packages within a single repository.

**Benefits:**
- Workspaces resolve local packages automatically — no linking or publishing
- `npm run --workspaces` covers task orchestration
- Each folder is an independent package with its own `package.json`

**Risks:**
- Adds workspace configuration complexity (workspace protocol, hoisting rules, per-package `package.json` files)
- For a small project, the indirection of workspace-resolved packages is unnecessary overhead
- Workspace bugs and edge cases (phantom dependencies, hoisting conflicts) can be time-consuming to debug
- Overkill for a three-folder project with a four-person team

### Option C — Turborepo with pnpm workspaces

Use Turborepo on top of pnpm workspaces for task orchestration and caching.

**Benefits:**
- Remote caching speeds up CI for large projects
- Declarative task pipeline with dependency graph
- Industry momentum and strong documentation

**Risks:**
- Adds a configuration layer (`turbo.json`, pipeline definitions) the team must learn
- Caching benefits are marginal when total build time is under 30 seconds
- Overhead is not justified for a three-package workspace
- One more tool to debug when something goes wrong

### Option D — Single repository with shared types via relative imports

Keep all code in one repository with a single root `package.json`. Backend, frontend, and shared types live in their own directories (`apps/backend`, `apps/frontend`, `packages/types`) but are not separate npm packages. Types are imported via relative paths (e.g., `../../../../packages/types/src/socket.js`). Each sub-directory has its own `tsconfig.json` that extends the root `tsconfig.base.json`.

**Benefits:**
- Simplest possible setup — one `npm install`, one dependency list, zero workspace configuration
- No workspace protocol to learn or debug
- Relative imports are explicit and IDE-navigable
- Adding new shared types is just adding a file — no package registration needed
- Trivial onboarding: clone, install, run
- Easy to add workspaces later if the project outgrows this structure

**Risks:**
- A single `package.json` mixes frontend and backend dependencies (acceptable for a small project; both deploy independently via their own build scripts)
- No dependency isolation — backend code could accidentally import React (mitigated by code review and linting)
- Relative import paths are longer than package aliases (minor ergonomic cost)

## Decision

Option D — single repository with a shared types package referenced via relative imports, no workspaces.

## Rationale

The primary constraint is team velocity within a 12-week window. For a four-person team with a three-folder project, workspaces add configuration overhead — multiple `package.json` files, workspace resolution rules, hoisting behavior — without a measurable productivity gain. Relative imports to `packages/types/src` provide the same type-safety guarantees with zero configuration. The shared types folder is consumed by both apps through TypeScript's `include` in each `tsconfig.json`, and imports resolve to `.ts` source files directly.

A single root `package.json` means one `npm install`, one lockfile, and one place to manage versions. The tradeoff of mixing frontend and backend dependencies is acceptable at this scale: both dependency trees are modest, and the risk of accidental cross-imports is mitigated by code review and Biome linting rules.

Turborepo (Option C) and npm workspaces (Option B) are valid choices and would be the natural next step if the project grew beyond five or six packages or if CI times became a bottleneck. For now, they add indirection without a measurable payoff. Separate repositories (Option A) were ruled out because they make the type-sharing workflow significantly more painful.

## Follow up

- [ ] Document the project structure in the root README
- [ ] Verify `npm install` resolves all dependencies correctly
- [ ] Revisit this decision if a fourth package is added or CI build times exceed two minutes
