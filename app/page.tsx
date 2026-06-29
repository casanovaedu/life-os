'use client'

import useSWR from 'swr'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { formatEuro } from '@/lib/utils'
import { ExpenseList } from '@/components/expense-list'

const supabase = createSupabaseBrowser()

const INCOME = 3337.50
const FALLBACK_TOTAL_BUDGET = 2002
const GOALS = [
  { label: 'Japón ✈️',         account: 'Japan Fund',  target: 6350 },
  { label: 'Fondo emergencia', account: 'Revolut 2%',  target: 6000 },
]

const GLASS = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.09)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.13)',
} as const

function getMonthRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const mm = String(m).padStart(2, '0')
  const days = new Date(y, m, 0).getDate()
  const threeMonthsAgo = new Date(y, m - 4, 1)
  const ty = threeMonthsAgo.getFullYear()
  const tm = String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')
  return {
    start: `${y}-${mm}-01`,
    end: `${y}-${mm}-${String(days).padStart(2, '0')}`,
    threeMonthsAgoStart: `${ty}-${tm}-01`,
    days,
    day: now.getDate(),
    label: now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
  }
}

function etaLabel(monthsFromNow: number): string {
  if (monthsFromNow <= 0) return 'este mes'
  if (monthsFromNow > 120) return '+10 años'
  const d = new Date()
  d.setMonth(d.getMonth() + Math.ceil(monthsFromNow))
  return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
}

