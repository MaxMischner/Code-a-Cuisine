# Code-à-Cuisine

Smart web application that generates AI-powered recipes from your available ingredients. Built for home cooks and shared households to reduce food waste and cook more creatively.

## Features

- **Ingredient input** with autocomplete from a curated ingredient list
- **Custom unit dropdown** — g, ml, piece, tbsp, tsp
- **Preference selection** — cuisine style, diet, time budget, portions (1–12), number of cooks (1–4)
- **3 AI-generated recipes** per request via Google Gemini
- **Step-by-step instructions** optimised for 1–4 cooks with task assignment per chef
- **Nutritional information** (calories, protein, fat, carbs) per recipe
- **IP-based quota system** — 3 recipes per IP per day, 12 system-wide per day
- **Public recipe library** — all generated recipes browsable by cuisine with pagination
- **Like / Unlike** — IP-based deduplication, atomic DB operations, optimistic UI updates
- **Fully responsive** — desktop, tablet, and mobile (down to 320px)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21 (Signals, lazy-loaded routes) |
| Automation & AI | n8n + Google Gemini |
| Database | Supabase (PostgreSQL) |
| Styling | SCSS with fluid typography (`clamp()`) |
| Icons | Material Icons |
| Fonts | Quicksand · Mulish · Ubuntu (Google Fonts) |

## Architecture

```
Angular → n8n Webhook → Validate & Sanitize → Gemini AI → Supabase → Angular
                      ↓
              Quota Check (IP/day)
```

1. User enters ingredients and preferences
2. Angular sends POST to n8n webhook
3. n8n extracts IP, checks quota against Supabase
4. Input is sanitized and validated (allowlist for cuisine/diet/time, max 15 ingredients)
5. Prompt is built and sent to Google Gemini
6. Gemini returns 3 recipes as JSON
7. n8n saves recipes to Supabase and increments quota
8. Angular displays results; recipes are immediately visible in the library

## Setup

### Prerequisites

- Node.js 20+
- Angular CLI (`npm install -g @angular/cli`)
- n8n instance (cloud or self-hosted)
- Supabase project

### 1. Clone & install

```bash
git clone <repo-url>
cd Code-a-Cuisine
npm install
```

### 2. Environment configuration

Create `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  n8nWebhookUrl: 'YOUR_N8N_WEBHOOK_URL',
  supabaseUrl: 'YOUR_SUPABASE_PROJECT_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',
};
```

Create `src/environments/environment.prod.ts` with `production: true` and your production URLs.

### 3. Supabase setup

**`recipes`** table:
```sql
create table recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  time text,
  portions integer,
  cuisine text,
  diet text,
  tags text[],
  nutrition jsonb,
  your_ingredients jsonb,
  additional_ingredients jsonb,
  steps jsonb,
  likes integer default 0,
  created_at timestamptz default now()
);
```

**`quota`** table:
```sql
create table quota (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  count integer default 0,
  date date not null
);
```

**`likes`** table (IP-based deduplication):
```sql
create table likes (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete cascade,
  ip text not null,
  constraint likes_recipe_ip_unique unique (recipe_id, ip)
);
```

**RPC functions:**
```sql
-- Increment like counter
create or replace function increment_likes(recipe_id uuid)
returns void as $$
begin
  update recipes set likes = likes + 1 where id = recipe_id;
end;
$$ language plpgsql;

-- Decrement like counter (min 0)
create or replace function decrement_likes(recipe_id uuid)
returns void as $$
begin
  update recipes set likes = greatest(likes - 1, 0) where id = recipe_id;
end;
$$ language plpgsql;
```

### 4. n8n workflow

1. Open your n8n instance
2. Import `n8n/workflows/Code-A-Cuisine.json`
3. Configure credentials:
   - **Google Gemini API** — add your Google AI API key
   - **Supabase** — add your Supabase project URL and service role key
4. Activate the workflow
5. Copy the production webhook URL into `environment.prod.ts`

### 5. Run locally

```bash
ng serve
```

Open [http://localhost:4200](http://localhost:4200)

### 6. Production build

```bash
ng build
```

Output in `dist/` — deploy via FTP or any static host.

## Project Structure

```
src/
├── app/
│   ├── core/services/
│   │   ├── recipe-generator.service.ts   # n8n webhook communication + result cache
│   │   └── supabase.service.ts           # recipes, quota, likes
│   ├── pages/
│   │   ├── landing/                      # hero / entry point
│   │   ├── generator/                    # ingredient input + AI generation (multi-step)
│   │   ├── cookbook/                     # cuisine hub + most-liked carousel
│   │   ├── library/                      # paginated recipe list by cuisine
│   │   ├── recipe-detail/                # full recipe view + like toggle
│   │   └── impressum/                    # legal notice
│   └── shared/components/
│       ├── navbar/
│       ├── footer/
│       ├── tag-chip/
│       └── loading-spinner/
├── styles/
│   ├── _variables.scss                   # design tokens (colours, fonts, spacing)
│   └── _mixins.scss
└── environments/                         # gitignored — create manually
n8n/
└── workflows/
    └── Code-A-Cuisine.json               # n8n workflow export
```

## Quota System

| Limit | Value |
|---|---|
| Per IP per day | 3 generations |
| System-wide per day | 12 generations |

Quota is enforced at two layers:
- **Frontend** — `SupabaseService.checkQuota()` before sending the request
- **n8n** — quota node at workflow entry, before any AI calls

## Like System

Every recipe can be liked or unliked once per IP address:

- `likes` table stores one row per `(recipe_id, ip)` combination (UNIQUE constraint)
- `increment_likes` / `decrement_likes` RPC functions update the counter atomically
- UI updates optimistically; corrected silently if the DB state diverges

## Responsive Breakpoints

| Breakpoint | Change |
|---|---|
| 1380px | Cookbook layout switches to fluid widths |
| 1200px | Landing text area narrows |
| 1050px | Landing visuals freeze position |
| 900px | Cookbook stacks intro above carousel |
| 768px | Library: mobile hero, recipe title wraps |
| 750px | Landing visuals follow viewport |
| 480px | Mobile layout for all pages |
| 430px | Landing visuals freeze again |
| 320px | Minimum supported width |

## Git Workflow

- Commit after every coding session
- Use conventional commit prefixes: `feat:`, `fix:`, `style:`, `refactor:`
- `src/environments/` is gitignored — never commit API keys
