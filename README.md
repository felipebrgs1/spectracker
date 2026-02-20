# spectracker

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Nuxt** - The Intuitive Vue Framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Cloudflare Workers + Wrangler** - Runtime and deployment
- **Drizzle** - TypeScript-first ORM
- **Cloudflare D1** - Database engine
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses Cloudflare D1 with Drizzle ORM in the Nuxt worker (`apps/web`).

1. Set `database_id` in `apps/web/wrangler.toml`.
2. Use `binding = "DB"` in `apps/web/wrangler.toml`.
3. Run `pnpm run dev:web` (single worker).

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The app runs in a single worker (web + server routes).

## Formatting

- Format and lint fix: `pnpm run check`

## Project Structure

```
spectracker/
├── apps/
│   ├── web/         # Frontend application (Nuxt)
│   └── server/      # Backend API (Cloudflare Worker)
├── packages/
│   ├── api/         # API layer / business logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run dev:server`: Start only the server
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:generate`: Generate database client/types
- `pnpm run db:migrate`: Run database migrations
- `pnpm run db:studio`: Open database studio UI
- `pnpm run check`: Run Oxlint and Oxfmt
