# SpecTracker — Plano de Projeto

> Aplicação estilo PCPartPicker para montagem de PCs com banco de dados de componentes e regras de compatibilidade.

---

## 1. Visao Geral

O SpecTracker e uma plataforma web para construir configuracoes de PC a partir de um banco de dados de componentes (CPU, GPU, RAM, etc.), aplicando regras de compatibilidade automaticamente. O usuario monta seu setup, ve conflitos em tempo real e pode salvar/compartilhar builds.

### 1.1 Stack Tecnologico

| Camada        | Tecnologia                                     |
| ------------- | ---------------------------------------------- |
| Framework     | **Nuxt 4** (SSR/SPA)                           |
| UI            | **shadcn-vue** (substituindo `@nuxt/ui`)       |
| Styling       | **Tailwind CSS v4**                            |
| API (backend) | **Nuxt Server Routes** (API oculta, sem expor) |
| ORM / DB      | **Drizzle ORM** + **Turso** (libSQL)           |
| RPC (interno) | **oRPC** (reaproveitando `@spectracker/api`)   |
| Monorepo      | **Turborepo** + **pnpm workspaces**            |
| Validacao     | **Zod v4**                                     |
| Runtime       | **Bun** (server standalone) / **Node** (Nuxt)  |

### 1.2 Principios

- **API oculta**: toda comunicacao com o banco acontece por Nuxt server routes (`/server/api/`). O cliente nunca sabe o endpoint real.
- **Type-safety end-to-end**: schemas Zod compartilhados entre front e back.
- **Monorepo-first**: pacotes reutilizaveis (`@spectracker/db`, `@spectracker/api`, `@spectracker/env`).
- **Compatibilidade como regra de negocio**: o motor de compatibilidade vive no pacote `@spectracker/api` e e testavel isoladamente.

---

## 2. Arquitetura Atual (baseline)

```
spectracker/
├── apps/
│   ├── web/           # Nuxt 4 (frontend) — usa @nuxt/ui hoje
│   ├── server/        # Elysia (API standalone com oRPC)
│   └── fumadocs/      # Documentacao
├── packages/
│   ├── api/           # oRPC routers + procedures
│   ├── db/            # Drizzle ORM + schema + migrations
│   ├── env/           # Env validation com Zod
│   └── config/        # Configs compartilhadas (TS, lint)
```

### O que ja existe

- Nuxt 4 rodando em `apps/web` na porta 5173
- Server Elysia em `apps/server` na porta 3000 (com oRPC + OpenAPI)
- Drizzle + Turso configurado em `packages/db`
- Plugin oRPC no Nuxt para chamadas RPC ao server
- Health check funcional end-to-end
- TanStack Query configurado no frontend

---

## 3. Mudanca de UI: @nuxt/ui → shadcn-vue

### 3.1 Por que

- `shadcn-vue` oferece mais controle e customizacao sobre componentes.
- Componentes sao copiados para o projeto (nao e uma dependencia de lib).
- Melhor integracao com Tailwind CSS v4 puro.
- Mais flexibilidade para um design system proprio.

### 3.2 Passos de Migracao

1. **Remover `@nuxt/ui`** do `package.json` e `nuxt.config.ts`
2. **Instalar dependencias do shadcn-vue**:
   - `radix-vue` (primitivos headless)
   - `class-variance-authority` (CVA)
   - `clsx` + `tailwind-merge` (utilitario de classes)
   - `lucide-vue-next` (icones)
3. **Inicializar shadcn-vue** com `npx shadcn-vue@latest init`
4. **Adicionar componentes** conforme necessario: `npx shadcn-vue@latest add button card table ...`
5. **Criar `lib/utils.ts`** com o helper `cn()` (classnames merge)
6. **Atualizar `app.vue`** — remover `<UApp>`, usar estrutura propria
7. **Atualizar `default.vue` layout** — substituir `<UHeader>`, `<UMain>` por componentes proprios/shadcn
8. **Migrar componentes existentes** (`Header.vue`, `index.vue`) para usar shadcn-vue

### 3.3 Manter a API Oculta

A estrategia muda: em vez de o frontend chamar diretamente `apps/server` via oRPC client no browser, vamos **mover as chamadas para Nuxt server routes**.

```
Browser  →  Nuxt Server Route (/server/api/...)  →  @spectracker/api  →  @spectracker/db  →  Turso
```

