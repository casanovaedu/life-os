import { supabase } from '@/lib/supabase'
import { formatEuro } from '@/lib/utils'
import { ExpenseList } from '@/components/expense-list'

const FALLBACK_TOTAL_BUDGET = 2002

const GOALS = [
  { label: 'Japón ✈️',         account: 'Japan Fund',  target: 6350, color: '#F97316' },
  { label: 'Fondo emergencia', account: 'Revolut 2%', target: 6000, color: '#10B981' },
]

const TYPE_COLOR: Record<string, string> = {
  cash: '#3B82F6', savings: '#F97316', investment: '#10B981', debt: '#EF4444',
}

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const mm = String(month).padStart(2, '0')
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthStart = `${year}-${mm}-01`
  const monthEnd   = `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`

  const [accountsRes, monthExpensesRes, recentExpensesRes, budgetsRes] = await Promise.all([
    supabase.from('accounts').select('*').order('type'),
    supabase.from('expenses').select('amount').gte('date', monthStart).lte('date', monthEnd),
    supabase
      .from('expenses')
      .select('id, date, concept, category, account, amount')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('budgets').select('amount').eq('month', monthStart),
  ])

  const accounts       = accountsRes.data ?? []
  const monthExpenses  = monthExpensesRes.data ?? []
  const recentExpenses = recentExpensesRes.data ?? []
  const budgetRows     = budgetsRes.data ?? []

  const netWorth    = accounts.reduce((s, a) => s + Number(a.balance), 0)
  const totalSpent  = monthExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalBudget = budgetRows.length > 0
    ? budgetRows.reduce((s, b) => s + Number(b.amount), 0)
    : FALLBACK_TOTAL_BUDGET
  const spentPct    = Math.min((totalSpent / totalBudget) * 100, 100)

  const accountsByType = accounts.reduce<Record<string, typeof accounts>>((acc, a) => {
    const t = a.type ?? 'cash'
    acc[t] = [...(acc[t] ?? []), a]
    return acc
  }, {})

  const monthLabel = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const dayOfMonth = now.getDate()

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-md mx-auto px-4 pt-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-foreground/40 uppercase tracking-widest font-medium">Life OS</p>
            <p className="text-xs text-foreground/30 first-letter:capitalize">{monthLabel}</p>
          </div>
          <div className="size-8 rounded-full flex items-center justify-center text-xs font-bold text-foreground/60"
            style={{ background: 'var(--surface)' }}>
            E
          </div>
        </div>

        {/* Net Worth Hero */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <div
            className="absolute -top-8 -right-8 size-32 rounded-full opacity-20 blur-2xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }}
          />
          <p className="text-xs text-foreground/50 uppercase tracking-widest mb-1">Patrimonio neto</p>
          <p className="text-4xl font-black text-foreground">{formatEuro(netWorth, true)}</p>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-foreground/40">
                Gastado este mes — día {dayOfMonth}/{daysInMonth}
              </span>
              <span className="text-xs font-semibold text-foreground/60">
                {formatEuro(totalSpent)} / {formatEuro(totalBudget)}
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${spentPct}%`,
                  background: spentPct >= 100 ? '#EF4444' : spentPct >= 75 ? '#F59E0B' : '#6366F1',
                }}
              />
            </div>
          </div>
        </div>

        {/* Accounts compact */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
        >
          <div className="px-4 pt-3.5 pb-2">
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-widest">Cuentas</p>
          </div>
          <div className="px-4 pb-3 space-y-1.5">
            {(['cash', 'savings', 'investment', 'debt'] as const).map(type => {
              const group = accountsByType[type]
              if (!group?.length) return null
              const total = group.reduce((s, a) => s + Number(a.balance), 0)
              return (
                <div key={type} className="flex items-center gap-2">
                  <span className="size-2 rounded-full shrink-0" style={{ background: TYPE_COLOR[type] }} />
                  <span className="text-sm text-foreground/60 flex-1 truncate">
                    {group.map(a => a.name).join(', ')}
                  </span>
                  <span
                    className="text-sm font-bold tabular-nums shrink-0"
                    style={{ color: total < 0 ? '#EF4444' : undefined }}
                  >
                    {formatEuro(total, true)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Goals */}
        <div
          className="rounded-2xl p-4 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
        >
          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-widest">Objetivos</p>
          {GOALS.map(goal => {
            const account = accounts.find(a => a.name === goal.account)
            const saved = account ? Math.max(0, Number(account.balance)) : 0
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
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${goal.color}, ${goal.color}99)` }}
                  />
                </div>
                <p className="text-xs text-foreground/25 mt-0.5">{pct.toFixed(0)}% · faltan {formatEuro(goal.target - saved, true)}</p>
              </div>
            )
          })}
        </div>

        {/* Recent Expenses */}
        <div>
          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3">Últimos gastos</p>
          <ExpenseList expenses={recentExpenses} />
        </div>

      </div>
    </div>
  )
}
