# Life OS

> A personal financial and health dashboard that replaces Google Sheets. Built for one person, designed like a premium app.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss)
![n8n](https://img.shields.io/badge/n8n-Automation-EA4B71?style=flat-square&logo=n8n)
![Self-hosted](https://img.shields.io/badge/Self--hosted-Oracle%20Cloud-F80000?style=flat-square&logo=oracle)

---

## What is this?

Life OS is a self-hosted personal dashboard that tracks finances and health metrics in real time — automatically. Expenses are captured from bank notifications, categorized by AI, and displayed in a clean mobile-first interface.

No subscription. No third-party app with your bank data. Just your own infrastructure, running forever for ~€5/month.

---

## Screenshots

| Dashboard | Expenses | Accounts |
|-----------|----------|----------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Expenses](docs/screenshots/expenses.png) | ![Accounts](docs/screenshots/accounts.png) |

---

## Features

### Finance
- **Net worth** — real-time total across all accounts (cash, savings, investments, debt)
- **Monthly budget tracking** — progress bars per category, colour-coded (green → amber → red)
- **Month-over-month comparison** — each category shows % change vs last month
- **Expense log** — with inline delete that automatically reverses the account balance
- **Goal tracker** — savings goals with progress bars and ETA based on your savings rate
- **Net worth history chart** — 1M / 3M / 6M / 1Y evolution, updated daily
- **Add expense manually** — FAB button with a sheet modal, optimised for iOS

### Automation (via n8n)
- Revolut tap-to-pay → iOS Shortcut → n8n webhook → AI categorisation → Supabase
- Rent auto-inserted on the 1st of every month
- Daily net worth snapshot at 23:50
- Weekly AI spending report delivered to Telegram every Sunday at 9am

### AI
- **Expense categorisation** — Claude Haiku reads merchant name + amount and picks the right budget category
- **Weekly spending report** — Haiku analyses the week's expenses and sends a 5-sentence summary to Telegram

### Health (WIP)
- Garmin Connect sync via n8n
- Steps, sleep, HRV, resting HR, weight
- Workout log

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Data fetching | SWR (client-side, instant page loads) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — Google OAuth (single user) |
| Charts | Recharts |
| Automation | n8n (self-hosted) |
| AI | Claude Haiku via Anthropic API |
| Notifications | Telegram Bot |
| Deploy | Oracle Cloud (free tier) + PM2 + Nginx + Cloudflare |

---

## Architecture

```
Revolut notification
       │
       ▼
iOS Shortcut (Wallet trigger)
       │
       ▼
n8n webhook
       ├── Claude Haiku (categorise)
       ├── Supabase INSERT expenses
       ├── Supabase RPC deduct_from_account
       └── Telegram confirmation

n8n cron (Sunday 9am)
       ├── Fetch expenses + accounts from Supabase
       ├── Claude Haiku (weekly summary)
       └── Telegram weekly report

n8n cron (daily 23:50)
       └── Supabase RPC snapshot_net_worth

n8n cron (1st of month 8am)
       ├── Supabase INSERT Rent expense
       └── Supabase RPC deduct_from_account
```

---

## Database schema

### `expenses`
```sql
id          uuid primary key default gen_random_uuid()
date        date not null
amount      numeric(10,2) not null
concept     text not null
category    text not null
account     text not null
source      text             -- 'revolut_notification' | 'manual' | 'automation'
created_at  timestamptz default now()
```

### `accounts`
```sql
id          uuid primary key default gen_random_uuid()
name        text not null unique
balance     numeric(10,2) not null
type        text             -- 'cash' | 'savings' | 'investment' | 'debt'
updated_at  timestamptz default now()
```

### `net_worth_snapshots`
```sql
id          uuid primary key default gen_random_uuid()
date        date not null unique
net_worth   numeric(10,2) not null
created_at  timestamptz default now()
```

### `budgets`
```sql
month       date not null
category    text not null
amount      numeric(10,2) not null
```

---

## Setup

### 1. Clone and install
```bash
git clone https://github.com/casanovaedu/life-os
cd life-os
npm install
```

### 2. Environment variables
```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 3. Supabase setup
Run the SQL in `docs/setup-net-worth-history.sql` against your Supabase project to create the `net_worth_snapshots` table and the `snapshot_net_worth()` function.

### 4. Run locally
```bash
npm run dev
```

### 5. Deploy to your own server
```bash
npm run build
ssh your-server "rm -rf ~/life-os/.next"
rsync -az --delete .next user@your-server:~/life-os/
ssh your-server "pm2 restart life-os"
```

---

## n8n workflow templates

Import from `docs/` into your n8n instance:

| File | Purpose |
|------|---------|
| `docs/n8n-daily-snapshot.json` | Daily net worth snapshot at 23:50 |
| `docs/n8n-weekly-report.json` | Weekly AI spending report on Sunday 9am |

---

## Budget categories

```
Supermarket · Restaurante / Bar · Compras · Transporte
Ocio · Health · Vet · Varios · Fitness · Subscriptions · Rent
```

---

## Design principles

- **Mobile-first** — used on phone daily, not desktop
- **Dark mode default** — single accent colour (electric lime `#BEFF00`)
- **Liquid glass UI** — `backdrop-filter: blur` cards, no gradients, no decoration
- **Minimal** — numbers and charts only
- **Fast** — SWR for instant navigation, no loading skeletons

---

## What's not in this repo

The data pipelines (n8n automations) are self-hosted and not included. The web app:
- Reads data from Supabase and displays it
- Allows deleting expenses with automatic balance reversal
- Allows manually adding expenses

Everything else (capturing bank notifications, AI categorisation, Telegram alerts) runs in n8n separately.

---

## License

MIT — fork it, adapt it, build your own Life OS.