Isso significa que:

- O `apps/server` (Elysia) pode permanecer como API publica/OpenAPI para integracao externa (opcional).
- O frontend Nuxt usa `useFetch` / `$fetch` apontando para `/api/...`, que e resolvido no server-side pelo Nuxt.
- As server routes importam procedures do `@spectracker/api` diretamente.

#### Exemplo de server route

```ts
// apps/web/server/api/builds/[id].get.ts
import { db } from "@spectracker/db";
import { builds } from "@spectracker/db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
	const id = getRouterParam(event, "id");
	const build = await db.select().from(builds).where(eq(builds.id, id)).get();

	if (!build) {
		throw createError({ statusCode: 404, message: "Build not found" });
	}

	return build;
});
```

---

## 4. Schema do Banco de Dados

### 4.1 Tabelas Principais

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  categories  │     │    components     │     │  component_specs     │
├──────────────┤     ├──────────────────┤     ├──────────────────────┤
│ id           │◄────│ category_id      │     │ component_id    (FK) │
│ name         │     │ id               │◄────│ spec_key             │
│ slug         │     │ name             │     │ spec_value           │
│ icon         │     │ brand            │     └──────────────────────┘
│ sort_order   │     │ model            │
└──────────────┘     │ price            │     ┌──────────────────────┐
                     │ image_url        │     │ compatibility_rules  │
                     │ release_date     │     ├──────────────────────┤
                     │ is_active        │     │ id                   │
                     └──────────────────┘     │ source_category_id   │
                                              │ target_category_id   │
┌──────────────┐     ┌──────────────────┐     │ rule_type            │
│    builds    │     │  build_items     │     │ source_spec_key      │
├──────────────┤     ├──────────────────┤     │ target_spec_key      │
│ id           │◄────│ build_id    (FK) │     │ operator             │
│ name         │     │ component_id(FK) │     │ description          │
│ description  │     │ quantity         │     └──────────────────────┘
│ total_price  │     └──────────────────┘
│ created_at   │
│ updated_at   │
└──────────────┘
```

### 4.2 Categorias de Componentes

| Slug          | Nome                 | Icone                  |
| ------------- | -------------------- | ---------------------- |
| `cpu`         | Processador          | `lucide:cpu`           |
| `gpu`         | Placa de Video       | `lucide:monitor`       |
| `motherboard` | Placa Mae            | `lucide:circuit-board` |
| `ram`         | Memoria RAM          | `lucide:memory-stick`  |
| `storage`     | Armazenamento        | `lucide:hard-drive`    |
| `psu`         | Fonte de Alimentacao | `lucide:zap`           |
| `case`        | Gabinete             | `lucide:box`           |
| `cooler`      | Cooler               | `lucide:fan`           |

### 4.3 Exemplos de Regras de Compatibilidade

| Regra                          | source_category | target_category | spec_key (source) | spec_key (target) | operator |
| ------------------------------ | --------------- | --------------- | ----------------- | ----------------- | -------- |
| Socket CPU = Socket Mobo       | cpu             | motherboard     | socket            | socket            | `eq`     |
| DDR RAM = DDR Mobo             | ram             | motherboard     | ddr_generation    | ddr_support       | `eq`     |
| TDP CPU <= Capacidade Cooler   | cpu             | cooler          | tdp               | max_tdp           | `lte`    |
| Wattage Total <= PSU Wattage   | \*              | psu             | total_tdp         | wattage           | `lte`    |
| Form Factor Case >= Mobo       | motherboard     | case            | form_factor       | max_form_factor   | `fit`    |
| GPU Length <= Case Max GPU Len | gpu             | case            | length_mm         | max_gpu_length_mm | `lte`    |
| M.2 Slots disponiveis          | storage         | motherboard     | interface         | m2_slots          | `slot`   |

### 4.4 Drizzle Schema (exemplo)

```ts
// packages/db/src/schema/categories.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	icon: text("icon"),
	sortOrder: integer("sort_order").default(0),
});

// packages/db/src/schema/components.ts
export const components = sqliteTable("components", {
	id: text("id").primaryKey(),
	categoryId: text("category_id")
		.notNull()
		.references(() => categories.id),
	name: text("name").notNull(),
	brand: text("brand").notNull(),
	model: text("model").notNull(),
	price: integer("price"), // em centavos
	imageUrl: text("image_url"),
	releaseDate: text("release_date"),
	isActive: integer("is_active", { mode: "boolean" }).default(true),
});

