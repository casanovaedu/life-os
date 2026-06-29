'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Check, AlertTriangle, Zap, Brain, RotateCcw, Maximize2, X } from 'lucide-react'
import { generateWorkoutPlan, logWorkout, sendWorkoutToTelegram } from '@/lib/actions'
import type { WorkoutPlan, WorkoutPlanSection } from '@/lib/actions'

const TIME_OPTIONS = [30, 45, 60, 75, 90]

const CARDIO_OPTIONS = [
  { id: 'cinta',       label: 'Cinta 🏃'      },
  { id: 'stairmaster', label: 'Stairmaster 🪜' },
  { id: 'bici',        label: 'Bici 🚲'        },
  { id: 'none',        label: 'Sin cardio'      },
]

const MUSCLE_OPTIONS = [
  { id: 'Push',      label: 'Push',       desc: 'Pecho · Hombro · Tríceps', emoji: '🍈' },
  { id: 'Pull',      label: 'Pull',       desc: 'Espalda · Bíceps',         emoji: '🔙' },
  { id: 'Legs',      label: 'Pierna',     desc: 'Cuádriceps · Isquios',     emoji: '🦵' },
  { id: 'Arms',      label: 'Brazos',     desc: 'Bíceps · Tríceps',         emoji: '💪' },
  { id: 'Core',      label: 'Core',       desc: 'Abdominales · Estab.',     emoji: '🎯' },
  { id: 'UpperFull', label: 'Upper Full', desc: 'Tren superior completo',   emoji: '⬆️' },
]

const EQUIPMENT_OPTIONS = [
  'Cable doble', 'TRX', 'Smith machine', 'Hip thrust', 'Hack squat',
  'Polea alta', 'Máquina pec-deck', 'Kettlebell', 'Barra olímpica',
]

type Step = 'config' | 'generating' | 'plan' | 'rpe' | 'done'

type Props = {
  lastWorkouts: {
    date: string; type: string; muscle_groups: string[] | null
    duration_min: number | null; rpe: number | null; load: number | null
  }[]
  fitnessState: { ctl: number; atl: number; tsb: number }
}

// ── Shared section/plan rendering (also exported for past-plans view) ─────────

