'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { fmtHours, fmtShortDate, type TrendPoint } from '@/lib/resumen'

const METRICS = [
  { key: 'sleep', label: 'Sueño', format: (v: number) => fmtHours(v) },
  { key: 'hrv',   label: 'HRV',   format: (v: number) => `${Math.round(v)} ms` },
] as const

type MetricKey = typeof METRICS[number]['key']

export function ResumenTrendChart({ data }: { data: TrendPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>('sleep')
  const current = METRICS.find(m => m.key === metric)!
  const points = data.filter(d => d[metric] !== null).length

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            style={{
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: metric === m.key ? '#BEFF00' : 'rgba(255,255,255,0.06)',
              color: metric === m.key ? '#000' : 'rgba(255,255,255,0.3)',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {points < 2 ? (
        <p className="text-xs text-foreground/25 text-center py-8">Pocos datos de {current.label.toLowerCase()} este mes</p>
      ) : (
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="day"
              tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.12)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload as TrendPoint
                const v = p[metric]
                if (v === null) return null
                return (
                  <div style={{ background: 'rgba(7,7,7,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 2 }}>{fmtShortDate(p.date)}</p>
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 700 }}>{current.format(v)}</p>
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey={metric}
              stroke="#BEFF00"
              strokeWidth={2}
              dot={false}
              connectNulls
              activeDot={{ r: 4, fill: '#BEFF00', stroke: '#070707', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
