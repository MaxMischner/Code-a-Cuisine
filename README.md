# Code-à-Cuisine

Smart web application that generates AI-powered recipes from your available ingredients. Built for home cooks and shared households to reduce food waste and cook more creatively.

## Features

- **Ingredient input** with autocomplete from a curated ingredient list
- **Preference selection** — cuisine style, diet, time budget, portions, number of cooks
- **3 AI-generated recipes** per request via Google Gemini
- **Step-by-step instructions** optimised for 1–4 cooks with task assignment
- **Nutritional information** (calories, protein, fat, carbs) per recipe
- **IP-based quota system** — 3 recipes per IP per day, 12 system-wide per day
- **Public recipe library** — all generated recipes browsable by cuisine
- **Fully responsive** — desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21 (Signals) |
| Automation & AI | n8n + Google Gemini (via LangChain node) |
| Database | Supabase (PostgreSQL) |
| Styling | SCSS with fluid typography (`clamp()`) |

> **Note on database:** Requirements originally specified Firebase. Supabase was chosen instead due to better developer familiarity and an equivalent feature set. There are no functional differences for this use case.

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

Create the following tables in your Supabase project:

**`recipes`** table:
```sql
create table recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  time text,
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

**`increment_quota` RPC function:**
```sql
create or replace function increment_quota(user_ip text, quota_date date)
returns void as $$
begin
  insert into quota (ip, count, date) values (user_ip, 1, quota_date)
  on conflict (ip, date) do update set count = quota.count + 1;
end;
$$ language plpgsql;
```

**`increment_likes` RPC function:**
```sql
create or replace function increment_likes(recipe_id uuid)
returns void as $$
begin
  update recipes set likes = likes + 1 where id = recipe_id;
end;
$$ language plpgsql;
```

### 4. n8n workflow

1. Open your n8n instance
2. Import `n8n/workflows/Code-A-Cuisine.json`
3. Configure credentials:
   - **Google Gemini (PaLM) API** — add your Google AI API key
   - **Supabase** — add your Supabase project URL and service role key
4. Activate the workflow (toggle top-right → Active)
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

Output in `dist/` — deploy to any static host (Netlify, Vercel, Firebase Hosting, etc.).

## Project Structure

```
src/
├── app/
│   ├── core/services/
│   │   ├── recipe-generator.service.ts   # n8n webhook communication
│   │   └── supabase.service.ts           # database operations
│   ├── pages/
│   │   ├── landing/                      # hero / entry point
│   │   ├── generator/                    # ingredient input + AI generation
│   │   ├── cookbook/                     # cuisine hub + most liked
│   │   ├── library/                      # paginated recipe list by cuisine
│   │   ├── recipe-detail/                # full recipe view
│   │   └── impressum/                    # legal notice
│   └── shared/components/
│       ├── navbar/
│       └── footer/
├── styles/
│   ├── _variables.scss                   # design tokens
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
- **Frontend** — `SupabaseService.checkQuota()` before sending request
- **n8n** — `Get Quota from Supabase` node at workflow entry, before any AI calls

## Git Workflow

- Commit after every coding session
- Use descriptive commit messages (`feat:`, `fix:`, `style:`, `refactor:`)
- `src/environments/` is gitignored — never commit API keys
