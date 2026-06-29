'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { formatEuro } from '@/lib/utils'
import { MonthSelector } from '@/components/month-selector'
import { ExpenseList } from '@/components/expense-list'
import { AddExpenseForm } from '@/components/add-expense-form'
import { BudgetEditor } from '@/components/budget-editor'
import { VARIABLE_CATEGORIES } from '@/lib/constants'

const supabase = createSupabaseBrowser()

const FIXED: Record<string, number> = { Rent: 766, Fitness: 194 }

function GastosContent() {
  const searchParams = useSearchParams()
  const now = new Date()
  const current = searchParams.get('m') ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [year, month] = current.split('-').map(Number)
  const mm = String(month).padStart(2, '0')
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthStart = `${year}-${mm}-01`
  const monthEnd   = `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`
  const prevM = month === 1 ? 12 : month - 1
  const prevY = month === 1 ? year - 1 : year
  const prevMonthStart = `${prevY}-${String(prevM).padStart(2, '0')}-01`

  const { data: expenses = [] } = useSWR(`expenses-${monthStart}`, async () => {
    const { data } = await supabase.from('expenses')
      .select('id,date,concept,category,account,amount')
      .gte('date', monthStart).lte('date', monthEnd)
      .order('date', { ascending: false }).order('created_at', { ascending: false })
    return data ?? []
  })

  const { data: budgets = [] } = useSWR(`budgets-${monthStart}`, async () => {
    const { data } = await supabase.from('budgets').select('category,amount').eq('month', monthStart)
    return data ?? []
  })

  const { data: prevBudgets = [] } = useSWR(`budgets-${prevMonthStart}`, async () => {
    const { data } = await supabase.from('budgets').select('category,amount').eq('month', prevMonthStart)
    return data ?? []
  })

  const prevMonthEnd = `${prevY}-${String(prevM).padStart(2, '0')}-${String(new Date(prevY, prevM, 0).getDate()).padStart(2, '0')}`
  const { data: prevExpenses = [] } = useSWR(`expenses-${prevMonthStart}`, async () => {
    const { data } = await supabase.from('expenses')
      .select('category,amount')
      .gte('date', prevMonthStart).lte('date', prevMonthEnd)
    return data ?? []
  })

  const { data: accounts = [] } = useSWR('accounts-names', async () => {
    const { data } = await supabase.from('accounts').select('id,name').order('name')
    return data ?? []
  })

  const budgetMap: Record<string, number> = {}
  for (const b of budgets) budgetMap[(b as { category: string; amount: number }).category] = Number((b as { category: string; amount: number }).amount)

  const spendingMap = expenses.reduce<Record<string, number>>((acc, e: { category: string; amount: number }) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
    return acc
  }, {})

  const prevSpendingMap = prevExpenses.reduce<Record<string, number>>((acc, e: { category: string; amount: number }) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
    return acc
  }, {})

  const totalSpent     = expenses.reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0)
  const prevTotalSpent = prevExpenses.reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0)
  const totalBudget    = budgets.reduce((s: number, b: { amount: number }) => s + Number(b.amount), 0)
  const totalMomDiff   = prevTotalSpent > 0 ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100 : null
  const isOver = totalSpent > totalBudget && totalBudget > 0
  const pct    = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0
  const hasPrevBudget = prevBudgets.length > 0

  const unbudgetedCategories = Object.entries(spendingMap)
    .filter(([cat]) => !budgetMap[cat] && !FIXED[cat] && cat)

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-md mx-auto px-4 pt-8 space-y-5">

        <div>
          <p className="text-[10px] text-foreground/30 uppercase tracking-[0.18em] font-medium mb-3">Gastos</p>
          <MonthSelector current={current} />
        </div>

        <div className="rounded-[22px] p-5" style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.13)',
        }}>
          <div className="flex items-baseline gap-3 mb-2">
            <p className="text-[11px] text-foreground/30 uppercase tracking-widest">Gastado</p>
            {totalMomDiff !== null && Math.abs(totalMomDiff) >= 1 && (
              <p className="text-[11px] font-semibold tabular-nums"
                style={{ color: totalMomDiff > 0 ? '#FF9500' : '#BEFF00' }}>
                {totalMomDiff > 0 ? '+' : ''}{totalMomDiff.toFixed(0)}% vs mes anterior
              </p>
            )}
          </div>
          <p className="text-5xl font-black leading-none tracking-tight text-foreground mb-4">{formatEuro(totalSpent)}</p>
          {totalBudget > 0 ? (
            <>
              <div className="h-[3px] rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${pct}%`,
                  background: isOver ? '#FF4444' : pct >= 75 ? '#FF9500' : '#BEFF00',
                }} />
              </div>
              <div className="flex justify-between items-baseline">
                <p className="text-xs" style={{ color: isOver ? '#FF4444' : 'rgba(255,255,255,0.25)' }}>
                  {isOver ? `${formatEuro(totalSpent - totalBudget)} sobre presupuesto` : `Quedan ${formatEuro(totalBudget - totalSpent)}`}
                </p>
                <p className="text-xs text-foreground/25">de {formatEuro(totalBudget)}</p>
              </div>
            </>
          ) : (
            <p className="text-xs text-foreground/25">Sin presupuesto definido para este mes</p>
          )}
        </div>

        <div className="rounded-[18px] p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] text-foreground/30 uppercase tracking-[0.15em]">Por categoría</p>
            <BudgetEditor month={monthStart} budgets={budgets as { category: string; amount: number }[]}
              prevMonth={prevMonthStart} hasPrevBudget={hasPrevBudget} totalBudget={totalBudget} />
          </div>
          {budgets.length === 0 ? (
            <p className="text-sm text-foreground/25 text-center py-4">Define el presupuesto para ver el progreso</p>
          ) : (
            <div className="space-y-3.5">
              {VARIABLE_CATEGORIES.map(category => {
                const budget = budgetMap[category]
                if (!budget) return null
                const spent = spendingMap[category] ?? 0
                const prevSpent = prevSpendingMap[category] ?? 0
                const catPct = Math.min((spent / budget) * 100, 100)
                const isOverCat = spent > budget
                const isWarnCat = catPct >= 75 && !isOverCat
                const barColor = isOverCat ? '#FF4444' : isWarnCat ? '#FF9500' : '#BEFF00'
                const momDiff = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : null
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-foreground/75 truncate">{category}</span>
                        {momDiff !== null && Math.abs(momDiff) >= 5 && (
                          <span className="text-[10px] font-semibold shrink-0 tabular-nums"
                            style={{ color: momDiff > 0 ? '#FF9500' : '#BEFF00' }}>
                            {momDiff > 0 ? '+' : ''}{momDiff.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <span className="text-xs tabular-nums font-medium shrink-0" style={{ color: isOverCat ? '#EF4444' : undefined }}>
                        {formatEuro(spent)} <span className="text-foreground/20">/ {formatEuro(budget)}</span>
                      </span>
                    </div>
                    <div className="h-1 bg-foreground/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${catPct}%`, background: barColor }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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

        <div>
          <p className="text-[10px] text-foreground/30 uppercase tracking-[0.15em] mb-3">
            Transacciones · {expenses.length}
          </p>
          <ExpenseList expenses={expenses} />
        </div>

      </div>

      <AddExpenseForm accounts={accounts as { id: string; name: string }[]} />
    </div>
  )
}

export default function GastosPage() {
  return (
    <Suspense>
      <GastosContent />
    </Suspense>
  )
}
