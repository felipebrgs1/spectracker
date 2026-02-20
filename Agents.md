# SpecTracker - Project Instructions

## Overview

SpecTracker is a PCPartPicker-style web app for building PC configurations with a component database and real-time compatibility checking. It is a **monorepo** managed by Turborepo + pnpm workspaces.

## Tech Stack

| Layer         | Technology                                              |
| ------------- | ------------------------------------------------------- |
| Framework     | **Nuxt 4** (SSR, file-based routing, server routes)     |
| UI Components | **shadcn-vue** (new-york style, installed via CLI)      |
| Styling       | **Tailwind CSS v4** (via `@tailwindcss/vite` plugin)    |
| Icons         | **lucide-vue-next**                                     |
| Dark Mode     | **@nuxtjs/color-mode** (class-based, `classSuffix: ""`) |
| API Pattern   | **Nuxt Server Routes** (API is hidden, never exposed)   |
| ORM           | **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`)         |
| Database      | **Cloudflare D1** (SQLite) via `drizzle-orm/d1`         |
| Validation    | **Zod v4**                                              |
| Server (ext)  | **Elysia** + **oRPC** (standalone API, optional/public) |
| Monorepo      | **Turborepo** + **pnpm workspaces**                     |
| Runtime       | **Bun** (server app) / **Node** (Nuxt)                  |
| Linting       | **oxlint** + **oxfmt** (not ESLint/Prettier)            |
| Git Hooks     | None                                                    |

## Architecture

```
spectracker/
├── apps/
│   ├── web/              # Nuxt 4 frontend (main app)
│   │   ├── app/
│   │   │   ├── assets/css/main.css  # Tailwind + shadcn theme
│   │   │   ├── components/
│   │   │   │   └── ui/              # shadcn-vue components (DO NOT edit manually)
│   │   │   ├── composables/         # Vue composables
│   │   │   ├── layouts/
│   │   │   │   └── default.vue      # Main layout (header, nav, content)
│   │   │   ├── lib/
│   │   │   │   └── utils.ts         # cn() helper for class merging
│   │   │   └── pages/               # File-based routing (folder structure)
│   │   │       ├── index.vue        # /
│   │   │       ├── build/
│   │   │       │   └── index.vue    # /build
│   │   │       └── components/
│   │   │           └── index.vue    # /components
│   │   ├── server/                  # Nuxt server routes (HIDDEN API)
│   │   │   └── api/                 # /api/* routes
│   │   ├── components.json          # shadcn-vue config
│   │   └── nuxt.config.ts
│   ├── server/            # Elysia standalone API (public/external)
│   └── fumadocs/          # Documentation site
├── packages/
│   ├── api/               # oRPC routers + procedures (shared logic)
│   ├── db/                # Drizzle ORM schemas + migrations
│   ├── env/               # Env validation (Zod)
│   └── config/            # Shared TS config (tsconfig.base.json)
```

## Critical Rules

### 1. API Consumption & Separation of Concerns

The frontend (`apps/web`) MUST consume the backend API (`apps/server`) for all data operations. The Nuxt application **never** connects to the database directly and **must not** use Drizzle ORM.

```
Browser/Nuxt → Nuxt Server Route → apps/server (Elysia API) → @spectracker/db → Cloudflare D1
```

- Pages and components use `$fetch('/api/...')` or `useFetch('/api/...')` to hit Nuxt Server Routes.
- Nuxt Server Routes (`apps/web/server/api/`) then **proxy** or fetch these requests to the `apps/server` (Elysia API).
- Nuxt Server Routes act as a BFF (Backend for Frontend) ONLY. They hide the real Elysia API URL from the browser.
- **Never** import `@spectracker/db`, `drizzle-orm`, or use any database utilities inside `apps/web`.
- The `apps/server` is the central API and the ONLY application that possesses database bindings and interacts with the database.

Example Nuxt server route (Proxy):

```ts
// apps/web/server/api/components/index.get.ts
export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig(event);
	return $fetch(`${config.apiUrl}/catalog/components`);
});
```

### 2. shadcn-vue Components

- Components live in `apps/web/app/components/ui/`.
- **Always use the CLI** to add new components: `npx shadcn-vue@latest add <component>` (run from `apps/web/`).
- **Never** write shadcn components manually.
- shadcn config is in `apps/web/components.json` (style: new-york, base color: zinc).
- Import path alias: `@/components/ui/<component>` or `~/components/ui/<component>`.
- The `cn()` utility is at `@/lib/utils`.
- **Pure Usage**: Use shadcn components in their pure form. Change their format/layout with custom classes only in specific cases. Prefer using built-in **variants** (e.g., `variant="outline"`) over ad-hoc utility classes.

### 3. Page Structure

Pages use **folder-based routing**. Each route is a folder with `index.vue`:

```
pages/
├── index.vue              # /
├── build/
│   ├── index.vue          # /build
│   └── [id].vue           # /build/:id
└── components/
    ├── index.vue           # /components
    └── [category]/
        ├── index.vue       # /components/:category
        └── [id].vue        # /components/:category/:id