// packages/db/src/schema/component-specs.ts
export const componentSpecs = sqliteTable("component_specs", {
	id: text("id").primaryKey(),
	componentId: text("component_id")
		.notNull()
		.references(() => components.id),
	specKey: text("spec_key").notNull(),
	specValue: text("spec_value").notNull(),
});

// packages/db/src/schema/compatibility-rules.ts
export const compatibilityRules = sqliteTable("compatibility_rules", {
	id: text("id").primaryKey(),
	sourceCategoryId: text("source_category_id")
		.notNull()
		.references(() => categories.id),
	targetCategoryId: text("target_category_id")
		.notNull()
		.references(() => categories.id),
	ruleType: text("rule_type").notNull(), // 'eq' | 'lte' | 'gte' | 'fit' | 'slot'
	sourceSpecKey: text("source_spec_key").notNull(),
	targetSpecKey: text("target_spec_key").notNull(),
	operator: text("operator").notNull(),
	description: text("description"),
});

// packages/db/src/schema/builds.ts
export const builds = sqliteTable("builds", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description"),
	totalPrice: integer("total_price").default(0),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at").notNull(),
});

export const buildItems = sqliteTable("build_items", {
	id: text("id").primaryKey(),
	buildId: text("build_id")
		.notNull()
		.references(() => builds.id),
	componentId: text("component_id")
		.notNull()
		.references(() => components.id),
	quantity: integer("quantity").default(1),
});
```

---

## 5. Motor de Compatibilidade

O motor vive em `packages/api/src/compatibility/` e e uma funcao pura testavel.

```ts
// packages/api/src/compatibility/engine.ts

type Operator = "eq" | "lte" | "gte" | "fit" | "slot";

interface CompatibilityResult {
	compatible: boolean;
	conflicts: Conflict[];
	warnings: Warning[];
}

interface Conflict {
	ruleId: string;
	sourceComponent: string;
	targetComponent: string;
	message: string;
	severity: "error" | "warning";
}

function checkCompatibility(
	selectedComponents: SelectedComponent[],
	rules: CompatibilityRule[],
): CompatibilityResult {
	// 1. Agrupar componentes por categoria
	// 2. Para cada regra, verificar pares source/target
	// 3. Aplicar operador (eq, lte, gte, fit, slot)
	// 4. Coletar conflitos e warnings
	// 5. Retornar resultado
}
```

### Operadores

| Operador | Descricao                                               |
| -------- | ------------------------------------------------------- |
| `eq`     | Valores devem ser iguais (ex: socket CPU = socket mobo) |
| `lte`    | Source <= Target (ex: TDP CPU <= max TDP cooler)        |
| `gte`    | Source >= Target                                        |
| `fit`    | Form factor cabe (hierarquia: ITX < mATX < ATX < E-ATX) |
| `slot`   | Quantidade de itens <= slots disponiveis                |

---

## 6. Paginas e Rotas

### 6.1 Mapa de Paginas

```
/                         → Dashboard (home)
/build                    → Pagina de montagem (builder)
/build/:id                → Build salva (visualizar/editar)
/components               → Lista de todos os componentes
/components/:category     → Lista filtrada por categoria
/components/:category/:id → Detalhe de componente
/compare                  → Comparar builds/componentes
```

### 6.2 Dashboard (`/`)

A pagina inicial sera uma **dashboard** com:

- **Builds recentes**: cards com nome, data, preco total, status de compatibilidade
- **Estatisticas rapidas**: total de componentes no DB, builds criadas, precos medios
- **Acoes rapidas**: "Nova Build", "Explorar Componentes"
- **Componentes populares**: lista dos mais usados em builds

### 6.3 Builder (`/build`)

Layout estilo PCPartPicker:

```
┌─────────────────────────────────────────────────────────────────┐
│  Build: "Meu PC Gamer"                              [Salvar]   │
├──────────────────────────────────┬──────────────────────────────┤
│                                  │                              │
│  ┌─ CPU ────────────────────┐    │  Resumo                      │
│  │ Ryzen 7 7800X3D   [✓]   │    │  ─────────                   │
│  │ [Trocar] [Remover]       │    │  Preco Total: R$ 8.450,00    │
│  └──────────────────────────┘    │  TDP Estimado: 350W          │
│                                  │  PSU Recomendado: 550W+      │
│  ┌─ GPU ────────────────────┐    │                              │
│  │ RTX 4070 Ti       [✓]   │    │  Compatibilidade             │
│  │ [Trocar] [Remover]       │    │  ─────────────               │
│  └──────────────────────────┘    │  ✓ Socket OK                 │
│                                  │  ✓ DDR5 OK                   │
│  ┌─ Motherboard ────────────┐    │  ⚠ PSU proximo do limite     │
│  │ [Selecionar componente]  │    │  ✗ Cooler nao suporta TDP    │
│  └──────────────────────────┘    │                              │
│                                  │                              │
│  ┌─ RAM ────────────────────┐    │                              │
│  │ [Selecionar componente]  │    │                              │
│  └──────────────────────────┘    │                              │
│  ...                             │                              │
├──────────────────────────────────┴──────────────────────────────┤
│  Ao selecionar um slot, abre modal com lista filtrada          │
│  (ja mostrando apenas componentes compativeis)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Estrutura de Server Routes (API Oculta)

