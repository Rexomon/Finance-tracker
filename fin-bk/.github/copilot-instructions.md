# Copilot instructions for fin-bk (backend)

Purpose: concise guidance for Copilot sessions working in the backend at `fin-bk/`.

Quick commands
- Install dependencies: cd fin-bk && bun install
- Dev (watch): cd fin-bk && bun run dev
- Build: cd fin-bk && bun run build
- Start (production): cd fin-bk && bun run start
- Lint/format: cd fin-bk && bun run check  # runs `biome check --fix`
- Docker build: docker build -t fin-backend -f fin-bk/Dockerfile .

Tests
- No test runner is configured (package.json `test` is a placeholder). If tests are added with Bun/other runner, run a single file as:
  - cd fin-bk && bun test path/to/test-file.test.ts

High-level architecture
- Runtime & tooling: Bun. Framework: Elysia. Server bootstrap: `src/index.ts`.
- Routes: `src/routes.ts` exports `apiRoutesV1` (prefix `/v1`) and mounts module routers.
- Modules: `src/Modules/{User,Budget,Category,Transaction}` — each module exposes an Elysia router and contains service, DB and types files.
- Auth: JWT-based access & refresh macros (`src/Middleware/Jwt.ts`). Cookies `AccessToken`/`RefreshToken` + single-session refresh token stored in Redis under `RefreshToken:{userId}`.
- Redis: configured in `src/Config/Redis.ts`; includes safe shutdown helper `safelyCloseRedis()` used on process termination.
- DB: drizzle-orm + @neondatabase/serverless (drizzle-kit in dev deps) — migrations handled via Drizzle tooling.
- Build: `bun build` is used to produce a production binary; Dockerfile uses oven/bun and distroless runtime.
- Error handling: centralized via `Utils/ErrorHandling` and Elysia's `onError`.
- Graceful shutdown: `safelyCloseRedis()` + `app.stop()` invoked on SIGINT/SIGTERM/SIGQUIT in `src/index.ts`.

Key conventions & patterns
- Module router files are suffixed `-index.ts` and are mounted from `src/routes.ts`.
- Protect routes using the `Auth` macro and mark handlers with `{ auth: true }` where required.
- Use Redis locks (Utilities) around critical sections (e.g., registration, token refresh).
- Compare refresh tokens using timing-safe comparisons (see User module).
- Environment variables expected: REDIS_URL, JWT_ACCESS_TOKEN_SECRET, JWT_REFRESH_TOKEN_SECRET, COOKIE_SECRET, DOMAIN_ORIGIN (production), PORT.
- TypeScript: `strict` is enabled; `noEmit: true` in tsconfig (build via Bun).
- Formatting/linting: Biome is used (`biome check --fix`), run via `bun run check`.

Important files to consult
- fin-bk/src/index.ts
- fin-bk/src/routes.ts
- fin-bk/src/Modules
- fin-bk/src/Config/Redis.ts
- fin-bk/Dockerfile
- fin-bk/package.json
