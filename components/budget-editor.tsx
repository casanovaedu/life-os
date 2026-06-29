'use client'

import { useState, useTransition, useRef } from 'react'
import { SlidersHorizontal, X, Copy, Check } from 'lucide-react'
import { upsertBudget, copyBudgetFromMonth } from '@/lib/actions'
import { formatEuro } from '@/lib/utils'
import { VARIABLE_CATEGORIES } from '@/lib/constants'

type Budget = { category: string; amount: number }

type Props = {
  month: string        // '2026-06-01'
  budgets: Budget[]
  prevMonth: string    // '2026-05-01'
  hasPrevBudget: boolean
  totalBudget: number
}

export function BudgetEditor({ month, budgets, prevMonth, hasPrevBudget, totalBudget }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  // Local state for amounts (keyed by category)
  const budgetMap = Object.fromEntries(budgets.map(b => [b.category, b.amount]))
  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(VARIABLE_CATEGORIES.map(c => [c, String(budgetMap[c] ?? 0)]))
  )

  function handleChange(category: string, value: string) {
    setAmounts(prev => ({ ...prev, [category]: value }))
    setSaved(prev => ({ ...prev, [category]: false }))
  }

  function handleBlur(category: string) {
    const amount = parseFloat(amounts[category] ?? '0') || 0
    startTransition(async () => {
      await upsertBudget(month, category, amount)
      setSaved(prev => ({ ...prev, [category]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [category]: false })), 1500)
    })
  }

  function handleCopy() {
    startTransition(async () => {
      await copyBudgetFromMonth(prevMonth, month)
      setCopied(true)
      setTimeout(() => { setCopied(false); setOpen(false) }, 1200)
    })
  }

  const isEmpty = budgets.length === 0
  const monthLabel = new Date(month + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all"
        style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}
      >
        <SlidersHorizontal className="size-3.5 text-indigo-400" />
        <span className="text-xs font-semibold text-indigo-300">
          {isEmpty ? 'Definir presupuesto' : 'Editar'}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div
            className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-3xl"
            style={{ background: 'var(--background)', border: '1px solid var(--surface-border)' }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3"
              style={{ background: 'var(--background)' }}>
              <div>
                <h3 className="text-base font-bold text-foreground">Presupuesto</h3>
                <p className="text-xs text-foreground/40 capitalize">{monthLabel}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-foreground/40 hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            {/* Copy from previous month */}
            {hasPrevBudget && (
              <div className="px-5 pb-3">
                <button
                  onClick={handleCopy}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: copied ? 'rgba(16,185,129,0.15)' : 'var(--surface)',
                    border: copied ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--surface-border)',
                    color: copied ? '#34D399' : undefined,
                  }}
                >
                  {copied
                    ? <><Check className="size-4" /> Copiado</>
                    : <><Copy className="size-4" /> Copiar presupuesto del mes anterior</>}
                </button>
              </div>
            )}

            {/* Category rows */}
            <div className="px-5 pb-10 space-y-1">
              {VARIABLE_CATEGORIES.map(category => {
                const isSaved = saved[category]
                return (
                  <div
                    key={category}
                    className="flex items-center justify-between py-3 border-b"
                    style={{ borderColor: 'var(--surface-divider)' }}
                  >
                    <span className="text-sm text-foreground/70 flex-1">{category}</span>
                    <div className="flex items-center gap-2">
                      {isSaved && <Check className="size-3.5 text-emerald-400" />}
                      <span className="text-foreground/30 text-sm">€</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={amounts[category] ?? '0'}
                        onChange={e => handleChange(category, e.target.value)}
                        onBlur={() => handleBlur(category)}
                        className="w-20 text-right bg-transparent text-sm font-bold text-foreground outline-none
                          focus:bg-foreground/5 rounded-lg px-2 py-1 transition-colors"
                      />
                    </div>
                  </div>
                )
              })}

              {/* Total */}
              <div className="flex items-center justify-between pt-3">
                <span className="text-sm font-bold text-foreground/60">Total variable</span>
                <span className="text-sm font-black text-foreground">
                  {formatEuro(
                    VARIABLE_CATEGORIES.reduce(
                      (s, c) => s + (parseFloat(amounts[c] ?? '0') || 0), 0
                    )
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