```
apps/web/server/
├── api/
│   ├── builds/
│   │   ├── index.get.ts          # GET /api/builds (listar)
│   │   ├── index.post.ts         # POST /api/builds (criar)
│   │   ├── [id].get.ts           # GET /api/builds/:id
│   │   ├── [id].put.ts           # PUT /api/builds/:id (atualizar)
│   │   ├── [id].delete.ts        # DELETE /api/builds/:id
│   │   └── [id]/
│   │       ├── items.get.ts      # GET /api/builds/:id/items
│   │       ├── items.post.ts     # POST /api/builds/:id/items
│   │       └── items.[itemId].delete.ts
│   ├── components/
│   │   ├── index.get.ts          # GET /api/components (listar, filtros)
│   │   ├── [id].get.ts           # GET /api/components/:id
│   │   └── [category].get.ts     # GET /api/components/:category
│   ├── categories/
│   │   └── index.get.ts          # GET /api/categories
│   └── compatibility/
│       └── check.post.ts         # POST /api/compatibility/check
├── utils/
│   └── db.ts                     # Singleton DB connection para server routes
└── tsconfig.json
```

---

## 8. Componentes shadcn-vue Necessarios

### Fase 1 — Dashboard e estrutura

- `Button`
- `Card`, `CardHeader`, `CardContent`, `CardFooter`
- `Badge`
- `Separator`
- `NavigationMenu`
- `DropdownMenu`
- `Sheet` (sidebar mobile)
- `Skeleton` (loading states)
- `Tooltip`

### Fase 2 — Builder

- `Dialog` / `Sheet` (modal de selecao de componente)
- `Table` (lista de componentes)
- `Select` (filtros)
- `Input` (busca)
- `Alert` (erros de compatibilidade)
- `ScrollArea`
- `Tabs`
- `Progress` (barra de wattage / budget)

### Fase 3 — Componentes e comparacao

- `DataTable` (com sorting, filtering, pagination)
- `Accordion` (specs do componente)
- `Avatar` (imagem do componente)
- `Command` (busca global, estilo spotlight)
- `Popover`

---

## 9. Plano de Implementacao (Fases)

### Fase 0 — Migracao de Base (agora)

- [x] Remover `@nuxt/ui` e dependencias associadas
- [x] Instalar e configurar `shadcn-vue`
- [x] Configurar Tailwind CSS v4 limpo
- [x] Criar layout base (sidebar, header, footer)
- [x] Criar pagina de dashboard vazia com estrutura
- [x] Configurar tema/cores (dark mode, paleta)
- [ ] Mover chamadas API para Nuxt server routes
- [ ] Remover plugin oRPC do frontend (manter oRPC apenas no server)

### Fase 1 — Schema e Seed

- [ ] Criar tabelas no Drizzle (`categories`, `components`, `component_specs`)
- [ ] Criar tabelas de builds (`builds`, `build_items`)
- [ ] Criar tabela `compatibility_rules`
- [ ] Seed: inserir categorias base (CPU, GPU, Mobo, etc.)
- [ ] Seed: inserir componentes de exemplo (10-20 por categoria)
- [ ] Seed: inserir regras de compatibilidade basicas
- [ ] Migrar banco com `drizzle-kit push`

