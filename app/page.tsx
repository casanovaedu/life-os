'use client'

import useSWR from 'swr'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { formatEuro } from '@/lib/utils'
import { ExpenseList } from '@/components/expense-list'

const supabase = createSupabaseBrowser()

const FALLBACK_TOTAL_BUDGET = 2002
const GOALS = [
  { label: 'Japón ✈️',         account: 'Japan Fund',  target: 6350, color: '#F97316' },
  { label: 'Fondo emergencia', account: 'Revolut 2%', target: 6000, color: '#10B981' },
]
const TYPE_COLOR: Record<string, string> = {
  cash: '#3B82F6', savings: '#F97316', investment: '#10B981', debt: '#EF4444',
}

function getMonthRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const mm = String(m).padStart(2, '0')
  const days = new Date(y, m, 0).getDate()
  return {
    start: `${y}-${mm}-01`,
    end: `${y}-${mm}-${String(days).padStart(2, '0')}`,
    days,
    day: now.getDate(),
    label: now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
  }
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

  const recentExpenses = monthExpenses.slice(0, 5)
  const netWorth    = accounts.reduce((s: number, a: { balance: number }) => s + Number(a.balance), 0)
  const totalSpent  = monthExpenses.reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0)
  const totalBudget = budgetRows.length > 0
    ? budgetRows.reduce((s: number, b: { amount: number }) => s + Number(b.amount), 0)
    : FALLBACK_TOTAL_BUDGET
  const spentPct = Math.min((totalSpent / totalBudget) * 100, 100)

  const accountsByType = accounts.reduce<Record<string, typeof accounts>>((acc, a: { type: string }) => {
    const t = a.type ?? 'cash'
    acc[t] = [...(acc[t] ?? []), a]
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-md mx-auto px-4 pt-8 space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-foreground/40 uppercase tracking-widest font-medium">Life OS</p>
            <p className="text-xs text-foreground/30 first-letter:capitalize">{range.label}</p>
          </div>
          <div className="size-8 rounded-full flex items-center justify-center text-xs font-bold text-foreground/60"
            style={{ background: 'var(--surface)' }}>E</div>
        </div>

        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className="absolute -top-8 -right-8 size-32 rounded-full opacity-20 blur-2xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }} />
          <p className="text-xs text-foreground/50 uppercase tracking-widest mb-1">Patrimonio neto</p>
          <p className="text-4xl font-black text-foreground">{formatEuro(netWorth, true)}</p>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-foreground/40">Gastado este mes — día {range.day}/{range.days}</span>
              <span className="text-xs font-semibold text-foreground/60">{formatEuro(totalSpent)} / {formatEuro(totalBudget)}</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
              <div className="h-full rounded-full" style={{
                width: `${spentPct}%`,
                background: spentPct >= 100 ? '#EF4444' : spentPct >= 75 ? '#F59E0B' : '#6366F1',
              }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          <div className="px-4 pt-3.5 pb-2">
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-widest">Cuentas</p>
          </div>
          <div className="px-4 pb-3 space-y-1.5">
            {(['cash', 'savings', 'investment', 'debt'] as const).map(type => {
              const group = accountsByType[type]
              if (!group?.length) return null
              const total = group.reduce((s: number, a: { balance: number }) => s + Number(a.balance), 0)
              return (
                <div key={type} className="flex items-center gap-2">
                  <span className="size-2 rounded-full shrink-0" style={{ background: TYPE_COLOR[type] }} />
                  <span className="text-sm text-foreground/60 flex-1 truncate">
                    {group.map((a: { name: string }) => a.name).join(', ')}
                  </span>
                  <span className="text-sm font-bold tabular-nums shrink-0"
                    style={{ color: total < 0 ? '#EF4444' : undefined }}>
                    {formatEuro(total, true)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl p-4 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-widest">Objetivos</p>
          {GOALS.map(goal => {
            const account = accounts.find((a: { name: string }) => a.name === goal.account)
            const saved = account ? Math.max(0, Number((account as { balance: number }).balance)) : 0
            const pct = Math.min((saved / goal.target) * 100, 100)
            return (
              <div key={goal.label}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm font-semibold text-foreground">{goal.label}</span>
                  <span className="text-xs text-foreground/40 tabular-nums">
                    {formatEuro(saved, true)} <span className="text-foreground/20">/ {formatEuro(goal.target, true)}</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
                  <div className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${goal.color}, ${goal.color}99)` }} />
                </div>
                <p className="text-xs text-foreground/25 mt-0.5">{pct.toFixed(0)}% · faltan {formatEuro(goal.target - saved, true)}</p>
              </div>
            )
          })}
        </div>

        <div>
          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3">Últimos gastos</p>
          <ExpenseList expenses={recentExpenses} />
        </div>

      </div>
    </div>
  )
}
