# SpecTracker - Project Instructions

## Overview

SpecTracker is a PCPartPicker-style web app for building PC configurations with a component database and real-time compatibility checking. It is a **monorepo** managed by Turborepo + pnpm workspaces.

## Tech Stack

| Layer         | Technology                                           |
| ------------- | ---------------------------------------------------- |
| Framework     | **Vinext** (App Router, Server Components)           |
| UI Components | **shadcn/ui** (React version, installed via CLI)     |
| Styling       | **Tailwind CSS v4** (via `@tailwindcss/vite` plugin) |
| Icons         | **lucide-react**                                     |
| Dark Mode     | **next-themes** (class-based)                        |
| API Pattern   | **Next.js Route Handlers** (BFF pattern)             |
| ORM           | **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`)      |
| Database      | **Cloudflare D1** (SQLite) via `drizzle-orm/d1`      |
| Validation    | **Zod v4**                                           |
| Server (ext)  | **Elysia** + **oRPC** (standalone API)               |
| Monorepo      | **Turborepo** + **pnpm workspaces**                  |
| Runtime       | **Bun** (server app) / **Node** (Next.js)            |
| Linting       | **oxlint** + **oxfmt**                               |

## Architecture

```
spectracker/
├── apps/
│   ├── web/              # Next.js frontend (main app)
│   │   ├── app/          # App Router
│   │   │   ├── (routes)/ # Folders for routes
│   │   │   ├── api/      # Route Handlers (BFF)
│   │   │   ├── components/
│   │   │   │   └── ui/   # shadcn/ui components (React)
│   │   │   ├── globals.css # Tailwind + shadcn theme
│   │   │   ├── layout.tsx  # Root Layout
│   │   │   └── page.tsx    # Home Page
│   │   ├── lib/
│   │   │   └── utils.ts    # cn() helper
│   │   ├── components.json # shadcn config
│   │   └── next.config.ts
```

## Critical Rules

### 1. API Consumption & Separation of Concerns

The frontend (`apps/web`) MUST consume the backend API (`apps/server`) for all data operations.

```
Browser/Next.js → Next.js Route Handler (app/api/) → apps/server (Elysia API) → @spectracker/db
```

- Pages and components use `fetch('/api/...')` from client or direct fetch from Server Components.
- Next.js Route Handlers (`apps/web/app/api/`) proxy requests to the `apps/server` (Elysia API).
- **Never** import `@spectracker/db` inside `apps/web`. The database belongs to the Elysia server.

### 2. shadcn/ui Components

- Components live in `apps/web/app/components/ui/`.
- **Always use the CLI**: `npx shadcn@latest add <component>` (run from `apps/web/`).
- Import path alias: `@/components/ui/<component>`.

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

### 7. Code Style

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
