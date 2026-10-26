// Pure helpers for the monthly review page (/resumen).
// No React, no Supabase: everything takes plain rows and returns plain values.

export type ExpenseRow = { id?: string; date: string; amount: number | string; concept: string; category: string }
export type BudgetRow = { category: string; amount: number | string }
export type SnapshotRow = { date: string; net_worth: number | string }
export type HealthRow = {
  date: string
  hrv: number | null
  resting_hr: number | null
  steps: number | null
  sleep_total_hour: number | string | null
  sleep_score: number | null
}
export type WorkoutRow = { date: string; type: string; duration_min: number | null }

const pad = (n: number) => String(n).padStart(2, '0')

// ── Dates ────────────────────────────────────────────────────────────────

/** "YYYY-MM": previous month during the first 5 days, else the current one. */
export function defaultReviewMonth(today: Date = new Date()): string {
  const d = today.getDate() <= 5
    ? new Date(today.getFullYear(), today.getMonth() - 1, 1)
    : today
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** Shift a "YYYY-MM" string by n months. */
export function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function monthBounds(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const days = new Date(y, m, 0).getDate()
  return { start: `${ym}-01`, end: `${ym}-${pad(days)}`, days }
}

export function monthLabel(ym: string, opts: Intl.DateTimeFormatOptions = { month: 'long' }): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-ES', opts)
}

/**
 * Days of the month that have actually happened: all of them for past months,
 * up to today for the current month, 0 for future months.
 */
