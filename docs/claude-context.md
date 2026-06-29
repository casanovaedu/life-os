# Life OS — Personal Context for Claude

This document gives Claude full context about Edu's personal Life OS system. Use it to answer questions about finances, health, goals, and recommendations without needing further explanation.

---

## Who is Edu

- Eduard Casanova, living in Barcelona, Spain
- Net salary: €3,337.50/month
- Uses this system as his personal financial + health OS, replacing Google Sheets
- Tracks expenses, savings goals, workouts, and health metrics daily
- Communicates primarily in Spanish or English (mixed)

---

## Financial Overview (as of June 29, 2026)

### Net Worth: €7,852.45

### Accounts

| Account | Balance | Type |
|---------|---------|------|
| BBVA Cash | €1,446.29 | cash |
| Revolut Cash | €487.03 | cash |
| IBKR Cash | €80.76 | cash |
| Japan Fund | €2,072.26 | savings |
| Revolut 2% | €1,640.11 | savings |
| IBKR | €2,959.00 | investment |
| Revolut Trading | €173.00 | investment |
| Crypto | €36.00 | investment |
| Credit card | −€780.00 | debt |
| Deuda Apple | −€262.00 | debt |

**Total assets: €8,894.45 | Total debt: €1,042.00**

### Monthly Budget

| Category | Budget |
|----------|--------|
| Supermarket | €337 |
| Restaurante / Bar | €300 |
| Fitness | €194 |
| Varios | €173 |
| Compras | €150 |
| Ocio | €100 |
| Health | €90 |
| Vet | €50 |
| Transporte | €45 |
| Rent | €766.20 (fixed, auto) |
| Subscriptions | ~€212 (fixed, auto) |

**Total fixed costs: ~€978/month | Variable budget: ~€1,439/month**

### June 2026 Spending (current month, as of Jun 29)

| Category | Spent |
|----------|-------|
| Ocio | €440.77 |
| Compras | €415.25 |
| Supermarket | €249.90 |
| Restaurante / Bar | €195.56 |
| Varios | €114.67 |
| Transporte | €114.50 |
| Health | €81.85 |
| Lifestyle | €40.78 |
| **TOTAL** | **€1,653.28** |

### Historical Monthly Spending

| Month | Total |
|-------|-------|
| January 2026 | €152.97 (partial data) |
| April 2026 | €1,368.71 |
| May 2026 | €1,970.78 |
| June 2026 | €1,653.28 (in progress) |

### Savings Goals

| Goal | Target | Saved | Account | Progress |
|------|--------|-------|---------|----------|
| Japan trip | €6,350 | €2,072.26 | Japan Fund | 32.6% |
| Emergency fund | €6,000 | €1,640.11 | Revolut 2% | 27.3% |

---

## Health Data (last 7 days)

Data from Garmin via n8n sync.

| Date | HRV | Resting HR | Steps | Sleep hrs | Sleep score | Readiness |
|------|-----|-----------|-------|-----------|-------------|-----------|
| Jun 29 | 104 | 44 bpm | 1,707 | 6.2h | 79 | 94 |
| Jun 28 | 98 | 47 bpm | 299 | 3.2h | 41 | — |
| Jun 27 | — | — | — | — | — | — |
| Jun 26 | — | — | — | — | — | — |
| Jun 25 | 73 | 47 bpm | 2,895 | 7.5h | 67 | — |
| Jun 24 | 53 | 52 bpm | 6,470 | 1.5h | 19 | — |
| Jun 23 | 82 | 45 bpm | 5,943 | 6.5h | 77 | — |

**Observations:** Jun 24 was a brutal night (1.5h sleep, HRV crashed to 53). Recovery by Jun 29 looks strong (HRV 104, readiness 94, resting HR 44). Missing data on Jun 26-27 (sync gap).

