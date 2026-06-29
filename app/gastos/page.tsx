import { supabase } from '@/lib/supabase'
import { formatEuro } from '@/lib/utils'
import { MonthSelector } from '@/components/month-selector'
import { ExpenseList } from '@/components/expense-list'
import { AddExpenseForm } from '@/components/add-expense-form'
import { BudgetEditor } from '@/components/budget-editor'
import { VARIABLE_CATEGORIES } from '@/lib/constants'

// Fixed expenses — auto-paid, not tracked in budgets table
const FIXED: Record<string, number> = {
  Rent: 766,
  Fitness: 194,      // Classpass + Wellhub (shown only if not already in DB)
}

export const dynamic = 'force-dynamic'

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>
}) {
  const { m } = await searchParams
  const now = new Date()
  const current = m ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [year, month] = current.split('-').map(Number)

  // Build date strings directly to avoid UTC offset shifting the day
  const mm            = String(month).padStart(2, '0')
  const daysInMonth   = new Date(year, month, 0).getDate()
  const monthStart    = `${year}-${mm}-01`
  const monthEnd      = `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`
  const prevM         = month === 1 ? 12 : month - 1
  const prevY         = month === 1 ? year - 1 : year
  const prevMonthStart = `${prevY}-${String(prevM).padStart(2, '0')}-01`

  const [expensesRes, budgetsRes, prevBudgetsRes, accountsRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, date, concept, category, account, amount')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('budgets').select('category, amount').eq('month', monthStart),
    supabase.from('budgets').select('category, amount').eq('month', prevMonthStart),
    supabase.from('accounts').select('id, name').order('name'),
  ])

  const expenses       = expensesRes.data ?? []
  const budgets        = budgetsRes.data ?? []
  const accounts       = accountsRes.data ?? []
  const hasPrevBudget  = (prevBudgetsRes.data?.length ?? 0) > 0

  // Build budget map (DB variable + hardcoded fixed)
  const budgetMap: Record<string, number> = {}
  for (const b of budgets) budgetMap[b.category] = Number(b.amount)

  // Spending per category
  const spendingMap = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
    return acc
  }, {})

  const totalSpent  = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0)
  const isOver      = totalSpent > totalBudget && totalBudget > 0
  const pct         = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

  // Categories that have spending but no budget line
  const unbudgetedCategories = Object.entries(spendingMap)
    .filter(([cat]) => !budgetMap[cat] && !FIXED[cat] && cat)

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-md mx-auto px-4 pt-8 space-y-5">

        {/* Header + Month nav */}
        <div>
          <p className="text-xs text-foreground/40 uppercase tracking-widest font-medium mb-3">Gastos</p>
          <MonthSelector current={current} />
        </div>

        {/* Totals gauge */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
        >
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs text-foreground/40 mb-1">Gastado</p>
              <p className="text-3xl font-black text-foreground">{formatEuro(totalSpent)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-foreground/40 mb-1">Presupuesto</p>
              <p className="text-lg font-bold text-foreground/50">
                {totalBudget > 0 ? formatEuro(totalBudget) : '—'}
              </p>
            </div>
          </div>
          {totalBudget > 0 ? (
            <>
              <div className="h-2 bg-foreground/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: isOver
                      ? '#EF4444'
                      : pct >= 75
                      ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                      : 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                  }}
                />
              </div>
              <p className="text-xs text-foreground/30 mt-2">
                {isOver
                  ? `${formatEuro(totalSpent - totalBudget)} sobre presupuesto`
                  : `Quedan ${formatEuro(totalBudget - totalSpent)}`}
              </p>
            </>
          ) : (
            <p className="text-xs text-foreground/25">Sin presupuesto definido para este mes</p>
          )}
        </div>

        {/* Budget breakdown */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-widest">
              Por categoría
            </p>
            <BudgetEditor
              month={monthStart}
              budgets={budgets}
              prevMonth={prevMonthStart}
              hasPrevBudget={hasPrevBudget}
              totalBudget={totalBudget}
            />
          </div>

          {budgets.length === 0 ? (
            <p className="text-sm text-foreground/25 text-center py-4">
              Define el presupuesto para ver el progreso por categoría
            </p>
          ) : (
            <div className="space-y-3.5">
              {VARIABLE_CATEGORIES.map(category => {
                const budget = budgetMap[category]
                if (!budget) return null
                const spent   = spendingMap[category] ?? 0
                const catPct  = Math.min((spent / budget) * 100, 100)
                const isOverCat  = spent > budget
                const isWarnCat  = catPct >= 75 && !isOverCat
                const barColor   = isOverCat ? '#EF4444' : isWarnCat ? '#F59E0B' : '#6366F1'
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-foreground/75">{category}</span>
                      <span
                        className="text-xs tabular-nums font-medium"
                        style={{ color: isOverCat ? '#EF4444' : undefined }}
                      >
                        {formatEuro(spent)}{' '}
                        <span className="text-foreground/20">/ {formatEuro(budget)}</span>
                      </span>
                    </div>
                    <div className="h-1 bg-foreground/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${catPct}%`, background: barColor }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Unbudgeted categories with spending */}
          {unbudgetedCategories.length > 0 && (
            <div className="mt-4 pt-3 border-t border-foreground/5 space-y-1">
              <p className="text-xs text-foreground/25 mb-2">Sin categoría de presupuesto</p>
              {unbudgetedCategories.map(([cat, spent]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm text-foreground/40">{cat}</span>
                  <span className="text-xs text-foreground/35 tabular-nums">{formatEuro(spent)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transactions */}
        <div>
          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3">
            Transacciones · {expenses.length}
          </p>
          <ExpenseList expenses={expenses} />
        </div>

      </div>

      <AddExpenseForm accounts={accounts} />
    </div>
  )
}
