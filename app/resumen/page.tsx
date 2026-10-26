'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { formatEuro } from '@/lib/utils'
import { MonthSelector } from '@/components/month-selector'
import { ResumenTrendChart } from '@/components/resumen-trend-chart'
import {
  defaultReviewMonth, shiftMonth, monthBounds, monthLabel, elapsedDays, pctChange,
  sumAmounts, categoryBreakdown, topMerchants, biggestExpense, monthlyAverage, netWorthChange,
  healthSummary, bestSleepWeek, healthTrend, workoutSummary, buildHighlights, fmtHours, fmtShortDate,
  type ExpenseRow, type BudgetRow, type SnapshotRow, type HealthRow, type WorkoutRow,
} from '@/lib/resumen'

const supabase = createSupabaseBrowser()

const GLASS = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.09)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.13)',
} as const

const SURFACE = { background: 'var(--surface)', border: '1px solid var(--surface-border)' } as const

const TONE_COLOR = { good: '#BEFF00', bad: '#FF9500', neutral: 'rgba(255,255,255,0.9)' } as const

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-foreground/30 uppercase tracking-[0.15em] mb-3">{children}</p>
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl p-3" style={SURFACE}>
      <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg font-bold text-foreground tabular-nums leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-foreground/25 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-foreground/25 text-center py-4">{children}</p>
}

function DeltaBadge({ pct, label }: { pct: number | null; label: string }) {
  if (pct === null) return <span className="text-[11px] text-foreground/20">— {label}</span>
  return (
    <span className="text-[11px] font-semibold tabular-nums" style={{ color: pct > 0 ? '#FF9500' : '#BEFF00' }}>
      {pct > 0 ? '+' : ''}{pct.toFixed(0)}% {label}
    </span>
  )
}

