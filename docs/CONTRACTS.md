# Contracts

Shared types and API shapes. **Frozen by default.** Changes require a separate PR labeled `contract-change` and an in-person heads-up to the teammate.

Source of truth for code: `src/types/` (mirrors this file).

## Response envelope (all API routes)
```ts
type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };
```

## Endpoints
<!-- Filled in after SPEC.md. Format per endpoint:
### POST /api/<name>
Request: `{ ... }`
Response data: `{ ... }`
Mock: `src/data/mocks/<name>.json`
-->
