'use client'

import { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'
import { updateAccountBalance } from '@/lib/actions'
import { formatEuro } from '@/lib/utils'
import { useSWRConfig } from 'swr'

type Account = { id: string; name: string; balance: number; type: string }

export function BalanceEditor({ account }: { account: Account }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(account.balance))
  const [isPending, startTransition] = useTransition()
  const { mutate } = useSWRConfig()

  function save() {
    const num = parseFloat(value)
    if (isNaN(num)) return
    startTransition(async () => {
      await updateAccountBalance(account.id, num)
      mutate(key => true, undefined, { revalidate: true })
      setEditing(false)
    })
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-foreground/50">€</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={e => setValue(e.target.value.replace(',', '.'))}
          className="w-24 rounded-lg px-2 py-1 text-sm font-mono text-foreground outline-none text-right"
          style={{ background: 'var(--surface-border)' }}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        />
        <button onClick={save} disabled={isPending} style={{ color: '#BEFF00' }}>
          <Check className="size-4" />
        </button>
        <button onClick={() => setEditing(false)} className="text-foreground/30">
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm font-bold tabular-nums text-right"
      style={{ color: account.balance < 0 ? '#EF4444' : undefined }}
    >
      {formatEuro(account.balance)}
    </button>
  )
}