export function elapsedDays(ym: string, today: Date = new Date()): number {
  const { days } = monthBounds(ym)
  const todayYm = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`
  if (ym < todayYm) return days
  if (ym > todayYm) return 0
  return today.getDate()
}

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function avg(values: (number | null)[]): number | null {
  const xs = values.filter((v): v is number => v !== null)
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null
}

/** Percentage change, or null when there is no meaningful base. */
export function pctChange(current: number, base: number | null): number | null {
  if (base === null || base <= 0) return null
  return ((current - base) / base) * 100
}

// ── Dinero ───────────────────────────────────────────────────────────────

export function sumAmounts(rows: { amount: number | string }[]): number {
  return rows.reduce((s, r) => s + (num(r.amount) ?? 0), 0)
}

export type CategoryLine = { category: string; spent: number; budget: number | null }

/** Spend per category merged with its budget, budgeted first then by spend. */
export function categoryBreakdown(expenses: ExpenseRow[], budgets: BudgetRow[]): CategoryLine[] {
  const spent: Record<string, number> = {}
  for (const e of expenses) {
    const cat = e.category || 'Sin categoría'
    spent[cat] = (spent[cat] ?? 0) + (num(e.amount) ?? 0)
  }
  const budget: Record<string, number> = {}
  for (const b of budgets) budget[b.category] = (budget[b.category] ?? 0) + (num(b.amount) ?? 0)

  const cats = new Set([...Object.keys(spent), ...Object.keys(budget).filter(c => budget[c] > 0)])
  return [...cats]
    .map(category => ({ category, spent: spent[category] ?? 0, budget: budget[category] ?? null }))
    .sort((a, b) => (b.spent - a.spent) || ((b.budget ?? 0) - (a.budget ?? 0)))
}

export type MerchantLine = { concept: string; total: number; count: number }

export function topMerchants(expenses: ExpenseRow[], limit = 5): MerchantLine[] {
  const map: Record<string, MerchantLine> = {}
  for (const e of expenses) {
    const concept = (e.concept ?? '').trim()
    if (!concept) continue
    const key = concept.toLowerCase()
    map[key] ??= { concept, total: 0, count: 0 }
    map[key].total += num(e.amount) ?? 0
    map[key].count += 1
  }
  return Object.values(map).sort((a, b) => b.total - a.total).slice(0, limit)
}

export function biggestExpense<T extends ExpenseRow>(expenses: T[]): T | null {
  let best: T | null = null
  for (const e of expenses) if (!best || (num(e.amount) ?? 0) > (num(best.amount) ?? 0)) best = e
  return best
}

/**
 * Average monthly spend over the given months (e.g. the 3 before the review
 * month). Months with no expenses count as 0 only if some later month has data,
 * so a fresh install doesn't drag the average down.
 */
export function monthlyAverage(expenses: ExpenseRow[], months: string[]): number | null {
  const totals = months.map(ym => sumAmounts(expenses.filter(e => e.date.startsWith(ym))))
  const firstWithData = totals.findIndex(t => t > 0)
  if (firstWithData === -1) return null
  const used = totals.slice(firstWithData)
  return used.reduce((s, t) => s + t, 0) / used.length
}

export type NetWorthChange = { start: number; end: number; delta: number; startDate: string; endDate: string }

/**
 * Net worth at the start and end of the month. Start = last snapshot before the
 * month (closing of previous month), or the first one inside it. End = last
 * snapshot inside the month. Needs at least two distinct snapshots.
 */
export function netWorthChange(snapshots: SnapshotRow[], ym: string): NetWorthChange | null {
  const { start, end } = monthBounds(ym)
  const sorted = [...snapshots].filter(s => num(s.net_worth) !== null).sort((a, b) => a.date.localeCompare(b.date))
  const before = sorted.filter(s => s.date < start)
  const inside = sorted.filter(s => s.date >= start && s.date <= end)
  if (inside.length === 0) return null
  const first = before.length ? before[before.length - 1] : inside[0]
  const last = inside[inside.length - 1]
  if (first.date === last.date) return null
  const s = num(first.net_worth)!, e = num(last.net_worth)!
  return { start: s, end: e, delta: e - s, startDate: first.date, endDate: last.date }
}

// ── Salud ────────────────────────────────────────────────────────────────

export type HealthSummary = {
  days: number
  sleepHours: number | null
  sleepScore: number | null
  hrv: number | null
  restingHr: number | null
  totalSteps: number
  avgSteps: number | null
  bestNight: { date: string; hours: number } | null
  worstNight: { date: string; hours: number } | null
}

export function healthSummary(rows: HealthRow[]): HealthSummary {
  const nights = rows
    .map(r => ({ date: r.date, hours: num(r.sleep_total_hour) }))
    .filter((n): n is { date: string; hours: number } => n.hours !== null && n.hours > 0)
  const stepDays = rows.map(r => num(r.steps)).filter((s): s is number => s !== null && s > 0)
  let best: typeof nights[0] | null = null
  let worst: typeof nights[0] | null = null
  for (const n of nights) {
    if (!best || n.hours > best.hours) best = n
    if (!worst || n.hours < worst.hours) worst = n
  }
  return {
    days: rows.length,
    sleepHours: avg(nights.map(n => n.hours)),
    sleepScore: avg(rows.map(r => (num(r.sleep_score) ?? 0) > 0 ? num(r.sleep_score) : null)),
    hrv: avg(rows.map(r => (num(r.hrv) ?? 0) > 0 ? num(r.hrv) : null)),
    restingHr: avg(rows.map(r => (num(r.resting_hr) ?? 0) > 0 ? num(r.resting_hr) : null)),
    totalSteps: stepDays.reduce((s, v) => s + v, 0),
    avgSteps: avg(stepDays),
    bestNight: best,
    worstNight: nights.length > 1 ? worst : null,
  }
}

/** Monday of the week containing a "YYYY-MM-DD" date, as "YYYY-MM-DD". */
export function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = dt.getDay()
  dt.setDate(dt.getDate() - (dow === 0 ? 6 : dow - 1))
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

/** Week (Mon-start) with the highest average sleep, needing at least `minNights` nights. */
export function bestSleepWeek(rows: HealthRow[], minNights = 3): { weekStart: string; hours: number; nights: number } | null {
  const weeks: Record<string, number[]> = {}
  for (const r of rows) {
    const h = num(r.sleep_total_hour)
    if (h === null || h <= 0) continue
    ;(weeks[weekStart(r.date)] ??= []).push(h)
  }
  let best: { weekStart: string; hours: number; nights: number } | null = null
  for (const [ws, hs] of Object.entries(weeks)) {
    if (hs.length < minNights) continue
    const hours = hs.reduce((s, v) => s + v, 0) / hs.length
    if (!best || hours > best.hours) best = { weekStart: ws, hours, nights: hs.length }
  }
  return best
}

export type TrendPoint = { date: string; day: number; hrv: number | null; sleep: number | null }

export function healthTrend(rows: HealthRow[]): TrendPoint[] {
  return [...rows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => ({
      date: r.date,
      day: Number(r.date.slice(8, 10)),
      hrv: (num(r.hrv) ?? 0) > 0 ? num(r.hrv) : null,
      sleep: (num(r.sleep_total_hour) ?? 0) > 0 ? num(r.sleep_total_hour) : null,
    }))
}

// ── Entrenos ─────────────────────────────────────────────────────────────

export type WorkoutSummary = {
  count: number
  totalMinutes: number
  byType: { type: string; count: number; minutes: number }[]
  longest: WorkoutRow | null
  trainingDays: number
  restDays: number
}

/** `daysElapsed` = days of the month that have happened (see elapsedDays). */
export function workoutSummary(workouts: WorkoutRow[], daysElapsed: number): WorkoutSummary {
  const types: Record<string, { type: string; count: number; minutes: number }> = {}
  let longest: WorkoutRow | null = null
  let totalMinutes = 0
  for (const w of workouts) {
    const minutes = num(w.duration_min) ?? 0
    totalMinutes += minutes
    const type = w.type?.trim() || 'Otro'
    types[type] ??= { type, count: 0, minutes: 0 }
    types[type].count += 1
    types[type].minutes += minutes
    if (minutes > 0 && (!longest || minutes > (num(longest.duration_min) ?? 0))) longest = w
  }
  const trainingDays = new Set(workouts.map(w => w.date)).size
  return {
    count: workouts.length,
    totalMinutes,
    byType: Object.values(types).sort((a, b) => b.count - a.count || b.minutes - a.minutes),
    longest,
    trainingDays,
    restDays: Math.max(0, daysElapsed - trainingDays),
  }
}

// ── Highlights ───────────────────────────────────────────────────────────

export type Highlight = { emoji: string; title: string; value: string; detail?: string; tone: 'good' | 'bad' | 'neutral' }

export type HighlightInput = {
  biggest: ExpenseRow | null
  netWorth: NetWorthChange | null
  sleepWeek: { weekStart: string; hours: number } | null
  spentVsPrev: number | null
  prevMonthName: string
  topMerchant: MerchantLine | null
  workouts: WorkoutSummary
  formatEuro: (n: number, whole?: boolean) => string
}

/** 7.5 → "7h 30m" */
export function fmtHours(h: number): string {
  const mins = Math.round(h * 60)
  return `${Math.floor(mins / 60)}h ${pad(mins % 60)}m`
}

/** "2026-10-03" → "3 oct" */
export function fmtShortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

/** Recap cards, built only from what the data supports. */
export function buildHighlights(i: HighlightInput): Highlight[] {
  const out: Highlight[] = []
  if (i.netWorth) {
    const up = i.netWorth.delta >= 0
    out.push({
      emoji: up ? '📈' : '📉',
      title: 'Patrimonio',
      value: `${up ? '+' : ''}${i.formatEuro(i.netWorth.delta, true)}`,
      detail: `${i.formatEuro(i.netWorth.start, true)} → ${i.formatEuro(i.netWorth.end, true)}`,
      tone: up ? 'good' : 'bad',
    })
  }
  if (i.spentVsPrev !== null && Math.abs(i.spentVsPrev) >= 1) {
    const less = i.spentVsPrev < 0
    out.push({
      emoji: less ? '🪙' : '💸',
      title: less ? 'Gastaste menos' : 'Gastaste más',
      value: `${less ? '' : '+'}${i.spentVsPrev.toFixed(0)}%`,
      detail: `vs ${i.prevMonthName}`,
      tone: less ? 'good' : 'bad',
    })
  }
  if (i.biggest) {
    out.push({
      emoji: '🧾',
      title: 'Mayor gasto',
      value: i.formatEuro(Number(i.biggest.amount)),
      detail: `${i.biggest.concept} · ${fmtShortDate(i.biggest.date)}`,
      tone: 'neutral',
    })
  }
  if (i.sleepWeek) {
    out.push({
      emoji: '😴',
      title: 'Tu mejor semana de sueño',
      value: fmtHours(i.sleepWeek.hours),
      detail: `semana del ${fmtShortDate(i.sleepWeek.weekStart)}`,
      tone: 'good',
    })
  }
  if (i.workouts.count > 0) {
    out.push({
      emoji: '💪',
      title: 'Entrenos',
      value: `${i.workouts.count} sesiones`,
      detail: `${Math.round(i.workouts.totalMinutes / 60 * 10) / 10} h en total`,
      tone: 'good',
    })
  }
  if (i.topMerchant && i.topMerchant.count > 1) {
    out.push({
      emoji: '📍',
      title: 'Tu sitio favorito',
      value: i.topMerchant.concept,
      detail: `${i.topMerchant.count} veces · ${i.formatEuro(i.topMerchant.total)}`,
      tone: 'neutral',
    })
  }
  return out
}