function ResumenContent() {
  const searchParams = useSearchParams()
  const current = searchParams.get('m') ?? defaultReviewMonth()
  const { start, end } = monthBounds(current)
  const prev = shiftMonth(current, -1)
  const prev3 = [shiftMonth(current, -3), shiftMonth(current, -2), prev]
  const historyStart = monthBounds(prev3[0]).start
  const snapshotFrom = monthBounds(prev).start
  const daysElapsed = elapsedDays(current)

  // Current month + previous 3 months in one query
  const { data: expenseRows = [] } = useSWR(`resumen-expenses-${current}`, async () => {
    const { data } = await supabase.from('expenses').select('id,date,concept,category,amount')
      .gte('date', historyStart).lte('date', end)
    return (data ?? []) as ExpenseRow[]
  })

  const { data: budgets = [] } = useSWR(`resumen-budgets-${start}`, async () => {
    const { data } = await supabase.from('budgets').select('category,amount').eq('month', start)
    return (data ?? []) as BudgetRow[]
  })

  const { data: snapshots = [] } = useSWR(`resumen-nw-${current}`, async () => {
    const { data } = await supabase.from('net_worth_snapshots').select('date,net_worth')
      .gte('date', snapshotFrom).lte('date', end).order('date', { ascending: true })
    return (data ?? []) as SnapshotRow[]
  })

  const { data: health = [] } = useSWR(`resumen-health-${current}`, async () => {
    const { data } = await supabase.from('health_metrics')
      .select('date,hrv,resting_hr,steps,sleep_total_hour,sleep_score')
      .gte('date', start).lte('date', end).order('date', { ascending: true })
    return (data ?? []) as HealthRow[]
  })

  const { data: workouts = [] } = useSWR(`resumen-workouts-${current}`, async () => {
    const { data } = await supabase.from('workouts').select('date,type,duration_min')
      .neq('source', 'garmin_pending').gte('date', start).lte('date', end)
    return (data ?? []) as WorkoutRow[]
  })

  // ── Dinero
  const expenses = expenseRows.filter(e => e.date >= start && e.date <= end)
  const prevExpenses = expenseRows.filter(e => e.date.startsWith(prev))
  const totalSpent = sumAmounts(expenses)
  const totalBudget = sumAmounts(budgets)
  const prevSpent = sumAmounts(prevExpenses)
  const vsPrev = pctChange(totalSpent, prevExpenses.length ? prevSpent : null)
  const avg3 = monthlyAverage(expenseRows, prev3)
  const vsAvg3 = pctChange(totalSpent, avg3)
  const categories = categoryBreakdown(expenses, budgets)
  const merchants = topMerchants(expenses)
  const biggest = biggestExpense(expenses)
  const avgTicket = expenses.length ? totalSpent / expenses.length : null
  const netWorth = netWorthChange(snapshots, current)
  const budgetPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0
  const overBudget = totalBudget > 0 && totalSpent > totalBudget

  // ── Salud
  const hs = healthSummary(health)
  const sleepWeek = bestSleepWeek(health)
  const trend = healthTrend(health)

  // ── Entrenos
  const ws = workoutSummary(workouts, daysElapsed)

  const highlights = buildHighlights({
    biggest, netWorth, sleepWeek,
    spentVsPrev: vsPrev,
    prevMonthName: monthLabel(prev),
    topMerchant: merchants[0] ?? null,
    workouts: ws,
    formatEuro,
  })

  const monthName = monthLabel(current)
  const isEmpty = expenses.length === 0 && health.length === 0 && workouts.length === 0

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-md mx-auto px-4 pt-8 space-y-5">

        <div>
          <p className="text-[10px] text-foreground/30 uppercase tracking-[0.18em] font-medium mb-3">Resumen del mes</p>
          <MonthSelector current={current} basePath="/resumen" />
        </div>

        {/* Highlights */}
        {isEmpty ? (
          <div className="rounded-[22px] p-6 text-center" style={GLASS}>
            <p className="text-2xl mb-2">🗓️</p>
            <p className="text-sm text-foreground/60">Sin datos para {monthName}</p>
            <p className="text-xs text-foreground/25 mt-1">Cuando haya gastos, métricas o entrenos, aquí verás tu resumen.</p>
          </div>
        ) : highlights.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            {highlights.map((h, i) => (
              <div key={h.title} className={`rounded-[20px] p-4 ${i === 0 && highlights.length % 2 === 1 ? 'col-span-2' : ''}`} style={GLASS}>
                <p className="text-lg leading-none mb-2">{h.emoji}</p>
                <p className="text-[10px] text-foreground/35 uppercase tracking-wider mb-1">{h.title}</p>
                <p className="text-xl font-black tracking-tight leading-tight truncate" style={{ color: TONE_COLOR[h.tone] }}>{h.value}</p>
                {h.detail && <p className="text-[11px] text-foreground/30 mt-1 truncate">{h.detail}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ── Dinero ───────────────────────────── */}
        <section>
          <SectionTitle>Dinero</SectionTitle>
          <div className="space-y-2.5">
            <div className="rounded-[22px] p-5" style={GLASS}>
              <p className="text-[11px] text-foreground/30 uppercase tracking-widest mb-2">Gastado</p>
              <p className="text-5xl font-black leading-none tracking-tight text-foreground mb-3">{formatEuro(totalSpent)}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                <DeltaBadge pct={vsPrev} label={`vs ${monthLabel(prev)}`} />
                <DeltaBadge pct={vsAvg3} label="vs media 3 meses" />
              </div>
              {totalBudget > 0 ? (
                <>
                  <div className="h-[3px] rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${budgetPct}%`,
                      background: overBudget ? '#FF4444' : budgetPct >= 75 ? '#FF9500' : '#BEFF00',
                    }} />
                  </div>
                  <div className="flex justify-between items-baseline">
                    <p className="text-xs" style={{ color: overBudget ? '#FF4444' : 'rgba(255,255,255,0.25)' }}>
                      {overBudget ? `${formatEuro(totalSpent - totalBudget)} sobre presupuesto` : `${daysElapsed < monthBounds(current).days ? 'Quedan' : 'Sobraron'} ${formatEuro(totalBudget - totalSpent)}`}
                    </p>
                    <p className="text-xs text-foreground/25">de {formatEuro(totalBudget)}</p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-foreground/25">Sin presupuesto definido para este mes</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Stat label="Gastos" value={String(expenses.length)} />
              <Stat label="Ticket medio" value={avgTicket !== null ? formatEuro(avgTicket) : '—'} />
              <Stat label="Media 3m" value={avg3 !== null ? formatEuro(avg3, true) : '—'} />
            </div>

            <div className="rounded-[18px] p-4" style={SURFACE}>
              <p className="text-[10px] text-foreground/30 uppercase tracking-[0.15em] mb-3">Patrimonio</p>
              {netWorth ? (
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-foreground/30">{fmtShortDate(netWorth.startDate)} → {fmtShortDate(netWorth.endDate)}</p>
                    <p className="text-sm text-foreground/60 tabular-nums mt-0.5">
                      {formatEuro(netWorth.start, true)} <span className="text-foreground/25">→</span> <span className="text-foreground font-bold">{formatEuro(netWorth.end, true)}</span>
                    </p>
                  </div>
                  <p className="text-xl font-black tabular-nums" style={{ color: netWorth.delta >= 0 ? '#BEFF00' : '#FF4444' }}>
                    {netWorth.delta >= 0 ? '+' : ''}{formatEuro(netWorth.delta, true)}
                  </p>
                </div>
              ) : (
                <Empty>Sin snapshots de patrimonio este mes</Empty>
              )}
            </div>

            <div className="rounded-[18px] p-4" style={SURFACE}>
              <p className="text-[10px] text-foreground/30 uppercase tracking-[0.15em] mb-4">Por categoría</p>
              {categories.length === 0 ? <Empty>Sin gastos este mes</Empty> : (
                <div className="space-y-3.5">
                  {categories.map(c => {
                    const pct = c.budget ? Math.min((c.spent / c.budget) * 100, 100) : 0
                    const over = c.budget !== null && c.spent > c.budget
                    const color = over ? '#FF4444' : pct >= 75 ? '#FF9500' : '#BEFF00'
                    return (
                      <div key={c.category}>
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <span className="text-sm text-foreground/75 truncate">{c.category}</span>
                          <span className="text-xs tabular-nums font-medium shrink-0" style={{ color: over ? '#EF4444' : undefined }}>
                            {formatEuro(c.spent)}
                            {c.budget !== null
                              ? <span className="text-foreground/20"> / {formatEuro(c.budget)}</span>
                              : <span className="text-foreground/20"> · sin presupuesto</span>}
                          </span>
                        </div>
                        {c.budget !== null && (
                          <div className="h-1 bg-foreground/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="rounded-[18px] p-4" style={SURFACE}>
              <p className="text-[10px] text-foreground/30 uppercase tracking-[0.15em] mb-3">Top comercios</p>
              {merchants.length === 0 ? <Empty>Sin gastos este mes</Empty> : (
                <div className="space-y-2.5">
                  {merchants.map((m, i) => (
                    <div key={m.concept} className="flex items-center gap-3">
                      <span className="text-[11px] font-bold w-4 text-foreground/25 tabular-nums">{i + 1}</span>
                      <span className="text-sm text-foreground/75 flex-1 truncate">{m.concept}</span>
                      <span className="text-[11px] text-foreground/25 shrink-0">×{m.count}</span>
                      <span className="text-sm font-bold tabular-nums shrink-0">{formatEuro(m.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              {biggest && (
                <div className="mt-4 pt-3 border-t border-foreground/5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] text-foreground/30 uppercase tracking-wider">Mayor gasto</p>
                    <p className="text-sm text-foreground/75 truncate">{biggest.concept} <span className="text-foreground/25">· {biggest.category} · {fmtShortDate(biggest.date)}</span></p>
                  </div>
                  <p className="text-sm font-bold tabular-nums shrink-0">{formatEuro(Number(biggest.amount))}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Salud ────────────────────────────── */}
        <section>
          <SectionTitle>Salud</SectionTitle>
          {hs.days === 0 ? (
            <div className="rounded-[18px] p-4" style={SURFACE}><Empty>Sin métricas de Garmin este mes</Empty></div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Sueño medio" value={hs.sleepHours !== null ? fmtHours(hs.sleepHours) : '—'}
                  sub={hs.sleepScore !== null ? `puntuación ${Math.round(hs.sleepScore)}` : undefined} />
                <Stat label="HRV media" value={hs.hrv !== null ? `${Math.round(hs.hrv)} ms` : '—'}
                  sub={hs.restingHr !== null ? `FC reposo ${Math.round(hs.restingHr)} bpm` : undefined} />
                <Stat label="Pasos totales" value={hs.totalSteps > 0 ? hs.totalSteps.toLocaleString('es-ES') : '—'}
                  sub={hs.avgSteps !== null ? `${Math.round(hs.avgSteps).toLocaleString('es-ES')} / día` : undefined} />
                <Stat label="Días con datos" value={`${hs.days}`} sub={`de ${daysElapsed || monthBounds(current).days}`} />
              </div>

              {(hs.bestNight || hs.worstNight) && (
                <div className="rounded-[18px] p-4 grid grid-cols-2 gap-3" style={SURFACE}>
                  {hs.bestNight && (
                    <div>
                      <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-1">Mejor noche</p>
                      <p className="text-base font-bold" style={{ color: '#BEFF00' }}>{fmtHours(hs.bestNight.hours)}</p>
                      <p className="text-[11px] text-foreground/25">{fmtShortDate(hs.bestNight.date)}</p>
                    </div>
                  )}
                  {hs.worstNight && (
                    <div>
                      <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-1">Peor noche</p>
                      <p className="text-base font-bold" style={{ color: '#FF9500' }}>{fmtHours(hs.worstNight.hours)}</p>
                      <p className="text-[11px] text-foreground/25">{fmtShortDate(hs.worstNight.date)}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-[18px] p-4" style={SURFACE}>
                <p className="text-[10px] text-foreground/30 uppercase tracking-[0.15em] mb-3">Tendencia</p>
                <ResumenTrendChart data={trend} />
              </div>
            </div>
          )}
        </section>

        {/* ── Entrenos ─────────────────────────── */}
        <section>
          <SectionTitle>Entrenos</SectionTitle>
          {ws.count === 0 ? (
            <div className="rounded-[18px] p-4" style={SURFACE}><Empty>Sin entrenos registrados este mes</Empty></div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Sesiones" value={String(ws.count)} />
                <Stat label="Minutos" value={ws.totalMinutes.toLocaleString('es-ES')} />
                <Stat label="Días" value={`${ws.trainingDays}`} sub={`${ws.restDays} de descanso`} />
              </div>

              <div className="rounded-[18px] p-4" style={SURFACE}>
                <p className="text-[10px] text-foreground/30 uppercase tracking-[0.15em] mb-3">Por tipo</p>
                <div className="space-y-2.5">
                  {ws.byType.map(t => (
                    <div key={t.type}>
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <span className="text-sm text-foreground/75 truncate capitalize">{t.type}</span>
                        <span className="text-xs tabular-nums shrink-0 text-foreground/40">
                          {t.count}× <span className="text-foreground/20">· {t.minutes} min</span>
                        </span>
                      </div>
                      <div className="h-1 bg-foreground/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(t.count / ws.count) * 100}%`, background: '#BEFF00' }} />
                      </div>
                    </div>
                  ))}
                </div>
                {ws.longest && (
                  <div className="mt-4 pt-3 border-t border-foreground/5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] text-foreground/30 uppercase tracking-wider">Sesión más larga</p>
                      <p className="text-sm text-foreground/75 truncate capitalize">{ws.longest.type} <span className="text-foreground/25 normal-case">· {fmtShortDate(ws.longest.date)}</span></p>
                    </div>
                    <p className="text-sm font-bold tabular-nums shrink-0">{ws.longest.duration_min} min</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

export default function ResumenPage() {
  return (
    <Suspense>
      <ResumenContent />
    </Suspense>
  )
}
