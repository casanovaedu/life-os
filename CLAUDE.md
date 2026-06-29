# Life OS — Web App

Personal financial + health dashboard. Replaces Google Sheets. Built for one user (Edu, Barcelona).

## Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL) — already exists, tables already seeded
- **Auth:** Supabase Auth (magic link or Google, single user)
- **Charts:** Recharts
- **Deploy:** Vercel (free tier) or self-hosted on Oracle Cloud

## Supabase

```
Project URL:  https://gururxpsdvjtobwxhhkh.supabase.co
Anon key:     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cnVyeHBzZHZqdG9id3hoaGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzQzNzcsImV4cCI6MjA5ODE1MDM3N30.JWY3M2t9juUg__l5pzfqT1pRz0k8y0Ep7wLzaQtOXao
```

Never commit the service_role key. Anon key is safe for client-side use (RLS is currently disabled — protect via auth session check instead).

## Database Schema

### `expenses`
```sql
id          uuid primary key default gen_random_uuid()
date        date not null
amount      numeric(10,2) not null
concept     text not null          -- merchant name
category    text not null          -- budget subcategory (see Categories below)
account     text not null          -- matches accounts.name
source      text                   -- 'revolut_notification' | 'manual' | 'finance_bro'
raw_input   text
created_at  timestamptz default now()
```

### `accounts`
```sql
id          uuid primary key default gen_random_uuid()
name        text not null unique
balance     numeric(10,2) not null
type        text                   -- 'cash' | 'savings' | 'investment' | 'debt'
updated_at  timestamptz default now()
```

Current accounts:
| name | type | approx balance |
|------|------|----------------|
| Revolut Cash | cash | ~€499 |
| Credit card | debt | ~-€780 |
| Japan Fund | savings | ~€2,072 |
| Revolut 2% | savings | ~€1,640 |
| BBVA Cash | cash | ~€1,446 |
| IBKR | investment | ~€2,955 |
| Revolut Trading | investment | ~€173 |
| Crypto | investment | ~€36 |
| Deuda Apple | debt | ~-€262 |

### `health_metrics` (to be created)
```sql
id          uuid primary key default gen_random_uuid()
date        date not null
metric      text not null    -- 'weight_kg' | 'steps' | 'sleep_hours' | 'resting_hr' | 'hrv'
value       numeric(8,2) not null
source      text             -- 'apple_health' | 'manual'
created_at  timestamptz default now()
```

### `workouts` (to be created)
```sql
id          uuid primary key default gen_random_uuid()
date        date not null
type        text not null    -- 'gym' | 'run' | 'yoga' | etc.
duration_min int
notes       text
source      text
created_at  timestamptz default now()
```

## Expense Categories

These are the exact strings stored in `expenses.category`. Do not invent others.

Finance:
- Supermarket
- Restaurante / Bar
- Compras
- Transporte
- Ocio
- Health
- Vet
- Varios

Fixed (logged by automations, not user input):
- Rent (€766/month)
- Fitness (Classpass €89 + Wellhub €105)
- Subscriptions (Apple €212, Spotify, etc.)

## Monthly Budget

| Category | Monthly Budget |
|----------|---------------|
| Supermarket | €200 |
| Restaurante / Bar | €150 |
| Compras | €100 |
| Transporte | €80 |
| Ocio | €150 |
| Health | €50 |
| Vet | €50 |
| Varios | €50 |
| Fitness | €194 |
| Subscriptions | €212 |
| Rent | €766 |

Income: ~€3,337.50/month net salary

## Financial Goals

| Goal | Target | Saved | Account |
|------|--------|-------|---------|
| Japan trip | €6,350 | ~€2,072 | Japan Fund |
| Emergency fund | €6,000 | ~€1,640 | Revolut 2% |

## Pages to Build (priority order)

### 1. Dashboard `/`
- Net worth total (sum of all accounts)
- Accounts list with balances (grouped: cash / savings / investment / debt)
- This month: spent vs budget (progress bars per category)
- Recent expenses (last 10, with UNDO — calls DELETE /rest/v1/expenses and RPC add_to_account)
- Goals progress (Japan Fund, Emergency Fund)

### 2. Expenses `/expenses`
- Table of all expenses, filterable by month / category / account
- Inline delete with balance reversal (same UNDO logic)
- Monthly total by category (bar chart)
- No "add expense" form needed — expenses come in automatically via n8n

### 3. Accounts `/accounts`
- Balance per account
- Net worth over time (line chart — pull from a future net_worth_snapshots table)
- Manual balance edit (for accounts not auto-tracked)

### 4. Health `/health` (lower priority)
- Weight trend (line chart)
- Steps / sleep / HRV from health_metrics
- Workout log from workouts

## UNDO Logic (balance reversal)

When deleting an expense:
1. DELETE from expenses where id = {id}
2. POST to Supabase RPC `add_to_account`: `{ account_name: expense.account, add_amount: expense.amount }`

```
POST https://gururxpsdvjtobwxhhkh.supabase.co/rest/v1/rpc/add_to_account
Headers: apikey, Authorization: Bearer {anon_key}, Content-Type: application/json
Body: { "account_name": "Revolut Cash", "add_amount": 12.50 }
```

## Design Principles

- Mobile-first (used on phone, not desktop)
- Dark mode default
- Minimal — numbers and charts only, no decorative elements
- Spanish labels where possible (matches the data: "Restaurante / Bar", etc.)
- Fast — no loading skeletons for more than 300ms

## Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://gururxpsdvjtobwxhhkh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cnVyeHBzZHZqdG9id3hoaGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzQzNzcsImV4cCI6MjA5ODE1MDM3N30.JWY3M2t9juUg__l5pzfqT1pRz0k8y0Ep7wLzaQtOXao
```

## What Already Exists (do not rebuild)

- All data pipelines (n8n automations write to Supabase automatically)
- Expense capture from Revolut push notifications → Supabase
- UNDO via Telegram inline button → n8n webhook → Supabase
- Balance deduction on expense insert (RPC `deduct_from_account`)
- Balance restoration on delete (RPC `add_to_account`)

The web app is **read-heavy**. Main job: display data beautifully and allow deletes. No complex forms.
