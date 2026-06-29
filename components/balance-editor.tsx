'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { updateAccountBalance } from '@/lib/actions'
import { formatEuro } from '@/lib/utils'

type Account = { id: string; name: string; balance: number; type: string }

export function BalanceEditor({ account }: { account: Account }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(account.balance))
  const [isPending, startTransition] = useTransition()

  function save() {
    const num = parseFloat(value)
    if (isNaN(num)) return
    startTransition(async () => {
      await updateAccountBalance(account.id, num)
      setEditing(false)
    })
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-foreground/50">€</span>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-28 rounded-lg px-2 py-1 text-sm font-mono text-foreground outline-none text-right"
          style={{ background: 'var(--surface)' }}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        />
        <button onClick={save} disabled={isPending} className="text-emerald-400 hover:text-emerald-300">
          <Check className="size-4" />
        </button>
        <button onClick={() => setEditing(false)} className="text-foreground/30 hover:text-foreground/60">
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group">
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color: account.balance < 0 ? '#EF4444' : undefined }}
      >
        {formatEuro(account.balance)}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-foreground/30 hover:text-foreground/60"
      >
        <Pencil className="size-3" />
      </button>
    </div>
  )
}
