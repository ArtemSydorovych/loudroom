# ADR-002: Authentication strategy

**Status:** Accepted
**Date:** 2026-04-07
**Contributors:** Loudroom team

## Problem statement

Loudroom has two distinct user types with different auth requirements. Presenters need full accounts — registration, login, session protection, and the ability to manage their sessions and polls. Audience members are always anonymous; they join a session with a code and a nickname, with no account creation. The team has four members with .NET backgrounds where ASP.NET Identity provides built-in auth. Node.js has no equivalent, so the team needs to choose an auth strategy that is secure, integrates with the existing Prisma and PostgreSQL stack, and does not consume a disproportionate share of the 12-week timeline.

## Research insights

- better-auth provides a TypeScript-first auth library with a Prisma adapter, typed React hooks (`useSession`, `signIn`, `signUp`), and built-in session management. It runs inside the Node.js process with no external services.
- Keycloak is a mature OIDC/OAuth 2.0 identity provider but requires a dedicated Docker container, realm configuration, and client setup — infrastructure the team has no prior experience with.
- Manual JWT auth (bcrypt + jsonwebtoken) provides full control but requires implementing registration, login, token issuance, refresh rotation, and session lifecycle from scratch — estimated at two to three weeks of backend work.
- Audience members do not need auth at all. Their identity is a session-scoped participantId and nickname stored in the Participant table, with no passwords or tokens involved.

## Design options

### Option A — Keycloak

Run Keycloak as a Docker service alongside PostgreSQL, configure a realm and client for Loudroom, and use OIDC tokens for presenter authentication.

**Benefits:**
- Industry-standard OIDC and OAuth 2.0 compliance
- Admin UI for user management that would look polished in a demo
- Handles all identity concerns externally — the backend only validates tokens
- Battle-tested in enterprise environments

**Risks:**
- Requires an additional Docker container that every team member must run and configure
- Realm and client setup is non-trivial and unfamiliar to the entire team
- Adds significant operational overhead that is not justified for a single-application student project
- Debugging auth issues requires understanding Keycloak's admin console and logs
- Setup and learning time would consume one to two weeks that should go toward product features

### Option B — Manual implementation (bcrypt + JWT)

Hash passwords with bcrypt, issue JWTs on login, implement refresh token rotation, and validate tokens in Fastify middleware.

**Benefits:**
- Full control over every aspect of the auth flow
- No external dependencies beyond bcrypt and jsonwebtoken
- The team can read and understand every line of the auth code

**Risks:**
- Implementing registration, login, JWT issuance, refresh token rotation, and session management correctly is estimated at two to three weeks of backend work
- Takes time directly away from the real-time engine and polling features, which are the actual value proposition of the project
- Security risk if token handling, storage, or rotation is implemented incorrectly
- Every edge case (expired tokens, concurrent sessions, password reset) must be handled manually
- The team has no prior experience implementing auth in Node.js

### Option C — better-auth

Use better-auth with the Prisma adapter, integrating directly into the Fastify server. Use its React client for frontend auth state.

**Benefits:**
- TypeScript-first with full type safety across client and server
- Prisma adapter integrates with the existing schema — the four required tables (user, session, account, verification) are added to the same database
- Typed React client provides `signIn`, `signUp`, and `useSession` hooks immediately
- Handles session lifecycle, token rotation, and CSRF protection automatically
- Runs inside the Node.js process — no additional Docker services, no external configuration
- Setup is estimated at two to four hours including schema changes and frontend integration
- Easy to extend with plugins (two-factor, OAuth providers) if needed later

**Risks:**
- Younger library with a smaller community compared to Passport.js or NextAuth
- Abstraction means less visibility into auth internals — debugging requires reading better-auth source
- If the library is abandoned, migration to an alternative would require rewriting auth integration

## Decision

Option C — better-auth.

## Rationale

The decision comes down to time allocation. The team has 12 weeks and four members, all coming from .NET backgrounds with no prior Node.js auth experience. The features that make Loudroom interesting — real-time Socket.io communication, live polling, leaderboards, QR code joining — are where development time should be concentrated.

Keycloak (Option A) would deliver a robust auth system but at the cost of one to two weeks of infrastructure setup and learning, plus ongoing operational overhead from running an additional Docker service. For a single-application project with one user type that needs auth (presenters), this is overengineered.

Manual JWT auth (Option B) provides maximum control but the estimated two to three weeks of implementation time is the most expensive option. More importantly, the security risk of incorrect token handling is real, and the team does not have the Node.js auth experience to mitigate it confidently.

better-auth (Option C) provides production-quality auth with an estimated setup time of two to four hours. The Prisma adapter means the auth tables live alongside the domain tables in the same database, the React client eliminates frontend auth boilerplate, and the library handles session lifecycle automatically. The risk of library abandonment is real but acceptable — the auth surface area is small enough that migrating to an alternative would be a contained effort.

The anonymous audience flow is entirely separate from better-auth and is handled by the Participant model with session-scoped IDs. This separation means the auth strategy only needs to serve presenters, further reducing the complexity requirements.

## Follow up

- [ ] Add better-auth user, session, account, and verification tables to the Prisma schema
- [ ] Configure better-auth server plugin in Fastify with the Prisma adapter
- [ ] Set up the better-auth React client with signIn, signUp, and useSession
- [ ] Document the BETTER_AUTH_SECRET environment variable requirement
- [ ] Test presenter registration and login end-to-end
- [ ] Verify that audience join flow works independently of better-auth