export default function Dashboard() {
  const range = getMonthRange()

  const { data: accounts = [] } = useSWR('accounts', async () => {
    const { data } = await supabase.from('accounts').select('*').order('type')
    return data ?? []
  })

  const { data: monthExpenses = [] } = useSWR(`expenses-month-${range.start}`, async () => {
    const { data } = await supabase.from('expenses').select('id,date,concept,category,account,amount')
      .gte('date', range.start).lte('date', range.end)
      .order('date', { ascending: false }).order('created_at', { ascending: false })
    return data ?? []
  })

  const { data: budgetRows = [] } = useSWR(`budgets-${range.start}`, async () => {
    const { data } = await supabase.from('budgets').select('amount').eq('month', range.start)
    return data ?? []
  })

  // 3-month average spending to estimate savings rate
  const { data: recentExpenses3m = [] } = useSWR(`expenses-3m-${range.threeMonthsAgoStart}`, async () => {
    const { data } = await supabase.from('expenses').select('amount,date')
      .gte('date', range.threeMonthsAgoStart).lt('date', range.start)
    return data ?? []
  })

  const recentExpenses = monthExpenses.slice(0, 5)
  const netWorth    = accounts.reduce((s: number, a: { balance: number }) => s + Number(a.balance), 0)
  const totalAssets = accounts.filter((a: { balance: number }) => Number(a.balance) > 0).reduce((s: number, a: { balance: number }) => s + Number(a.balance), 0)
  const totalDebt   = accounts.filter((a: { balance: number }) => Number(a.balance) < 0).reduce((s: number, a: { balance: number }) => s + Number(a.balance), 0)
  const totalSpent  = monthExpenses.reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0)
  const totalBudget = budgetRows.length > 0
    ? budgetRows.reduce((s: number, b: { amount: number }) => s + Number(b.amount), 0)
    : FALLBACK_TOTAL_BUDGET
  const spentPct = Math.min((totalSpent / totalBudget) * 100, 100)

  // Estimate monthly savings from last 3 months
  const avg3mSpend = recentExpenses3m.length > 0
    ? recentExpenses3m.reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0) / 3
    : totalBudget
  const monthlySavings = Math.max(0, INCOME - avg3mSpend)

  const accountsByType = accounts.reduce<Record<string, typeof accounts>>((acc, a: { type: string }) => {
    const t = a.type ?? 'cash'
    acc[t] = [...(acc[t] ?? []), a]
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-md mx-auto px-4 pt-10 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] text-foreground/30 uppercase tracking-[0.18em] font-medium">Life OS</p>
            <p className="text-[11px] text-foreground/25 first-letter:capitalize">{range.label}</p>
          </div>
          <div className="size-8 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>E</div>
        </div>

        {/* Net worth hero */}
        <div className="rounded-[22px] p-5" style={GLASS}>
          <p className="text-[11px] text-foreground/35 uppercase tracking-[0.15em] mb-2">Patrimonio neto</p>
          <p className="text-5xl font-black leading-none tracking-tight text-foreground">{formatEuro(netWorth, true)}</p>
          <div className="mt-4 flex items-center gap-5">
            <div>
              <p className="text-[11px] text-foreground/30 mb-0.5 uppercase tracking-wider">Activos</p>
              <p className="text-sm font-bold" style={{ color: '#BEFF00' }}>{formatEuro(totalAssets, true)}</p>
            </div>
            <div className="h-5 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div>
              <p className="text-[11px] text-foreground/30 mb-0.5 uppercase tracking-wider">Deudas</p>
              <p className="text-sm font-bold text-red-400">{formatEuro(Math.abs(totalDebt), true)}</p>
            </div>
            <div className="h-5 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div>
              <p className="text-[11px] text-foreground/30 mb-0.5 uppercase tracking-wider">Mes</p>
              <p className="text-sm font-bold text-foreground/60">{formatEuro(totalSpent)}</p>
            </div>
          </div>

          {/* Monthly budget bar */}
          <div className="mt-4">
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${spentPct}%`,
                background: spentPct >= 100 ? '#FF4444' : spentPct >= 75 ? '#FF9500' : '#BEFF00',
              }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-foreground/25">día {range.day}/{range.days}</span>
              <span className="text-[11px] text-foreground/25">{formatEuro(totalSpent)} / {formatEuro(totalBudget)}</span>
            </div>
          </div>
        </div>

        {/* Accounts summary */}
        <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          <p className="text-[11px] text-foreground/30 uppercase tracking-[0.15em] px-4 pt-4 pb-2">Cuentas</p>
          <div className="px-4 pb-3 space-y-2">
            {(['cash', 'savings', 'investment', 'debt'] as const).map(type => {
              const group = accountsByType[type]
              if (!group?.length) return null
              const total = group.reduce((s: number, a: { balance: number }) => s + Number(a.balance), 0)
              const labels: Record<string, string> = { cash: 'Efectivo', savings: 'Ahorro', investment: 'Inversión', debt: 'Deuda' }
              return (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-[11px] text-foreground/35 w-16 shrink-0">{labels[type]}</span>
                  <span className="text-[11px] text-foreground/25 flex-1 truncate">
                    {group.map((a: { name: string }) => a.name).join(', ')}
                  </span>
                  <span className="text-[13px] font-bold tabular-nums shrink-0"
                    style={{ color: total < 0 ? '#FF4444' : 'rgba(255,255,255,0.85)' }}>
                    {formatEuro(total, true)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Goals with ETA */}
        <div className="rounded-[18px] p-4 space-y-5" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-foreground/30 uppercase tracking-[0.15em]">Objetivos</p>
            {monthlySavings > 0 && (
              <p className="text-[11px] text-foreground/20">ahorro est. {formatEuro(monthlySavings)}/mes</p>
            )}
          </div>
          {GOALS.map(goal => {
            const account = accounts.find((a: { name: string }) => a.name === goal.account)
            const saved = account ? Math.max(0, Number((account as { balance: number }).balance)) : 0
            const remaining = goal.target - saved
            const pct = Math.min((saved / goal.target) * 100, 100)
            const monthsToGo = monthlySavings > 0 ? remaining / monthlySavings : null
            return (
              <div key={goal.label}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">{goal.label}</span>
                  <span className="text-[11px] tabular-nums" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {formatEuro(saved, true)} <span style={{ color: 'rgba(255,255,255,0.15)' }}>/ {formatEuro(goal.target, true)}</span>
                  </span>
                </div>
                <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#BEFF00' }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {pct.toFixed(0)}% · faltan {formatEuro(remaining, true)}
                  </p>
                  {monthsToGo !== null && remaining > 0 && (
                    <p className="text-[11px] font-medium" style={{ color: '#BEFF00', opacity: 0.7 }}>
                      → {etaLabel(monthsToGo)}
                    </p>
                  )}
                  {remaining <= 0 && (
                    <p className="text-[11px] font-medium" style={{ color: '#BEFF00' }}>✓ Alcanzado</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent expenses */}
        <div>
          <p className="text-[11px] text-foreground/30 uppercase tracking-[0.15em] mb-3">Últimos gastos</p>
          <ExpenseList expenses={recentExpenses} />
        </div>

      </div>
    </div>
  )
}
