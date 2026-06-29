'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteExpense } from '@/lib/actions'
import { formatEuro } from '@/lib/utils'

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Supermarket':       { bg: 'rgba(34,197,94,0.15)',   text: '#4ade80' },
  'Restaurante / Bar': { bg: 'rgba(239,68,68,0.15)',   text: '#f87171' },
  'Compras':           { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24' },
  'Transporte':        { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa' },
  'Ocio':              { bg: 'rgba(168,85,247,0.15)',  text: '#c084fc' },
  'Health':            { bg: 'rgba(236,72,153,0.15)',  text: '#f472b6' },
  'Vet':               { bg: 'rgba(20,184,166,0.15)',  text: '#2dd4bf' },
  'Varios':            { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c' },
  'Fitness':           { bg: 'rgba(99,102,241,0.15)',  text: '#818cf8' },
  'Rent':              { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8' },
  'Subscriptions':     { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8' },
  'Lifestyle':         { bg: 'rgba(148,163,184,0.10)', text: '#64748b' },
}

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
    <div className="rounded-2xl overflow-hidden divide-y divide-foreground/5"
      style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
      {visible.map(expense => (
        <div key={expense.id} className="flex items-center gap-3 px-4 py-3">
          <div
            className="size-9 rounded-2xl flex items-center justify-center shrink-0 text-sm font-bold"
            style={{
              background: (CATEGORY_COLORS[expense.category] ?? { bg: 'rgba(255,255,255,0.06)' }).bg,
              color: (CATEGORY_COLORS[expense.category] ?? { text: 'rgba(255,255,255,0.5)' }).text,
            }}
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
