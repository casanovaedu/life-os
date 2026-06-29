'use client'

import useSWR from 'swr'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { GymBuilder } from '@/components/gym-builder'
import { Dumbbell, Brain } from 'lucide-react'
import type { WorkoutPlan } from '@/lib/actions'

const supabase = createSupabaseBrowser()

function computeFitnessState(workouts: { date: string; load: number | null; fitness_ctl?: number | null; fatigue_atl?: number | null; form_tsb?: number | null }[]) {
  const latest = workouts.find(w => w.fitness_ctl != null && w.fatigue_atl != null)
  if (latest) {
    const ctl = Number(latest.fitness_ctl)
    const atl = Number(latest.fatigue_atl)
    const tsb = latest.form_tsb != null ? Number(latest.form_tsb) : ctl - atl
    return { ctl: Math.round(ctl * 10) / 10, atl: Math.round(atl * 10) / 10, tsb: Math.round(tsb * 10) / 10 }
  }
  const sorted = [...workouts].filter(w => w.load !== null).sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 0) return { ctl: 0, atl: 0, tsb: 0 }
  let ctl = 0, atl = 0
  for (const w of sorted) {
    const load = Number(w.load)
    ctl = ctl + (load - ctl) / 42
    atl = atl + (load - atl) / 7
  }
  return { ctl: Math.round(ctl * 10) / 10, atl: Math.round(atl * 10) / 10, tsb: Math.round((ctl - atl) * 10) / 10 }
}

function tsbColor(tsb: number) {
  if (tsb < -20) return '#EF4444'
  if (tsb < -10) return '#F59E0B'
  if (tsb > 5) return '#10B981'
  return '#6366F1'
}

function tsbLabel(tsb: number) {
  if (tsb < -20) return 'Fatigado'
  if (tsb < -5) return 'Cargado'
  if (tsb > 10) return 'Fresco'
  return 'Normal'
}

function PastPlanCard({ workout }: {
  workout: { id: string; date: string; type: string; duration_min: number | null; rpe: number | null; plan_json: unknown }
}) {
  const plan = workout.plan_json as WorkoutPlan
  const muscles = plan.sections?.map(s => s.name).join(' · ') ?? workout.type
  const totalExercises = plan.sections?.reduce((n, s) => n + s.exercises.length, 0) ?? 0
  return (
    <details className="group rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
      <summary className="flex items-center gap-3 px-4 py-3.5 cursor-pointer list-none">
        <div className="size-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.15)' }}>
          <Brain className="size-4 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{muscles}</p>
          <p className="text-xs text-foreground/30">
            {workout.date} · {workout.duration_min}min{workout.rpe ? ` · RPE ${workout.rpe}` : ''} · {totalExercises} ejercicios
          </p>
        </div>
        <span className="text-foreground/25 text-xs shrink-0 group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div className="px-4 pb-4 pt-2 space-y-3 border-t border-foreground/5">
        <p className="text-xs text-indigo-300 italic leading-snug">{plan.intent}</p>
        {plan.sections?.map((s, i) => (
          <div key={i} className="space-y-1">
            <p className="text-[10px] text-foreground/40 uppercase tracking-wider font-semibold">{s.name}</p>
            {s.exercises.map((ex, j) => (
              <div key={j} className="flex items-center justify-between py-1 border-b border-foreground/5">
                <span className="text-xs text-foreground/70 truncate pr-2">{ex.name}</span>
                <span className="text-xs text-indigo-400 font-mono shrink-0">{ex.sets}×{ex.reps}</span>
              </div>
            ))}
          </div>
        ))}
        {plan.cardio && <p className="text-xs text-emerald-400">Cardio: {plan.cardio.type} {plan.cardio.duration_min} min</p>}
        {plan.insight && <p className="text-xs text-foreground/35 italic">{plan.insight}</p>}
      </div>
    </details>
  )
}

