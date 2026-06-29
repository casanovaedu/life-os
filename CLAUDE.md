# Life OS — Claude Code Instructions

Personal financial + health dashboard. Replaces spreadsheets. Built for a single user.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (Google OAuth, single user)
- **Charts:** Recharts
- **Automation:** n8n (self-hosted)
- **Deploy:** Oracle Cloud (free tier) + PM2 + Nginx + Cloudflare

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Never commit the service_role key. The anon key is safe for client-side use.

## Database Schema

### `expenses`
```sql
id          uuid primary key default gen_random_uuid()
date        date not null
amount      numeric(10,2) not null
concept     text not null          -- merchant name
category    text not null          -- budget subcategory
account     text not null          -- matches accounts.name
source      text                   -- 'revolut_notification' | 'manual' | 'automation'
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

### `budgets`
```sql
month       date not null
category    text not null
amount      numeric(10,2) not null
```

### `net_worth_snapshots`
```sql
id          uuid primary key default gen_random_uuid()
date        date not null unique
net_worth   numeric(10,2) not null
created_at  timestamptz default now()
```

### `health_metrics`
One row per day from Garmin. Columns: `date, hrv, resting_hr, steps, sleep_total_hour, sleep_deep_hour, sleep_rem_hour, sleep_score, readiness, stress, body_battery_max, active_kcal, total_kcal, source`

### `workouts`
```sql
id            uuid primary key default gen_random_uuid()
date          date not null
type          text not null
duration_min  int
notes         text
rpe           int
avg_hr        int
calories      int
source        text
created_at    timestamptz default now()
```

## Expense Categories

Define your own in the `budgets` table. Common examples:
`Supermarket` · `Restaurante / Bar` · `Compras` · `Transporte` · `Ocio` · `Health` · `Vet` · `Varios` · `Fitness` · `Subscriptions` · `Rent`

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Dashboard — net worth, budget progress, goals, recent expenses |
| `/gastos` | All expenses, filterable, with month-over-month comparison |
| `/cuentas` | Accounts, net worth history chart, distribution |
| `/salud` | Health metrics from Garmin (HRV, sleep, steps) |
| `/entrenos` | Workout log |

## UNDO Logic (balance reversal)

When deleting an expense:
1. DELETE from `expenses` where `id = {id}`
2. POST to Supabase RPC `add_to_account`: `{ account_name, add_amount }`

```
POST /rest/v1/rpc/add_to_account
Body: { "account_name": "Account Name", "add_amount": 12.50 }
```

## Deploy

```bash
npm run build
ssh your-server "rm -rf ~/life-os/.next"
rsync -az --delete .next user@your-server:~/life-os/
ssh your-server "pm2 restart life-os"
```

## Design Principles

- Mobile-first (used on phone daily)
- Dark mode default, single accent colour (electric lime `#BEFF00`)
- Liquid glass UI — `backdrop-filter: blur` cards
- Fast — SWR for client-side fetching, no loading skeletons
- Spanish labels where possible (matches the data)

## n8n Automation Templates

See `docs/` for importable workflow JSON files:
- `docs/n8n-daily-snapshot.json` — daily net worth snapshot at 23:50
- `docs/n8n-weekly-report.json` — weekly AI spending summary via Telegram
- `docs/setup-net-worth-history.sql` — Supabase table + RPC function setup
