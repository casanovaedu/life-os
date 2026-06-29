'use client'

import useSWR from 'swr'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { formatEuro } from '@/lib/utils'
import { BalanceEditor } from '@/components/balance-editor'

const supabase = createSupabaseBrowser()

const TYPE_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  cash:       { label: 'Efectivo',  color: '#3B82F6', desc: 'Disponible inmediatamente' },
  savings:    { label: 'Ahorro',    color: '#F97316', desc: 'Fondos y objetivos' },
  investment: { label: 'Inversión', color: '#10B981', desc: 'Bolsa y cripto' },
  debt:       { label: 'Deuda',     color: '#EF4444', desc: 'Crédito y préstamos' },
}

export default function CuentasPage() {
  const { data: accounts = [] } = useSWR('accounts', async () => {
    const { data } = await supabase.from('accounts').select('*')
      .order('type').order('balance', { ascending: false })
    return data ?? []
  })

  const netWorth    = accounts.reduce((s: number, a: { balance: number }) => s + Number(a.balance), 0)
  const totalAssets = accounts.filter((a: { balance: number }) => Number(a.balance) > 0).reduce((s: number, a: { balance: number }) => s + Number(a.balance), 0)
  const totalDebt   = accounts.filter((a: { balance: number }) => Number(a.balance) < 0).reduce((s: number, a: { balance: number }) => s + Number(a.balance), 0)

  const accountsByType = accounts.reduce<Record<string, typeof accounts>>((acc, a: { type: string }) => {
    const t = a.type ?? 'cash'
    acc[t] = [...(acc[t] ?? []), a]
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-md mx-auto px-4 pt-8 space-y-5">

        <p className="text-xs text-foreground/40 uppercase tracking-widest font-medium">Cuentas</p>

        <div className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.04))', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className="absolute -top-8 -right-8 size-32 rounded-full opacity-20 blur-2xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }} />
          <p className="text-xs text-foreground/50 uppercase tracking-widest mb-1">Patrimonio neto</p>
          <p className="text-4xl font-black text-foreground">{formatEuro(netWorth)}</p>
          <div className="mt-4 flex items-center gap-6">
            <div>
              <p className="text-xs text-foreground/40 mb-0.5">Activos</p>
              <p className="text-sm font-bold text-emerald-400">{formatEuro(totalAssets)}</p>
            </div>
            <div className="h-6 w-px bg-foreground/10" />
            <div>
              <p className="text-xs text-foreground/40 mb-0.5">Deudas</p>
              <p className="text-sm font-bold text-red-400">{formatEuro(Math.abs(totalDebt))}</p>
            </div>
          </div>
        </div>

        {totalAssets > 0 && (
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3">Distribución</p>
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
              {(['cash', 'savings', 'investment'] as const).map(type => {
                const group = accountsByType[type] ?? []
                const total = group.reduce((s: number, a: { balance: number }) => s + Math.max(0, Number(a.balance)), 0)
                const pct = (total / totalAssets) * 100
                if (pct < 1) return null
                return <div key={type} className="h-full rounded-full" style={{ width: `${pct}%`, background: TYPE_CONFIG[type].color }} />
              })}
            </div>
            <div className="flex items-center gap-4 mt-3">
              {(['cash', 'savings', 'investment'] as const).map(type => {
                const group = accountsByType[type] ?? []
                const total = group.reduce((s: number, a: { balance: number }) => s + Math.max(0, Number(a.balance)), 0)
                const pct = totalAssets > 0 ? (total / totalAssets) * 100 : 0
                if (!group.length) return null
                return (
                  <div key={type} className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: TYPE_CONFIG[type].color }} />
                    <span className="text-xs text-foreground/40">{TYPE_CONFIG[type].label}</span>
                    <span className="text-xs font-semibold text-foreground/60">{pct.toFixed(0)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {(['cash', 'savings', 'investment', 'debt'] as const).map(type => {
          const group = accountsByType[type]
          if (!group?.length) return null
          const cfg = TYPE_CONFIG[type]
          const groupTotal = group.reduce((s: number, a: { balance: number }) => s + Number(a.balance), 0)
          return (
            <div key={type}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: cfg.color }} />
                  <span className="text-xs font-semibold text-foreground/40 uppercase tracking-widest">{cfg.label}</span>
                </div>
                <span className="text-xs font-bold tabular-nums" style={{ color: groupTotal < 0 ? '#EF4444' : undefined }}>
                  {formatEuro(groupTotal)}
                </span>
              </div>
              <div className="rounded-2xl overflow-hidden divide-y divide-foreground/5"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                {group.map((account: { id: string; name: string; balance: number; type: string }) => (
                  <div key={account.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="size-9 rounded-2xl flex items-center justify-center shrink-0 text-sm font-black"
                      style={{ background: `${cfg.color}18`, color: cfg.color }}>
                      {account.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{account.name}</p>
                      <p className="text-xs text-foreground/30">{cfg.desc}</p>
                    </div>
                    <BalanceEditor account={{ id: account.id, name: account.name, balance: Number(account.balance), type: account.type }} />
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        <p className="text-xs text-foreground/25 text-center pb-2">
          Toca el importe para editar · Actualizado {new Date().toLocaleDateString('es-ES')}
        </p>

      </div>
    </div>
  )
}
