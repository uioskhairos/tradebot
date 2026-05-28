<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# General Policies (Firebase + Next.js)

Use these as project-agnostic rules for any Firebase + Next.js codebase.

## Architecture & Boundaries

- Use Next.js App Router patterns and keep route handlers thin: validate input, call a service, return response.
- Keep Firebase SDK access in dedicated server/client service modules (for example under `lib/` or `services/`), not inside UI components.
- Separate concerns clearly: UI rendering in components, business logic in services, data access in Firebase modules.

## Clean Coding Practices

- Keep functions small and focused; one responsibility per function/module.
- Prefer clear naming over cleverness; names should reveal domain intent.
- Avoid duplication (DRY): centralize shared validation, mapping, and path helpers.
- Use early returns/guard clauses to reduce nested logic.
- Keep one abstraction level per function (do not mix HTTP/UI, domain rules, and persistence logic).
- Enforce strict TypeScript and explicit types at boundaries; avoid `any` except tightly validated external input.
- Refactor when complexity grows (split large services/components into focused modules).

## Security & Access Control

- Never expose server secrets to the client. Only `NEXT_PUBLIC_*` values are allowed in browser code.
- Use Firebase Admin SDK only in trusted server environments; never expose admin credentials to clients.
- Enforce least-privilege Firebase Security Rules and ownership-based access for user-scoped data.
- Do not trust client-supplied roles, UIDs, or authorization-sensitive fields; enforce authorization server-side and in rules.

## Secure Database Rules (Firestore/RTDB)

- Default-deny rules: deny all reads/writes unless explicitly allowed.
- Enforce ownership checks (`request.auth.uid == resource owner`) for user-scoped data.
- Separate admin-only paths/actions and gate them by trusted role claims/server verification.
- Validate required fields, allowed field sets, and basic type constraints in rules where supported.
- Prevent client mutation of sensitive fields (`role`, `uid`, `createdAt`, billing/status flags).
- Version and review rules alongside schema changes; update tests/simulators before deploy.
- Keep collection/path conventions centralized and documented to avoid inconsistent rule coverage.

## Data & Firestore/RTDB Practices

- Centralize collection/document path construction to avoid scattered hardcoded paths.
- Use transactions for multi-step atomic updates that must remain consistent.
- Prefer typed data models and strict TypeScript; avoid `any` except at narrow boundaries with explicit validation.
- For realtime listeners/subscriptions, always clean up/unsubscribe on teardown.

## Scalability & Performance

- Design data access for query efficiency: index-backed queries, bounded reads, and pagination.
- Avoid N+1 data-fetching patterns; batch reads/writes when possible.
- Cache safely at appropriate layers (Next.js cache, application cache, CDN) with clear invalidation strategy.
- Keep payloads minimal: select only required fields and avoid over-fetching.
- Isolate hot paths and optimize them first using measurements, not assumptions.

## Maintainability & Operability

- Keep folder/module structure consistent and domain-oriented.
- Write tests for critical flows (auth, authorization, data integrity, and business invariants).
- Do not suppress lint/type warnings; fix root causes.
- Add structured logging and actionable error messages at service/route boundaries.
- Propagate cancellation/timeouts for I/O work and fail fast on unrecoverable states.
- Prefer actively maintained dependencies and patch security issues promptly.

## Quality & Operations

- Keep environment-specific values in env files and never commit secrets.
- Fix lint/type issues at the root cause instead of suppressing warnings.
- Avoid adding vulnerable or unmaintained dependencies; prefer actively maintained packages.
- Document security assumptions and rule changes whenever new collections, paths, or access patterns are introduced.
- Document architecture decisions, data model changes, and breaking behavior updates with each feature.