export function SectionCard({ section }: { section: WorkoutPlanSection }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--surface-border)' }}>
        <div>
          <p className="text-sm font-bold text-foreground">{section.name}</p>
          <p className="text-xs text-foreground/40">{section.focus}</p>
        </div>
        <span className="text-xs font-mono text-foreground/30">{section.duration_min} min</span>
      </div>
      <div className="divide-y divide-foreground/5">
        {section.exercises.map((ex, i) => (
          <div key={i} className="px-4 py-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{ex.name}</span>
              <span className="text-xs text-indigo-400 font-mono shrink-0">{ex.sets}×{ex.reps}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground/35">
              <span>{ex.equipment}</span><span>·</span><span>{ex.rest_s}s</span>
            </div>
            <p className="text-xs text-foreground/50 italic">{ex.tip}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PlanView({ plan, onStartGymMode }: { plan: WorkoutPlan; onStartGymMode?: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-3.5 flex items-start gap-3"
        style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <Zap className="size-4 text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-sm font-semibold text-indigo-300 leading-snug">{plan.intent}</p>
      </div>

      {plan.fatigue_warning && (
        <div className="rounded-2xl p-3 flex items-start gap-2.5"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle className="size-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{plan.fatigue_warning}</p>
        </div>
      )}

      {plan.sections.map((s, i) => <SectionCard key={i} section={s} />)}

      {plan.cardio && (
        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-emerald-400">Cardio — {plan.cardio.type}</span>
            <span className="text-xs text-emerald-400/60 font-mono">{plan.cardio.duration_min} min</span>
          </div>
          <p className="text-xs text-foreground/50">{plan.cardio.protocol}</p>
        </div>
      )}

      <div className="rounded-2xl p-3.5 flex items-start gap-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
        <Brain className="size-4 text-purple-400 shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/50 leading-relaxed">{plan.insight}</p>
      </div>

      {onStartGymMode && (
        <button onClick={onStartGymMode}
          className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          <Maximize2 className="size-4" />
          Modo gym
        </button>
      )}
    </div>
  )
}

// ── Persistence helpers ───────────────────────────────────────────────────────

const LS_PLAN  = 'gym_active_plan'
const LS_STEP  = 'gym_active_step'
const LS_META  = 'gym_active_meta'  // muscles, cardio, timeMin

function saveSession(step: Step, plan: WorkoutPlan | null, muscles: string[], cardio: string, timeMin: number) {
  try {
    localStorage.setItem(LS_STEP, step)
    if (plan) localStorage.setItem(LS_PLAN, JSON.stringify(plan))
    localStorage.setItem(LS_META, JSON.stringify({ muscles, cardio, timeMin }))
  } catch {}
}

function clearSession() {
  try {
    localStorage.removeItem(LS_PLAN)
    localStorage.removeItem(LS_STEP)
    localStorage.removeItem(LS_META)
  } catch {}
}

function loadSession(): { step: Step; plan: WorkoutPlan | null; muscles: string[]; cardio: string; timeMin: number } | null {
  try {
    const step = localStorage.getItem(LS_STEP) as Step | null
    const plan = localStorage.getItem(LS_PLAN)
    const meta = localStorage.getItem(LS_META)
    if (!step || !plan || step === 'config' || step === 'done') return null
    return {
      step,
      plan: JSON.parse(plan),
      ...(meta ? JSON.parse(meta) : { muscles: [], cardio: 'none', timeMin: 60 }),
    }
  } catch { return null }
}

// ─────────────────────────────────────────────────────────────────────────────

export function GymBuilder({ lastWorkouts, fitnessState }: Props) {
  const router = useRouter()

  // Initialise from persisted session so navigating away and back restores state
  const [hydrated, setHydrated] = useState(false)
  const [step, setStep]       = useState<Step>('config')
  const [timeMin, setTimeMin] = useState(60)
  const [cardio, setCardio]   = useState('none')
  const [muscles, setMuscles] = useState<string[]>([])
  const [excluded, setExcluded] = useState<string[]>([])
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false)
  const [plan, setPlan]       = useState<WorkoutPlan | null>(null)
  const [rpe, setRpe]         = useState(6)
  const [error, setError]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const session = loadSession()
    if (session) {
      setStep(session.step)
      setPlan(session.plan)
      setMuscles(session.muscles)
      setCardio(session.cardio)
      setTimeMin(session.timeMin)
    }
    try {
      const eq = localStorage.getItem('gym_excluded_equipment')
      if (eq) setExcluded(JSON.parse(eq))
    } catch {}
    setHydrated(true)
  }, [])

  function goStep(s: Step) {
    setStep(s)
    saveSession(s, plan, muscles, cardio, timeMin)
  }

  function toggleMuscle(id: string) {
    setMuscles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleEquipment(eq: string) {
    setExcluded(prev => {
      const next = prev.includes(eq) ? prev.filter(x => x !== eq) : [...prev, eq]
      localStorage.setItem('gym_excluded_equipment', JSON.stringify(next))
      return next
    })
  }

  function handleGenerate() {
    if (muscles.length === 0) return
    setError(null)
    setStep('generating')
    startTransition(async () => {
      try {
        const result = await generateWorkoutPlan({
          muscles, cardio, time_min: timeMin,
          excluded_equipment: excluded,
          fitness_state: fitnessState,
          recent_workouts: lastWorkouts,
        })
        if (result) {
          setPlan(result)
          saveSession('plan', result, muscles, cardio, timeMin)
          sendWorkoutToTelegram(result, { muscles, time_min: timeMin, fitnessState }).catch(() => {})
        }
        setStep('plan')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error generando el plan')
        setStep('config')
      }
    })
  }

  function handleSave() {
    setStep('done')
    clearSession()
    const today = (() => {
      const d = new Date(); const p = (n: number) => String(n).padStart(2,'0')
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`
    })()
    startTransition(async () => {
      await logWorkout({
        date: today, type: muscles.join('+') || 'Gym',
        duration_min: timeMin, rpe, muscle_groups: muscles,
        cardio_type: cardio !== 'none' ? cardio : undefined,
        cardio_min: cardio !== 'none' ? Math.round(timeMin * 0.28) : undefined,
        plan_json: plan ?? undefined,
        fitness_ctl: fitnessState.ctl, fatigue_atl: fitnessState.atl, form_tsb: fitnessState.tsb,
      })
    })
  }

  function reset() {
    clearSession()
    setStep('config'); setMuscles([]); setCardio('none'); setTimeMin(60)
    setPlan(null); setRpe(6); setError(null)
  }

  // Avoid hydration mismatch — don't render until we've read localStorage
  if (!hydrated) return null

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="size-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.15)' }}>
          <Check className="size-8 text-emerald-400" />
        </div>
        <p className="font-bold text-foreground">¡Entrenamiento registrado!</p>
        <p className="text-xs text-foreground/40">{muscles.join(' + ')} · {timeMin} min · RPE {rpe}</p>
        <button onClick={reset}
          className="mt-2 flex items-center gap-1.5 text-xs text-foreground/40">
          <RotateCcw className="size-3" /> Nuevo entrenamiento
        </button>
      </div>
    )
  }

  // ── RPE ───────────────────────────────────────────────────────────────────
  if (step === 'rpe') {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-bold text-foreground mb-1">¿Cómo ha ido la sesión?</p>
          <p className="text-xs text-foreground/40">RPE 1 = suave · 10 = al límite</p>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[1,2,3,4,5,6,7,8,9,10].map(r => (
            <button key={r} onClick={() => setRpe(r)}
              className="py-3 rounded-2xl text-sm font-bold transition-all"
              style={{
                background: rpe === r ? 'rgba(99,102,241,0.3)' : 'var(--surface)',
                border: rpe === r ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--surface-border)',
                color: rpe === r ? '#a5b4fc' : undefined,
              }}>{r}</button>
          ))}
        </div>
        <p className="text-xs text-foreground/40 text-center">
          {rpe <= 3 ? '😌 Suave' : rpe <= 5 ? '😊 Moderado' : rpe <= 7 ? '😤 Duro' : rpe <= 9 ? '🔥 Muy duro' : '💀 Al límite'}
        </p>
        {/* Let them see the plan again before confirming */}
        <button onClick={() => goStep('plan')}
          className="w-full py-2 rounded-xl text-xs text-foreground/40"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          ← Ver el plan
        </button>
        <button onClick={handleSave} disabled={isPending}
          className="w-full py-3 rounded-2xl font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
          <Check className="size-4" />
          {isPending ? 'Guardando...' : 'Guardar entrenamiento'}
        </button>
      </div>
    )
  }

  // ── PLAN ──────────────────────────────────────────────────────────────────
  if (step === 'plan' && plan) {
    return (
      <div className="space-y-4">
        <PlanView plan={plan} onStartGymMode={() => router.push('/gym')} />
        <div className="flex gap-2">
          <button onClick={reset}
            className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-foreground/50"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            Nuevo plan
          </button>
          <button onClick={() => goStep('rpe')}
            className="flex-[2] py-2.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
            <Check className="size-4" /> Completado
          </button>
        </div>
      </div>
    )
  }

  // ── GENERATING ────────────────────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="size-14 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ background: 'rgba(99,102,241,0.2)' }}>
          <Brain className="size-7 text-indigo-400" />
        </div>
        <div className="text-center">
          <p className="font-bold text-foreground">Claude analizando...</p>
          <p className="text-xs text-foreground/40 mt-1">
            Historial + CTL/ATL → plan óptimo para {muscles.join('+')}
          </p>
        </div>
        <div className="flex gap-1 mt-2">
          {[0,1,2].map(i => (
            <div key={i} className="size-1.5 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── EQUIPMENT PICKER ──────────────────────────────────────────────────────
  if (showEquipmentPicker) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">Excluir equipamiento</p>
          <button onClick={() => setShowEquipmentPicker(false)}>
            <X className="size-4 text-foreground/40" />
          </button>
        </div>
        <p className="text-xs text-foreground/40">La IA no propondrá ejercicios con estas máquinas.</p>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map(eq => {
            const active = excluded.includes(eq)
            return (
              <button key={eq} onClick={() => toggleEquipment(eq)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: active ? 'rgba(239,68,68,0.15)' : 'var(--surface)',
                  border: active ? '1px solid rgba(239,68,68,0.35)' : '1px solid var(--surface-border)',
                  color: active ? '#fca5a5' : undefined,
                }}>
                {active ? '✕ ' : ''}{eq}
              </button>
            )
          })}
        </div>
        {excluded.length > 0 && (
          <p className="text-xs text-foreground/30">{excluded.length} excluido{excluded.length > 1 ? 's' : ''}</p>
        )}
        <button onClick={() => setShowEquipmentPicker(false)}
          className="w-full py-2.5 rounded-2xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          Listo
        </button>
      </div>
    )
  }

  // ── CONFIG ────────────────────────────────────────────────────────────────
  // Check if there's a saved plan in localStorage (not yet completed)
  const savedPlanExists = (() => {
    try {
      const s = localStorage.getItem(LS_STEP)
      return localStorage.getItem(LS_PLAN) !== null && s !== 'config' && s !== 'done'
    } catch { return false }
  })()

  return (
    <div className="space-y-5">
      {/* Resume banner when a plan is saved but builder was reset */}
      {savedPlanExists && (
        <button
          onClick={() => {
            const session = loadSession()
            if (session) {
              setStep(session.step)
              setPlan(session.plan)
              setMuscles(session.muscles)
              setCardio(session.cardio)
              setTimeMin(session.timeMin)
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <Brain className="size-4 text-indigo-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-300">Plan pendiente</p>
            <p className="text-xs text-foreground/40">Toca para continuar tu última sesión</p>
          </div>
          <ChevronRight className="size-4 text-indigo-400 shrink-0" />
        </button>
      )}

      {error && (
        <div className="rounded-xl p-3 text-xs text-red-300"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      <div>
        <p className="text-xs text-foreground/40 uppercase tracking-widest mb-2">Tiempo disponible</p>
        <div className="flex gap-2">
          {TIME_OPTIONS.map(t => (
            <button key={t} onClick={() => setTimeMin(t)}
              className="flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all"
              style={{
                background: timeMin === t ? 'rgba(99,102,241,0.25)' : 'var(--surface)',
                border: timeMin === t ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--surface-border)',
                color: timeMin === t ? '#a5b4fc' : undefined,
              }}>
              {t}m
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-foreground/40 uppercase tracking-widest mb-2">Cardio (al final)</p>
        <div className="grid grid-cols-2 gap-2">
          {CARDIO_OPTIONS.map(c => (
            <button key={c.id} onClick={() => setCardio(c.id)}
              className="py-2.5 px-3 rounded-2xl text-sm font-semibold text-left transition-all"
              style={{
                background: cardio === c.id ? 'rgba(16,185,129,0.2)' : 'var(--surface)',
                border: cardio === c.id ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--surface-border)',
                color: cardio === c.id ? '#34d399' : undefined,
              }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-foreground/40 uppercase tracking-widest mb-2">
          Grupos musculares
          {muscles.length > 0 && <span className="text-indigo-400 ml-1">· {muscles.join(', ')}</span>}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {MUSCLE_OPTIONS.map(m => {
            const active = muscles.includes(m.id)
            return (
              <button key={m.id} onClick={() => toggleMuscle(m.id)}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all"
                style={{
                  background: active ? 'rgba(99,102,241,0.2)' : 'var(--surface)',
                  border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--surface-border)',
                }}>
                <span className="text-xl shrink-0">{m.emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground leading-tight">{m.label}</p>
                  <p className="text-[10px] text-foreground/35 truncate">{m.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <button onClick={() => setShowEquipmentPicker(true)}
        className="w-full py-2 rounded-xl text-xs text-foreground/40 flex items-center justify-center gap-1.5"
        style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
        {excluded.length > 0
          ? <><span className="size-1.5 rounded-full bg-red-400" />{excluded.length} equipo{excluded.length > 1 ? 's' : ''} excluido{excluded.length > 1 ? 's' : ''}</>
          : <>Excluir equipamiento</>}
      </button>

      <button
        onClick={handleGenerate}
        disabled={muscles.length === 0 || isPending}
        className="w-full py-3.5 rounded-2xl font-bold text-white disabled:opacity-30 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
        <Brain className="size-4" />
        Generar plan con IA
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
