# Architecture Decision Records

Architecture Decision Records (ADRs) capture significant architectural decisions made during the project along with their context and consequences. They serve as a log of what was decided, why, and what alternatives were considered.

## Why ADRs?

- New team members can understand past decisions without asking around
- Revisiting a decision starts from the original rationale, not guesswork
- They prevent relitigating settled decisions without new information

## Naming convention

Files follow the pattern `ADR-NNN-kebab-case-title.md` where NNN is a zero-padded sequential number.

## Template structure

Each ADR contains:

- **Status** — Accepted, Draft, or Superseded
- **Date** — when the decision was made (YYYY-MM-DD)
- **Contributors** — who participated in the decision
- **Problem statement** — what problem needed solving
- **Research insights** — relevant findings that informed the decision
- **Design options** — each alternative considered, with benefits and risks
- **Decision** — what was chosen
- **Rationale** — why this option won
- **Follow up** — action items resulting from the decision

## Index

- [ADR-001: Monorepo structure](ADR-001-monorepo-structure.md)
- [ADR-002: Authentication strategy](ADR-002-authentication-strategy.md)