export default function EntrenosPage() {
  const { data: workouts = [] } = useSWR('workouts', async () => {
    const { data } = await supabase.from('workouts').select('*').order('date', { ascending: false }).limit(30)
    return data ?? []
  })

  const fitnessState = computeFitnessState(workouts)
  const tsb = fitnessState.tsb

  const lastWorkoutsForGym = workouts.slice(0, 10).map((w: { date: string; type: string; muscle_groups: string[] | null; duration_min: number | null; rpe: number | null; load: number | null }) => ({
    date: w.date, type: w.type, muscle_groups: w.muscle_groups,
    duration_min: w.duration_min, rpe: w.rpe, load: w.load,
  }))

  const lastWorkout = workouts[0]
  const daysSinceGym = lastWorkout
    ? Math.floor((Date.now() - new Date(lastWorkout.date).getTime()) / 86400000)
    : null

  const aiWorkouts = workouts.filter((w: { plan_json: unknown }) => w.plan_json != null).slice(0, 5)
  const simpleWorkouts = workouts.filter((w: { plan_json: unknown }) => w.plan_json == null).slice(0, 10)

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <div className="max-w-md mx-auto px-4 pt-8 space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-foreground/40 uppercase tracking-widest font-medium">Entrenos</p>
            <p className="text-xs text-foreground/25">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          {daysSinceGym !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Dumbbell className="size-3.5 text-indigo-400" />
              <span className="text-xs text-indigo-300 font-semibold">{daysSinceGym}d sin gym</span>
            </div>
          )}
        </div>

        {workouts.length > 0 && (
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            <p className="text-xs text-foreground/40 uppercase tracking-widest mb-3">Estado de forma</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Fitness', sub: 'CTL 42d', value: fitnessState.ctl, color: '#6366F1', signed: undefined as number | undefined },
                { label: 'Fatiga', sub: 'ATL 7d', value: fitnessState.atl, color: '#F59E0B', signed: undefined as number | undefined },
                { label: tsbLabel(tsb), sub: 'Forma TSB', value: Math.abs(tsb), color: tsbColor(tsb), signed: tsb },
              ].map(({ label, sub, value, color, signed }) => (
                <div key={label} className="flex flex-col items-center gap-1 text-center">
                  <p className="text-2xl font-black" style={{ color }}>
                    {signed !== undefined ? (signed > 0 ? '+' : '') : ''}{signed !== undefined ? signed.toFixed(0) : value.toFixed(0)}
                  </p>
                  <p className="text-xs font-semibold text-foreground/60">{label}</p>
                  <p className="text-[9px] text-foreground/30 uppercase tracking-wider">{sub}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(Math.max((tsb + 30) / 60 * 100, 0), 100)}%`, background: tsbColor(tsb) }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-foreground/25">Fatigado</span>
              <span className="text-[9px] text-foreground/25">Fresco</span>
            </div>
          </div>
        )}

        <div className="rounded-2xl p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="size-4 text-indigo-400" />
            <p className="text-sm font-bold text-foreground">Planificador IA</p>
            {workouts.length > 0 && <span className="ml-auto text-xs text-foreground/30">{workouts.length} sesiones</span>}
          </div>
          <GymBuilder lastWorkouts={lastWorkoutsForGym} fitnessState={fitnessState} />
        </div>

        {aiWorkouts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3">Últimos planes IA</p>
            <div className="space-y-2">
              {aiWorkouts.map((w: { id: string; date: string; type: string; duration_min: number | null; rpe: number | null; plan_json: unknown }) => (
                <PastPlanCard key={w.id} workout={w} />
              ))}
            </div>
          </div>
        )}

        {simpleWorkouts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3">Historial</p>
            <div className="rounded-2xl overflow-hidden divide-y divide-foreground/5"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              {simpleWorkouts.map((w: { id: string; date: string; type: string; muscle_groups: string[] | null; duration_min: number | null; rpe: number | null; form_tsb: number | null }) => {
                const muscles = w.muscle_groups?.join(' + ') ?? w.type
                return (
                  <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="size-9 rounded-2xl flex items-center justify-center shrink-0 text-base"
                      style={{ background: 'rgba(99,102,241,0.15)' }}>🏋️</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{muscles}</p>
                      <p className="text-xs text-foreground/30">{w.date} · {w.duration_min}min{w.rpe ? ` · RPE ${w.rpe}` : ''}</p>
                    </div>
                    {w.form_tsb !== null && (
                      <p className="text-[10px] shrink-0" style={{ color: tsbColor(w.form_tsb) }}>
                        TSB {w.form_tsb > 0 ? '+' : ''}{w.form_tsb}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {workouts.length === 0 && (
          <p className="text-center text-sm text-foreground/25 py-4">Tu historial aparecerá aquí tras el primer entrenamiento</p>
        )}

      </div>
    </div>
  )
}
