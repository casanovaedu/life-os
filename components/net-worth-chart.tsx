'use client'

import useSWR from 'swr'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { formatEuro } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useState } from 'react'

const supabase = createSupabaseBrowser()

const RANGES = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1A', months: 12 },
]

function fmt(date: string) {
  const d = new Date(date)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'rgba(7,7,7,0.92)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '8px 12px',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 2 }}>{fmt(d.date)}</p>
      <p style={{ color: '#BEFF00', fontSize: 14, fontWeight: 700 }}>{formatEuro(d.net_worth)}</p>
    </div>
  )
}

export function NetWorthChart() {
  const [range, setRange] = useState(3)

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - range)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const { data: snapshots = [] } = useSWR(`nw-snapshots-${range}`, async () => {
    const { data, error } = await supabase
      .from('net_worth_snapshots')
      .select('date,net_worth')
      .gte('date', cutoffStr)
      .order('date', { ascending: true })
    if (error) return []
    return data ?? []
  })

  if (snapshots.length === 0) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Sin historial todavía</p>
        <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 11, marginTop: 4 }}>
          Activa el cron de n8n para empezar a registrar
        </p>
      </div>
    )
  }

  const first = Number(snapshots[0].net_worth)
  const last  = Number(snapshots[snapshots.length - 1].net_worth)
  const delta = last - first
  const deltaColor = delta >= 0 ? '#BEFF00' : '#FF4444'

  return (
    <div>
      {/* Range selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {RANGES.map(r => (
          <button
            key={r.label}
            onClick={() => setRange(r.months)}
            style={{
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: range === r.months ? '#BEFF00' : 'rgba(255,255,255,0.06)',
              color: range === r.months ? '#000' : 'rgba(255,255,255,0.3)',
            }}
          >
            {r.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: deltaColor, alignSelf: 'center' }}>
          {delta >= 0 ? '+' : ''}{formatEuro(delta)}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={snapshots} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="date"
            tickFormatter={fmt}
            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="net_worth"
            stroke="#BEFF00"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#BEFF00', stroke: '#070707', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
