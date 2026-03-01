# SpecTracker - Project Instructions

## Overview

SpecTracker is a PCPartPicker-style web app for building PC configurations with a component database and real-time compatibility checking. It is a **monorepo** managed by Turborepo + pnpm workspaces.

## Tech Stack

| Layer         | Technology                                           |
| ------------- | ---------------------------------------------------- |
| Framework     | **Vinext** (React-based, RSC, Vite-powered)          |
| UI Components | **shadcn/ui** (React version, installed via CLI)     |
| Styling       | **Tailwind CSS v4** (via `@tailwindcss/vite` plugin) |
| Icons         | **lucide-react**                                     |
| Dark Mode     | **next-themes** (class-based)                        |
| API Pattern   | **API Masking** (Next-style Route Handlers as Proxy) |
| ORM           | **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`)      |
| Database      | **Cloudflare D1** (SQLite) via `drizzle-orm/d1`      |
| Validation    | **Zod v4**                                           |
| Server (ext)  | **Elysia** + **oRPC** (Standalone API on Workers)    |
| Monorepo      | **Turborepo** + **pnpm workspaces**                  |
| Runtime       | **Bun** (Monorepo/Scripts) / **Cloudflare Workers**  |
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

### 1. API Consumption & API Masking

The frontend (`apps/web`) MUST consume the backend API (`apps/server`) for ALL data operations. The frontend acts ONLY as a proxy (**API Masking**).

```
Browser/React → Vinext Route Handler (app/api/) → apps/server (Elysia API) → @spectracker/db
```

- **Logic Separation**: All business logic, database queries, and data transformations MUST reside in `apps/server`.
- **API Masking**: Route Handlers in `apps/web/app/api/` should be simple proxies that forward requests to the Elysia server and return the response.
- **No Direct DB**: Never import `@spectracker/db` or `drizzle-orm` inside `apps/web`. The database is exclusive to the Elysia server.
- **Environment**: Use `process.env.API_URL` to point to the backend server.

### 2. shadcn/ui Components

- Components live in `apps/web/app/components/ui/`.
- **Always use the CLI**: `npx shadcn@latest add <component>` (run from `apps/web/`).
- Import path alias: `@/components/ui/<component>`.

### 3. Page Structure

Pages use **folder-based routing**. Each route is a folder with `page.tsx`:

```
app/
├── (routes)/
│   ├── page.tsx              # /
│   ├── build/
│   │   ├── page.tsx          # /build
│   │   └── [id]/
│   │       └── page.tsx      # /build/:id
│   └── components/
│       ├── page.tsx          # /components
│       └── [category]/
│           ├── page.tsx      # /components/:category
│           └── [id]/
│               └── page.tsx  # /components/:category/:id
```

Do NOT create flat page files like `app/build.tsx`. Always use the folder pattern with `page.tsx`.

### 4. Styling

- Use **Tailwind CSS v4** utility classes. The theme is defined in `app/assets/css/main.css` using CSS variables.
- Primary color is **emerald** (oklch-based).
- Dark mode uses the `.dark` class (handled by `next-themes`).
- For color mode dependent rendering, wrap in `<ClientOnly>` (or use `mounted` state) to avoid SSR hydration mismatches.
- Font: **Inter** (loaded via Google Fonts in `layout.tsx`).
- Monospace: **JetBrains Mono** (for prices, specs, code).

### 5. Database (Drizzle + Cloudflare D1)

- Schemas live in `packages/db/src/schema/`.
- Use `text()` for IDs (nanoid/cuid2, not UUID).
- Prices stored as **integer** (centavos), formatted on the frontend.
- Drizzle config reads env from `apps/server/.env`.
- Run migrations: `pnpm run db:push` (from root).

### 6. Env Variables

- **Server env** (`packages/env/src/server.ts`): validated with Zod via `@t3-oss/env-core`. Used by `apps/server` and `packages/db`.
- **Web env**: Vinext uses environment variables or Cloudflare bindings. No public env vars needed.
- Env files: `apps/server/.env` (Elysia), `apps/web/.env` (Vinext).

### 7. Code Style

- **Tabs** for indentation (not spaces).
- **Semicolons** required.
- **Double quotes** for strings.
- Formatting enforced by **oxfmt**, linting by **oxlint**.
- Run `pnpm run check` to lint + format.
- React components use `.tsx` extension.
- Import sorting: types first (`import type { ... }`), then packages, then local.

## Common Commands

```bash
pnpm run dev          # Start all apps (turbo)
pnpm run dev:web      # Start only the Vinext web app
pnpm run dev:server   # Start only the Elysia server
pnpm run build        # Build all
pnpm run check        # oxlint + oxfmt
pnpm run db:push      # Push schema to DB
pnpm run db:studio    # Open Drizzle Studio
pnpm run db:generate  # Generate migrations
pnpm run db:migrate   # Run migrations
pnpm run db:local     # Start local SQLite
```

## Adding shadcn Components

```bash
cd apps/web
npx shadcn@latest add <component>
```

## Ports

| App    | Port |
| ------ | ---- |
| Vinext | 3000 |
| Elysia | 8787 |

## Domain Context

This app is a **PC component builder** (like PCPartPicker). Key domain concepts:

- **Categories**: CPU, GPU, Motherboard, RAM, Storage, PSU, Case, Cooler.
- **Components**: Individual hardware items with specs (key-value pairs).
- **Builds**: User-created PC configurations with selected components.
- **Compatibility Rules**: Data-driven rules in the database that define which components work together (socket matching, DDR generation, TDP limits, form factor fitting, slot availability).
- **Compatibility Engine**: A pure function in `packages/api/` that evaluates rules against selected components and returns conflicts/warnings.
