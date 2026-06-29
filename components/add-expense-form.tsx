'use client'

import { useState, useTransition, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { addExpense } from '@/lib/actions'
import { useSWRConfig } from 'swr'

const CATEGORIES = [
  'Supermarket', 'Restaurante / Bar', 'Compras', 'Transporte',
  'Ocio', 'Health', 'Vet', 'Varios', 'Fitness', 'Subscriptions', 'Rent',
]

const QUICK_ACCOUNTS = [
  { dbName: 'BBVA Cash',    label: '🔵 BBVA Cash' },
  { dbName: 'Revolut Cash', label: '⚫ Revolut Cash' },
  { dbName: 'Credit card',  label: '🥇 Revolut Credit' },
]

type Account = { id: string; name: string }

export function AddExpenseForm({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { mutate } = useSWRConfig()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!open) return
    const y = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${y}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, y)
    }
  }, [open])

  const [form, setForm] = useState({
    amount: '',
    concept: '',
    category: CATEGORIES[0],
    account: QUICK_ACCOUNTS[0].dbName,
    date: today,
  })

  function set(k: string, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function submit() {
    const amount = parseFloat(form.amount)
    if (!amount) return
    startTransition(async () => {
      await addExpense({ ...form, amount, concept: form.concept.trim() || form.category })
      mutate(key => true, undefined, { revalidate: true })
      setForm({ amount: '', concept: '', category: CATEGORIES[0], account: QUICK_ACCOUNTS[0].dbName, date: today })
      setOpen(false)
    })
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 size-12 rounded-full flex items-center justify-center transition-transform active:scale-95"
        style={{ background: '#BEFF00', boxShadow: '0 4px 20px rgba(190,255,0,0.3)' }}
      >
        <Plus className="size-5" style={{ color: '#000' }} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setOpen(false)} />

          {/* Sheet — separate from backdrop so iOS scroll works */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
            style={{
              background: 'var(--background)',
              borderTop: '1px solid var(--surface-border)',
              maxHeight: '90dvh',
              overflowY: 'scroll',
              WebkitOverflowScrolling: 'touch' as never,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 pb-36 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground text-base">Añadir gasto</h3>
                <button onClick={() => setOpen(false)} className="text-foreground/40">
                  <X className="size-5" />
                </button>
              </div>

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
                    {QUICK_ACCOUNTS.map(a => <option key={a.dbName} value={a.dbName}>{a.label}</option>)}
                  </select>
                </div>
              </div>

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
                disabled={isPending || !form.amount}
                className="w-full py-3 rounded-2xl font-bold disabled:opacity-30 transition-opacity"
                style={{ background: '#BEFF00', color: '#000' }}
              >
                {isPending ? 'Guardando...' : 'Guardar gasto'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
