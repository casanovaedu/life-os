'use client'

import { useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { addExpense } from '@/lib/actions'
import { useSWRConfig } from 'swr'

const CATEGORIES = [
  'Supermarket', 'Restaurante / Bar', 'Compras', 'Transporte',
  'Ocio', 'Health', 'Vet', 'Varios', 'Fitness', 'Subscriptions', 'Rent',
]

type Account = { id: string; name: string }

export function AddExpenseForm({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { mutate } = useSWRConfig()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    amount: '',
    concept: '',
    category: CATEGORIES[0],
    account: accounts[0]?.name ?? '',
    date: today,
  })

  function set(k: string, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function submit() {
    const amount = parseFloat(form.amount)
    if (!amount || !form.concept) return
    startTransition(async () => {
      await addExpense({ ...form, amount })
      mutate(key => true, undefined, { revalidate: true })
      setForm({ amount: '', concept: '', category: CATEGORIES[0], account: accounts[0]?.name ?? '', date: today })
      setOpen(false)
    })
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 size-12 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-95"
        style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
      >
        <Plus className="size-5 text-white" />
      </button>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setOpen(false)}>
          <div
            className="w-full rounded-t-3xl p-5 pb-10 space-y-4 overflow-y-auto max-h-[90vh]"
            style={{ background: 'var(--background)', border: '1px solid var(--surface-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-foreground text-base">Añadir gasto</h3>
              <button onClick={() => setOpen(false)} className="text-foreground/40 hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs text-foreground/40 uppercase tracking-widest">Importe</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-foreground/50 text-lg">€</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value.replace(',', '.'))}
                  className="flex-1 bg-transparent text-2xl font-bold text-foreground outline-none placeholder:text-foreground/20"
                  autoFocus
                />
              </div>
            </div>

            {/* Concept */}
            <div>
              <label className="text-xs text-foreground/40 uppercase tracking-widest">Concepto</label>
              <input
                type="text"
                placeholder="Mercadona, Restaurante..."
                value={form.concept}
                onChange={e => set('concept', e.target.value)}
                className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-foreground/25 border border-foreground/8"
                style={{ background: 'var(--surface)' }}
              />
            </div>

            {/* Category + Account row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground/40 uppercase tracking-widest">Categoría</label>
                <select
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-foreground/8 appearance-none"
                  style={{ background: 'var(--surface)' }}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-foreground/40 uppercase tracking-widest">Cuenta</label>
                <select
                  value={form.account}
                  onChange={e => set('account', e.target.value)}
                  className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-foreground/8 appearance-none"
                  style={{ background: 'var(--surface)' }}
                >
                  {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="text-xs text-foreground/40 uppercase tracking-widest">Fecha</label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none border border-foreground/8"
                style={{ background: 'var(--surface)' }}
              />
            </div>

            <button
              onClick={submit}
              disabled={isPending || !form.amount || !form.concept}
              className="w-full py-3 rounded-2xl font-bold text-white disabled:opacity-40 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              {isPending ? 'Guardando...' : 'Guardar gasto'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