```

Do NOT create flat page files like `pages/build.vue`. Always use the folder pattern.

### 4. Styling

- Use **Tailwind CSS v4** utility classes. The theme is defined in `app/assets/css/main.css` using CSS variables.
- Primary color is **emerald** (oklch-based).
- Dark mode uses the `.dark` class (handled by `@nuxtjs/color-mode`).
- For color mode dependent rendering, wrap in `<ClientOnly>` to avoid SSR hydration mismatches.
- Font: **Inter** (loaded via Google Fonts in `app.vue`).
- Monospace: **JetBrains Mono** (for prices, specs, code).

### 5. Database (Drizzle + Cloudflare D1)

- Schemas live in `packages/db/src/schema/`.
- Use `text()` for IDs (nanoid/cuid2, not UUID).
- Prices stored as **integer** (centavos), formatted on the frontend.
- Drizzle config reads env from `apps/server/.env`.
- Run migrations: `pnpm run db:push` (from root).

### 6. Env Variables

- **Server env** (`packages/env/src/server.ts`): validated with Zod via `@t3-oss/env-core`. Used by `apps/server` and `packages/db`.
- **Web env**: Nuxt uses Cloudflare D1 bindings configured in `wrangler.toml` (`DB`). No public env vars needed.
- Env files: `apps/server/.env` (Elysia), `apps/web/.env` (Nuxt).

### 7. Contracts, Types, and Validation

- All shared request/response and DTO typing must be centralized in `packages/contracts`.
- `packages/contracts` is the single source of truth for runtime validation via **Zod** and inferred TypeScript types.
- Do not create local `type` or `interface` declarations for API payloads inside `apps/*` or `packages/*` feature files.
- Consumers (web pages, server routes, API modules) must import types from `@spectracker/contracts` and use `z.infer`-based exported types.
- Server route responses should be validated with the corresponding schema from `@spectracker/contracts` before returning.

### 8. Code Style

- **Tabs** for indentation (not spaces).
- **Semicolons** required.
- **Double quotes** for strings.
- Formatting enforced by **oxfmt**, linting by **oxlint**.
- Run `pnpm run check` to lint + format.
- Vue components use `<script setup lang="ts">`.
- Import sorting: types first (`import type { ... }`), then packages, then local.

## Common Commands

```bash
pnpm run dev          # Start all apps (turbo)
pnpm run dev:web      # Start only the Nuxt web app
pnpm run dev:server   # Start only the Elysia server
pnpm run build        # Build all
pnpm run check        # oxlint + oxfmt
pnpm run db:push      # Push schema to DB
pnpm run db:studio    # Open Drizzle Studio
pnpm run db:generate  # Generate migrations
pnpm run db:migrate   # Run migrations
pnpm run db:local     # Start local SQLite
```

## Adding shadcn-vue Components

```bash
cd apps/web
npx shadcn-vue@latest add button card dialog table
```

## Ports

| App        | Port |
| ---------- | ---- |
| Nuxt (web) | 5173 |
| Elysia     | 3000 |

## Domain Context

This app is a **PC component builder** (like PCPartPicker). Key domain concepts:

- **Categories**: CPU, GPU, Motherboard, RAM, Storage, PSU, Case, Cooler.
- **Components**: Individual hardware items with specs (key-value pairs).
- **Builds**: User-created PC configurations with selected components.
- **Compatibility Rules**: Data-driven rules in the database that define which components work together (socket matching, DDR generation, TDP limits, form factor fitting, slot availability).
- **Compatibility Engine**: A pure function in `packages/api/` that evaluates rules against selected components and returns conflicts/warnings.
