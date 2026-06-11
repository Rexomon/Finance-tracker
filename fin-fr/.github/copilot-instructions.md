# Copilot instructions for fin-fr (frontend)

Purpose: concise guidance for Copilot sessions working on the frontend at `fin-fr/`.

Quick commands
- Install deps: cd fin-fr && bun install
- Dev server: cd fin-fr && bun run dev
- Build: cd fin-fr && bun run build
- Preview production build: cd fin-fr && bun run preview
- Type-check: cd fin-fr && bun run type-check

Notes on tests
- No test runner is configured in package.json. If tests are added, run the configured runner (e.g., vitest) and document the command here. To run a single test file once a runner is added, use the runner's file-targeting (e.g., `bun test path/to/file`).

High-level architecture
- Framework: Vue 3 + Vite
- UI libs: PrimeVue + Tailwind (Tailwind integration via `@tailwindcss/vite` plugin)
- TypeScript: `vue-tsc` used for type checking (script `type-check`).
- Build: Vite (dev server + build). `build` script runs type-check then `vite build`.
- Formatting/linting: `@biomejs/biome` appears as a dev dependency; run via `npx biome check --fix` or add a script for `biome` if desired.

Conventions & patterns
- Project uses Vite conventions: `index.html` + `src/` entry.
- Type-checking is enforced in CI via `vue-tsc` (present as `type-check` script).
- Keep UI components under `src/components` and domain pages under `src/views` (standard Vite/Vue layout; confirm exact paths in the repo).

Files to check first
- fin-fr/package.json
- fin-fr/vite.config.*
- fin-fr/src/ (entrypoints, router, main.ts)