### Health schema (Supabase `health_metrics` table)
Columns: `date, hrv, resting_hr, steps, sleep_total_hour, sleep_deep_hour, sleep_rem_hour, sleep_score, avg_sleeping_hr, readiness, active_kcal, total_kcal, max_hr, avg_hr, stress, body_battery_max, flights_climbed, walking_distance_mi, exercise_minute, dietary_energy, protein, total_fat, fiber, source`

---

## Database Schema (Supabase — project: gururxpsdvjtobwxhhkh)

### Tables

**`expenses`** — all spending
```
date, amount, concept (merchant), category, account, source, created_at
```

**`accounts`** — current balances
```
name, balance, type (cash/savings/investment/debt), updated_at
```

**`budgets`** — monthly budget per category
```
month, category, amount
```

**`net_worth_snapshots`** — daily net worth history
```
date, net_worth, created_at
```

**`health_metrics`** — daily Garmin data (one row per day)
```
date + all metrics above
```

**`workouts`** — exercise log
```
date, type, duration_min, notes, rpe, load, avg_hr, fitness_ctl, fatigue_atl, form_tsb, muscle_groups, cardio_type, cardio_min, calories, distance_m
```

### Expense categories (exact strings in DB)
`Supermarket` · `Restaurante / Bar` · `Compras` · `Transporte` · `Ocio` · `Health` · `Vet` · `Varios` · `Fitness` · `Subscriptions` · `Rent` · `Lifestyle`

---

## Automations running (n8n, self-hosted)

| Trigger | What it does |
|---------|-------------|
| Revolut tap-to-pay | iOS Shortcut → n8n → Claude Haiku categorises → Supabase INSERT + balance deduct |
| 1st of month 8am | Auto-inserts €766.20 Rent expense from BBVA Cash |
| Daily 23:50 | Snapshots net worth to `net_worth_snapshots` |
| Sunday 9am | Claude Haiku reads week's expenses + accounts → sends Spanish summary to Telegram |
| Garmin sync | n8n pulls Garmin Connect data → `health_metrics` table |

---

## How to answer questions about Edu's data

**If connected via MCP (Supabase MCP):** Query the database directly. Project ID: `gururxpsdvjtobwxhhkh`.

**If not connected:** Use the data in this document as a baseline (as of Jun 29, 2026) and note that live data may differ.

### Example queries for common questions

**"How much did I spend on X this month?"**
```sql
SELECT SUM(amount) FROM expenses 
WHERE category = 'X' AND date >= date_trunc('month', CURRENT_DATE);
```

**"How is my health this week?"**
```sql
SELECT date, hrv, resting_hr, steps, sleep_total_hour, sleep_score, readiness, stress
FROM health_metrics 
WHERE date >= CURRENT_DATE - INTERVAL '7 days' ORDER BY date DESC;
```

**"What's my net worth trend?"**
```sql
SELECT date, net_worth FROM net_worth_snapshots ORDER BY date DESC LIMIT 30;
```

**"Am I on track with my savings goals?"**
```sql
SELECT name, balance FROM accounts WHERE name IN ('Japan Fund', 'Revolut 2%');
```

**"What did I spend most on last month?"**
```sql
SELECT category, SUM(amount) as total FROM expenses
WHERE date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
  AND date < date_trunc('month', CURRENT_DATE)
GROUP BY category ORDER BY total DESC;
```

---

## Context for recommendations

- **Spending weakness:** Ocio and Compras consistently go over budget
- **Health strength:** Resting HR is excellent (44 bpm baseline), HRV trending well
- **Health weakness:** Sleep is irregular and often too short
- **Savings pace:** At current spending (~€1,650-1,970/month variable), monthly savings is roughly €600-800. Japan goal needs ~€4,300 more → ~6-7 months away. Emergency fund needs ~€4,360 more → similar timeline.
- **Debt:** Credit card (€780) and Apple Pay Later (€262) are current debts. Not high-interest concern but worth clearing.
- **Language:** Respond in the same language Edu uses in the question (usually Spanish or English).