### Fase 2 — Dashboard

- [ ] Widget de builds recentes
- [ ] Widget de stats (componentes, builds, etc.)
- [ ] Acoes rapidas (botoes "Nova Build", "Explorar")
- [ ] Lista de componentes populares
- [ ] Design responsivo

### Fase 3 — Builder (MVP)

- [ ] Pagina `/build` com slots por categoria
- [ ] Modal de selecao de componente (listagem do DB)
- [ ] Adicionar/remover componente ao build
- [ ] Calcular preco total
- [ ] Salvar build no banco

### Fase 4 — Motor de Compatibilidade

- [ ] Implementar engine de compatibilidade (`packages/api/src/compatibility/`)
- [ ] Integrar no builder (validacao em tempo real)
- [ ] Mostrar conflitos e warnings na UI
- [ ] Filtrar componentes compativeis no modal de selecao

### Fase 5 — Catalogo de Componentes

- [ ] Pagina `/components` com listagem geral
- [ ] Filtros por categoria, marca, preco
- [ ] Pagina de detalhe do componente
- [ ] Busca full-text

### Fase 6 — Polish

- [ ] Comparacao de builds/componentes
- [ ] Compartilhar build via link
- [ ] Export build (PDF, imagem, texto)
- [ ] SEO e meta tags
- [ ] Performance (lazy loading, cache)
- [ ] Testes unitarios (compatibilidade engine)
- [ ] Testes e2e (Playwright)

---

## 10. Configuracao da API Oculta

### Nuxt Server Routes vs Elysia

| Aspecto              | Nuxt Server Routes          | Elysia (apps/server)        |
| -------------------- | --------------------------- | --------------------------- |
| Acessivel pelo front | Sim (mesmo processo)        | Sim (HTTP externo)          |
| URL exposta          | Nao (proxied pelo Nuxt)     | Sim (porta 3000)            |
| Auth context         | Via cookies/session do Nuxt | Via headers                 |
| Uso recomendado      | Frontend do SpecTracker     | API publica, bots, webhooks |

### Decisao

- **Frontend usa Nuxt server routes** → API fica oculta
- **Elysia permanece** como API publica/OpenAPI para integracao futura (opcional)
- Ambos importam de `@spectracker/api` e `@spectracker/db`

### Envs necessarios para server routes

```env
# apps/web/.env
DATABASE_URL=libsql://...
DATABASE_AUTH_TOKEN=...
```

As server routes do Nuxt acessam o DB diretamente via `@spectracker/db`, sem proxy HTTP.

---

## 11. Design System

### Paleta de Cores

```
Primary:   Emerald (manter do config atual, pode mudar depois)
Neutral:   Slate/Zinc
Accent:    Amber (warnings de compatibilidade)
Danger:    Red (conflitos)
Success:   Green (compativel)
```

### Tipografia

- **Headings**: Inter / Geist Sans
- **Body**: Inter / Geist Sans
- **Mono**: JetBrains Mono / Geist Mono (specs, precos)

### Icones

- **Lucide** (ja configurado, compativel com shadcn-vue)

---

## 12. Decisoes Tecnicas

### IDs

Usar `nanoid` ou `cuid2` para IDs (text primary key no SQLite). Evitar UUIDs por serem longos.

### Precos

Armazenar em **centavos** (integer) para evitar problemas com float. Formatar no frontend com `Intl.NumberFormat`.

### Specs como key-value

Usar tabela `component_specs` com `spec_key` / `spec_value` em vez de colunas fixas. Isso permite specs diferentes por categoria sem alterar o schema.

### Compatibilidade

As regras sao **data-driven**: vivem no banco, nao no codigo. O engine apenas interpreta as regras. Isso permite adicionar novas regras sem deploy.

---

## 13. Proximos Passos Imediatos

1. **Remover `@nuxt/ui`** e instalar **shadcn-vue**
2. **Criar layout de dashboard** com sidebar + header usando shadcn-vue
3. **Criar as tabelas** no Drizzle e rodar migrate
4. **Criar server routes basicas** (`/api/categories`, `/api/components`)
5. **Seed inicial** com dados de exemplo
6. **Dashboard** funcional com dados reais
