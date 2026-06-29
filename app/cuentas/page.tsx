'use client'

import useSWR from 'swr'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { formatEuro } from '@/lib/utils'
import { BalanceEditor } from '@/components/balance-editor'
import { NetWorthChart } from '@/components/net-worth-chart'

const supabase = createSupabaseBrowser()

const GLASS = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.09)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.13)',
} as const

const TYPE_CONFIG: Record<string, { label: string; desc: string }> = {
  cash:       { label: 'Efectivo',  desc: 'Disponible inmediatamente' },
  savings:    { label: 'Ahorro',    desc: 'Fondos y objetivos' },
  investment: { label: 'Inversión', desc: 'Bolsa y cripto' },
  debt:       { label: 'Deuda',     desc: 'Crédito y préstamos' },
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
      <div className="max-w-md mx-auto px-4 pt-10 space-y-4">

        <p className="text-[11px] text-foreground/30 uppercase tracking-[0.18em] font-medium">Cuentas</p>

        {/* Net worth hero */}
        <div className="rounded-[22px] p-5" style={GLASS}>
          <p className="text-[11px] text-foreground/35 uppercase tracking-[0.15em] mb-2">Patrimonio neto</p>
          <p className="text-5xl font-black leading-none tracking-tight text-foreground">{formatEuro(netWorth)}</p>
          <div className="mt-4 flex items-center gap-5">
            <div>
              <p className="text-[11px] text-foreground/30 mb-0.5 uppercase tracking-wider">Activos</p>
              <p className="text-sm font-bold" style={{ color: '#BEFF00' }}>{formatEuro(totalAssets)}</p>
            </div>
            <div className="h-5 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div>
              <p className="text-[11px] text-foreground/30 mb-0.5 uppercase tracking-wider">Deudas</p>
              <p className="text-sm font-bold text-red-400">{formatEuro(Math.abs(totalDebt))}</p>
            </div>
          </div>
        </div>

        {/* Net worth history */}
        <div className="rounded-[18px] p-4" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          <p className="text-[11px] text-foreground/30 uppercase tracking-[0.15em] mb-3">Evolución</p>
          <NetWorthChart />
        </div>

        {/* Distribution bar */}
        {totalAssets > 0 && (
          <div className="rounded-[18px] p-4" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            <p className="text-[11px] text-foreground/30 uppercase tracking-[0.15em] mb-3">Distribución</p>
            <div className="flex h-[3px] rounded-full overflow-hidden gap-px">
              {(['cash', 'savings', 'investment'] as const).map((type, i) => {
                const group = accountsByType[type] ?? []
                const total = group.reduce((s: number, a: { balance: number }) => s + Math.max(0, Number(a.balance)), 0)
                const pct = (total / totalAssets) * 100
                if (pct < 1) return null
                const colors = ['rgba(255,255,255,0.7)', '#BEFF00', 'rgba(190,255,0,0.5)']
                return <div key={type} className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[i] }} />
              })}
            </div>
            <div className="grid grid-cols-3 gap-1 mt-3">
              {(['cash', 'savings', 'investment'] as const).map((type, i) => {
                const group = accountsByType[type] ?? []
                const total = group.reduce((s: number, a: { balance: number }) => s + Math.max(0, Number(a.balance)), 0)
                const pct = totalAssets > 0 ? (total / totalAssets) * 100 : 0
                if (!group.length) return null
                const colors = ['rgba(255,255,255,0.7)', '#BEFF00', 'rgba(190,255,0,0.5)']
                return (
                  <div key={type} className="flex items-center gap-1.5 min-w-0">
                    <span className="size-[6px] rounded-full shrink-0" style={{ background: colors[i] }} />
                    <span className="text-[11px] text-foreground/35 truncate">{TYPE_CONFIG[type].label}</span>
                    <span className="text-[11px] font-semibold text-foreground/50 shrink-0">{pct.toFixed(0)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Accounts by type */}
        {(['cash', 'savings', 'investment', 'debt'] as const).map(type => {
          const group = accountsByType[type]
          if (!group?.length) return null
          const cfg = TYPE_CONFIG[type]
          const groupTotal = group.reduce((s: number, a: { balance: number }) => s + Number(a.balance), 0)
          return (
            <div key={type}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] text-foreground/30 uppercase tracking-[0.15em]">{cfg.label}</span>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: groupTotal < 0 ? '#FF4444' : 'rgba(255,255,255,0.4)' }}>
                  {formatEuro(groupTotal)}
                </span>
              </div>
              <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                {group.map((account: { id: string; name: string; balance: number; type: string }, idx: number) => (
                  <div key={account.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={idx > 0 ? { borderTop: '1px solid rgba(255,255,255,0.05)' } : undefined}>
                    <div className="size-9 rounded-xl flex items-center justify-center shrink-0 text-[13px] font-black"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                      {account.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{account.name}</p>
                      <p className="text-[11px] text-foreground/25">{cfg.desc}</p>
                    </div>
                    <BalanceEditor account={{ id: account.id, name: account.name, balance: Number(account.balance), type: account.type }} />
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        <p className="text-[11px] text-foreground/20 text-center pb-2">
          Toca el importe para editar · {new Date().toLocaleDateString('es-ES')}
        </p>

      </div>
    </div>
  )
}
