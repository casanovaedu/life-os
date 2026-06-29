'use client'

import useSWR from 'swr'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { RingMetric } from '@/components/ring-metric'
import { WeeklyPlanner } from '@/components/weekly-planner'
import { GarminSync } from '@/components/garmin-sync'
import { Scale, Footprints, Heart, Brain, Watch } from 'lucide-react'

const supabase = createSupabaseBrowser()

const ACTIVITY_EMOJI: Record<string, string> = {
  run: '🏃', running: '🏃', ride: '🚴', cycling: '🚴',
  swim: '🏊', walk: '🚶', yoga: '🧘', pilates: '🧘',
  gym: '🏋️', strength: '🏋️', weighttraining: '🏋️',
}

function activityEmoji(type: string) {
  const lower = type.toLowerCase()
  for (const [k, v] of Object.entries(ACTIVITY_EMOJI)) {
    if (lower.includes(k)) return v
  }
  return '⚡'
}

function sourceColor(source: string) {
  if (source === 'garmin') return { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', color: '#34d399' }
  if (source === 'app_builder') return { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)', color: '#818cf8' }
  return { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }
}

function buildActivityGrid(workouts: { date: string; type: string; source: string }[]) {
  const today = new Date()
  const jsDay = today.getDay()
  const daysToMon = jsDay === 0 ? 6 : jsDay - 1
  const startMonday = new Date(today)
  startMonday.setDate(today.getDate() - daysToMon - 21)

  const byDate: Record<string, { type: string; source: string }[]> = {}
  for (const w of workouts) {
    if (!byDate[w.date]) byDate[w.date] = []
    byDate[w.date].push({ type: w.type, source: w.source })
  }

  const weeks: { date: Date; dateStr: string; activities: { type: string; source: string }[] }[][] = []
  let week: typeof weeks[0] = []
  const cur = new Date(startMonday)

  for (let i = 0; i < 28; i++) {
    const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    week.push({ date: new Date(cur), dateStr, activities: byDate[dateStr] ?? [] })
    if (week.length === 7) { weeks.push(week); week = [] }
    cur.setDate(cur.getDate() + 1)
  }
  if (week.length) weeks.push(week)
  return weeks
}

export default function SaludPage() {
  const pad = (n: number) => String(n).padStart(2, '0')
  const d = new Date()
  const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const w7 = new Date(d); w7.setDate(d.getDate() - 7)
  const weekAgo = `${w7.getFullYear()}-${pad(w7.getMonth() + 1)}-${pad(w7.getDate())}`
  const m30 = new Date(d); m30.setDate(d.getDate() - 30)
  const monthAgo = `${m30.getFullYear()}-${pad(m30.getMonth() + 1)}-${pad(m30.getDate())}`

  const { data: metrics = [] } = useSWR('health-metrics', async () => {
    const { data } = await supabase.from('health_metrics').select('*')
      .gte('date', weekAgo).lte('date', today).order('date', { ascending: false })
    return data ?? []
  })

  const { data: pendingWorkouts = [] } = useSWR('workouts-pending', async () => {
    const { data } = await supabase.from('workouts')
      .select('id,date,type,duration_min,notes,source')
      .eq('source', 'garmin_pending').order('date', { ascending: false }).limit(20)
    return data ?? []
  })

  const { data: recentWorkouts = [] } = useSWR('workouts-recent', async () => {
    const { data } = await supabase.from('workouts')
      .select('id,date,type,duration_min,source,rpe')
      .neq('source', 'garmin_pending').gte('date', monthAgo)
      .order('date', { ascending: false }).limit(30)
    return data ?? []
  })

  const getLatest = (name: string) => metrics.find((m: { metric: string }) => m.metric === name) as { metric: string; value: number } | undefined

  const weight    = getLatest('weight_kg')
  const steps     = getLatest('steps')
  const sleep     = getLatest('sleep_hours')
  const restingHr = getLatest('resting_hr')
  const hrv       = getLatest('hrv')

  const sleepPct    = sleep ? Math.round((sleep.value / 8) * 100) : 0
  const recoveryPct = hrv   ? Math.round(Math.min((hrv.value / 80) * 100, 100)) : 0
  const strainVal   = steps ? Math.min(steps.value / 1000, 21) : 0
  const hasAnyData  = metrics.length > 0

  const activityGrid = buildActivityGrid(recentWorkouts as { date: string; type: string; source: string }[])

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-md mx-auto px-4 pt-8 space-y-5">

        <div>
          <p className="text-xs text-foreground/40 uppercase tracking-widest font-medium">Salud</p>
          <p className="text-xs text-foreground/25">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="rounded-2xl p-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          {!hasAnyData && (
            <p className="text-xs text-foreground/25 text-center mb-4">Conecta Apple Health o registra métricas</p>
          )}
          <div className="flex items-center justify-around">
            <RingMetric value={sleepPct}    color="#3B82F6" label="Sueño"        size={96} />
            <RingMetric value={recoveryPct} color="#10B981" label="Recuperación" size={112} strokeWidth={10} />
            <RingMetric value={strainVal}   max={21} color="#8B5CF6" label="Actividad" unit="" size={96} />
          </div>
          {sleep && (
            <p className="text-center text-xs text-foreground/30 mt-4">
              {sleep.value}h sueño · HRV {hrv?.value ?? '—'} · FC {restingHr?.value ?? '—'} bpm
            </p>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Scale,      label: 'Peso',   value: weight    ? `${weight.value}kg` : '—',                 color: '#F97316' },
            { icon: Footprints, label: 'Pasos',  value: steps     ? steps.value.toLocaleString('es-ES') : '—', color: '#3B82F6' },
            { icon: Heart,      label: 'FC rep', value: restingHr ? `${restingHr.value}` : '—',                color: '#EF4444' },
            { icon: Brain,      label: 'HRV',    value: hrv       ? `${hrv.value}` : '—',                      color: '#10B981' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-2xl p-3 flex flex-col items-center gap-1.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <div className="size-7 rounded-full flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon className="size-3.5" style={{ color }} />
              </div>
              <p className="text-sm font-bold text-foreground">{value}</p>
              <p className="text-[9px] text-foreground/30 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Watch className="size-4 text-emerald-400" />
            <p className="text-sm font-bold text-foreground">Actividades Garmin</p>
            {pendingWorkouts.length > 0 && (
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                {pendingWorkouts.length} pendiente{pendingWorkouts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <GarminSync pendingWorkouts={pendingWorkouts as { id: string; date: string; type: string; duration_min: number | null; notes: string | null; source: string }[]} />
        </div>

        {recentWorkouts.length > 0 && (
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground/40 uppercase tracking-widest">Últimas 4 semanas</p>
              <div className="flex items-center gap-3 text-[9px] text-foreground/30">
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-400 inline-block" />Garmin</span>
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-indigo-400 inline-block" />IA</span>
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-foreground/20 inline-block" />Manual</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['L','M','X','J','V','S','D'].map(d => (
                <p key={d} className="text-[9px] text-foreground/25 text-center">{d}</p>
              ))}
            </div>
            <div className="space-y-1">
              {activityGrid.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map(({ date, dateStr, activities }) => {
                    const isToday = dateStr === today
                    const isFuture = date > d
                    const hasActivity = activities.length > 0
                    const mainSource = activities[0]?.source ?? ''
                    const sc = hasActivity ? sourceColor(mainSource) : null
                    return (
                      <div key={dateStr}
                        title={hasActivity ? activities.map(a => `${activityEmoji(a.type)} ${a.type}`).join(', ') : dateStr}
                        className="aspect-square rounded-lg flex items-center justify-center relative"
                        style={{
                          background: isFuture ? 'transparent' : sc ? sc.bg : 'var(--surface-border)',
                          border: isToday ? '1.5px solid rgba(255,255,255,0.4)' : sc ? `1px solid ${sc.border}` : '1px solid transparent',
                          opacity: isFuture ? 0.2 : 1,
                        }}>
                        {hasActivity && <span className="text-[10px] leading-none">{activityEmoji(activities[0].type)}</span>}
                        {activities.length > 1 && (
                          <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-indigo-500 text-[7px] text-white flex items-center justify-center font-bold">
                            {activities.length}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <p className="text-[9px] text-foreground/20 mt-2 text-center">{recentWorkouts.length} sesiones en los últimos 30 días</p>
          </div>
        )}

        <div className="rounded-2xl p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          <WeeklyPlanner />
        </div>

      </div>
    </div>
  )
}
