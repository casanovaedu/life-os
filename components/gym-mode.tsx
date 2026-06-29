'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft, Check, Dumbbell } from 'lucide-react'
import type { WorkoutPlan, WorkoutPlanSection } from '@/lib/actions'

type Exercise = WorkoutPlanSection['exercises'][number] & { sectionName: string }

type Props = {
  plan: WorkoutPlan
  onClose: () => void
}

function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    if (left <= 0) { onDone(); return }
    const t = setTimeout(() => setLeft(l => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left, onDone])

  const pct = (left / seconds) * 100
  const min = Math.floor(left / 60)
  const sec = left % 60

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Ring */}
      <div className="relative size-36">
        <svg className="size-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke={left <= 10 ? '#EF4444' : '#6366F1'} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-white tabular-nums">
            {min > 0 ? `${min}:${String(sec).padStart(2,'0')}` : sec}
          </span>
          <span className="text-xs text-white/40 mt-1">descanso</span>
        </div>
      </div>
      <button
        onClick={onDone}
        className="px-8 py-3 rounded-2xl font-bold text-white"
        style={{ background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)' }}
      >
        Saltar descanso
      </button>
    </div>
  )
}

export function GymMode({ plan, onClose }: Props) {
  // Flatten all exercises from all sections
  const allExercises: Exercise[] = plan.sections.flatMap(s =>
    s.exercises.map(e => ({ ...e, sectionName: s.name }))
  )

  const [exIdx, setExIdx] = useState(0)
  const [setsDone, setSetsDone] = useState<number[]>(allExercises.map(() => 0))
  const [resting, setResting] = useState(false)
  const [showCardio, setShowCardio] = useState(false)
  const [done, setDone] = useState(false)

  const current = allExercises[exIdx]

  const markSet = useCallback(() => {
    const newSets = [...setsDone]
    const ex = allExercises[exIdx]
    if (newSets[exIdx] < ex.sets) {
      newSets[exIdx] += 1
      setSetsDone(newSets)
      if (newSets[exIdx] < ex.sets) {
        setResting(true)
      }
    }
  }, [exIdx, setsDone, allExercises])

  function nextExercise() {
    if (exIdx < allExercises.length - 1) {
      setExIdx(i => i + 1)
      setResting(false)
    } else if (plan.cardio) {
      setShowCardio(true)
    } else {
      setDone(true)
    }
  }

  function prevExercise() {
    if (exIdx > 0) { setExIdx(i => i - 1); setResting(false) }
  }

  const currentSets = setsDone[exIdx] ?? 0
  const exSets = current?.sets ?? 0
  const progress = ((exIdx + (currentSets / Math.max(exSets, 1))) / allExercises.length) * 100

  // ── DONE ─────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6"
        style={{ background: 'oklch(0.10 0 0)' }}>
        <div className="size-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Check className="size-10 text-emerald-400" />
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-white">¡Sesión completada!</p>
          <p className="text-sm text-white/40 mt-1">
            {allExercises.length} ejercicios · {plan.sections.reduce((s, sec) => s + sec.duration_min, 0)} min
          </p>
        </div>
        <button onClick={onClose}
          className="mt-4 px-8 py-3.5 rounded-2xl font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
          Volver al app
        </button>
      </div>
    )
  }

  // ── CARDIO ────────────────────────────────────────────────────────────────
  if (showCardio && plan.cardio) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: 'oklch(0.10 0 0)' }}>
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <button onClick={onClose}><X className="size-5 text-white/40" /></button>
          <span className="text-xs text-white/40 font-mono">Cardio</span>
          <div />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
          <div className="size-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{ background: 'rgba(16,185,129,0.2)' }}>
            🏃
          </div>
          <div className="text-center space-y-2">
            <p className="text-3xl font-black text-white capitalize">{plan.cardio.type}</p>
            <p className="text-5xl font-black text-emerald-400">{plan.cardio.duration_min} min</p>
            <p className="text-sm text-white/50 mt-3 leading-relaxed max-w-xs">{plan.cardio.protocol}</p>
          </div>
        </div>
        <div className="px-5 pb-12">
          <button onClick={() => setDone(true)}
            className="w-full py-4 rounded-2xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
            Cardio completado ✓
          </button>
        </div>
      </div>
    )
  }

  // ── REST TIMER ────────────────────────────────────────────────────────────
  if (resting) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: 'oklch(0.10 0 0)' }}>
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <button onClick={onClose}><X className="size-5 text-white/40" /></button>
          <span className="text-xs text-white/40">Serie {currentSets}/{exSets} completada</span>
          <div />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-sm font-semibold text-white/40 mb-2">{current.name}</p>
          <RestTimer seconds={current.rest_s} onDone={() => setResting(false)} />
        </div>
        <div className="px-5 pb-12">
          <p className="text-xs text-white/25 text-center">Siguiente: {current.reps} reps</p>
        </div>
      </div>
    )
  }

  // ── EXERCISE VIEW ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: 'oklch(0.10 0 0)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3">
        <button onClick={onClose}><X className="size-5 text-white/40" /></button>
        <span className="text-xs text-white/40 font-mono">{exIdx + 1}/{allExercises.length}</span>
        <div />
      </div>

      {/* Progress bar */}
      <div className="px-5">
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Section label */}
      <div className="px-5 pt-4">
        <p className="text-xs text-indigo-400 uppercase tracking-widest font-semibold">{current.sectionName}</p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-5 gap-6">
        {/* Exercise icon */}
        <div className="size-16 rounded-3xl flex items-center justify-center"
          style={{ background: 'rgba(99,102,241,0.2)' }}>
          <Dumbbell className="size-8 text-indigo-400" />
        </div>

        {/* Name */}
        <div>
          <h1 className="text-3xl font-black text-white leading-tight">{current.name}</h1>
          <p className="text-base text-white/40 mt-1">{current.equipment}</p>
        </div>

        {/* Sets × Reps */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-4xl font-black text-indigo-400">{current.sets}</p>
            <p className="text-xs text-white/30 uppercase tracking-wider">series</p>
          </div>
          <div className="text-white/20 text-2xl">×</div>
          <div className="text-center">
            <p className="text-4xl font-black text-white">{current.reps}</p>
            <p className="text-xs text-white/30 uppercase tracking-wider">reps</p>
          </div>
          <div className="ml-auto text-center">
            <p className="text-2xl font-black text-white/50">{current.rest_s}s</p>
            <p className="text-xs text-white/30 uppercase tracking-wider">descanso</p>
          </div>
        </div>

        {/* Tip */}
        <div className="rounded-2xl p-3.5"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm text-white/50 italic">{current.tip}</p>
        </div>

        {/* Series dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: exSets }).map((_, i) => (
            <div key={i} className="size-3 rounded-full transition-all"
              style={{ background: i < currentSets ? '#6366F1' : 'rgba(255,255,255,0.1)' }} />
          ))}
          {currentSets < exSets && (
            <span className="text-xs text-white/30 ml-1">{exSets - currentSets} restantes</span>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="px-5 pb-12 space-y-3">
        {currentSets < exSets ? (
          <button onClick={markSet}
            className="w-full py-4 rounded-2xl font-bold text-white text-lg"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
            Serie completada ✓
          </button>
        ) : (
          <button onClick={nextExercise}
            className="w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
            Siguiente ejercicio <ChevronRight className="size-5" />
          </button>
        )}
        <div className="flex gap-3">
          <button onClick={prevExercise} disabled={exIdx === 0}
            className="flex-1 py-3 rounded-2xl text-sm text-white/40 disabled:opacity-30 flex items-center justify-center gap-1"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ChevronLeft className="size-4" /> Anterior
          </button>
          <button onClick={nextExercise}
            className="flex-1 py-3 rounded-2xl text-sm text-white/40 flex items-center justify-center gap-1"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            Saltar <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
