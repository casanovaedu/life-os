'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteExpense } from '@/lib/actions'
import { formatEuro } from '@/lib/utils'

const NEUTRAL_BADGE = { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.4)' }

type Expense = {
  id: string
  date: string
  concept: string
  category: string
  account: string
  amount: number
}

const DEFAULT_VISIBLE = 5

export function ExpenseList({ expenses: initial }: { expenses: Expense[] }) {
  const [expenses, setExpenses] = useState(initial)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const visible = showAll ? expenses : expenses.slice(0, DEFAULT_VISIBLE)
  const hidden = expenses.length - DEFAULT_VISIBLE

  async function handleDelete(expense: Expense) {
    setDeleting(expense.id)
    setExpenses(prev => prev.filter(e => e.id !== expense.id))
    await deleteExpense(expense.id, expense.account, expense.amount)
    setDeleting(null)
  }

  if (expenses.length === 0) {
    return (
      <p className="text-sm text-foreground/30 text-center py-8">Sin gastos recientes</p>
    )
  }

  return (
  <>
    <div className="rounded-[18px] overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
      {visible.map((expense, idx) => (
        <div key={expense.id} className="flex items-center gap-3 px-4 py-3"
          style={idx > 0 ? { borderTop: '1px solid rgba(255,255,255,0.05)' } : undefined}>
          <div
            className="size-9 rounded-xl flex items-center justify-center shrink-0 text-[13px] font-bold"
            style={{ background: NEUTRAL_BADGE.bg, color: NEUTRAL_BADGE.text }}
          >
            {expense.concept.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white truncate">{expense.concept}</span>
              <span className="text-sm font-bold tabular-nums text-white shrink-0">
                -{formatEuro(Number(expense.amount))}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-foreground/30">
              <span>{expense.date}</span>
              <span>·</span>
              <span className="truncate">{expense.category}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-foreground/20 hover:text-red-400 hover:bg-red-500/10"
            onClick={() => handleDelete(expense)}
            disabled={deleting === expense.id}
            aria-label="Eliminar gasto"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
    {!showAll && hidden > 0 && (
      <button
        onClick={() => setShowAll(true)}
        className="w-full mt-2 py-2.5 text-xs font-semibold text-foreground/40 hover:text-foreground/60 transition-colors"
      >
        Ver {hidden} más
      </button>
    )}
    {showAll && expenses.length > DEFAULT_VISIBLE && (
      <button
        onClick={() => setShowAll(false)}
        className="w-full mt-2 py-2.5 text-xs font-semibold text-foreground/40 hover:text-foreground/60 transition-colors"
      >
        Mostrar menos
      </button>
    )}
  </>
  )
}
