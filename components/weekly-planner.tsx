'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DAY_FULL   = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const OPTIONS = [
  { id: 'push',    label: 'Push',     color: '#818cf8' },
  { id: 'pull',    label: 'Pull',     color: '#60a5fa' },
  { id: 'legs',    label: 'Pierna',   color: '#34d399' },
  { id: 'arms',    label: 'Brazos',   color: '#f472b6' },
  { id: 'upper',   label: 'Upper',    color: '#a78bfa' },
  { id: 'core',    label: 'Core',     color: '#fbbf24' },
  { id: 'pilates', label: 'Pilates',  color: '#2dd4bf' },
  { id: 'cardio',  label: 'Cardio',   color: '#f97316' },
  { id: 'run',     label: 'Running',  color: '#fb7185' },
  { id: 'rest',    label: 'Descanso', color: 'rgba(255,255,255,0.2)' },
]
const DEFAULT_PLAN = ['pull', 'push', 'rest', 'legs', 'cardio', 'upper', 'rest']

// ── ISO week helpers ──────────────────────────────────────────────────────────
function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { week, year: d.getUTCFullYear() }
}

function getMondayOfISOWeek(week: number, year: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dow = simple.getDay()
  const monday = new Date(simple)
  if (dow <= 4) monday.setDate(simple.getDate() - simple.getDay() + 1)
  else monday.setDate(simple.getDate() + 8 - simple.getDay())
  return monday
}

function weekKey(week: number, year: number) {
  return `weekly_plan_${year}_W${String(week).padStart(2, '0')}`
}

function nextOption(current: string): string {
  const idx = OPTIONS.findIndex(o => o.id === current)
  return OPTIONS[(idx + 1) % OPTIONS.length].id
}

export function WeeklyPlanner() {
  const today = new Date()
  const { week: todayWeek, year: todayYear } = getISOWeek(today)

  const [currentWeek, setCurrentWeek] = useState(todayWeek)
  const [currentYear, setCurrentYear] = useState(todayYear)
  const [plan, setPlan] = useState<string[]>(DEFAULT_PLAN)
  const [editing, setEditing] = useState(false)

  // Load plan for current viewed week
  useEffect(() => {
    try {
      const saved = localStorage.getItem(weekKey(currentWeek, currentYear))
      if (saved) {
        setPlan(JSON.parse(saved))
      } else {
        // Try to inherit previous week's plan as default
        const prevWeek = currentWeek > 1 ? currentWeek - 1 : 52
        const prevYear = currentWeek > 1 ? currentYear : currentYear - 1
        const prevSaved = localStorage.getItem(weekKey(prevWeek, prevYear))
        setPlan(prevSaved ? JSON.parse(prevSaved) : DEFAULT_PLAN)
      }
    } catch {
      setPlan(DEFAULT_PLAN)
    }
  }, [currentWeek, currentYear])

  function navigateWeek(delta: number) {
    let w = currentWeek + delta
    let y = currentYear
    if (w < 1) { w = 52; y -= 1 }
    else if (w > 52) { w = 1; y += 1 }
    setCurrentWeek(w)
    setCurrentYear(y)
  }

  function cycle(dayIdx: number) {
    if (!editing) return
    const next = [...plan]
    next[dayIdx] = nextOption(next[dayIdx])
    setPlan(next)
    localStorage.setItem(weekKey(currentWeek, currentYear), JSON.stringify(next))
  }

  const monday = getMondayOfISOWeek(currentWeek, currentYear)
  const isThisWeek = currentWeek === todayWeek && currentYear === todayYear

  // Day-of-week index in viewed week (0=Mon…6=Sun)
  const todayDayIdx = (() => {
    if (!isThisWeek) return -1
    const d = today.getDay()
    return d === 0 ? 6 : d - 1
  })()

  const weekStart = monday
  const weekEnd = new Date(monday)
  weekEnd.setDate(monday.getDate() + 6)

  const dateLabel = (i: number) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return `${d.getDate()}/${MONTHS_SHORT[d.getMonth()]}`
  }

  return (
    <div>
      {/* Week header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigateWeek(-1)}
          className="size-7 flex items-center justify-center rounded-full transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          <ChevronLeft className="size-4 text-foreground/50" />
        </button>

        <div className="text-center">
          <p className="text-xs font-bold text-foreground/70">
            Semana {currentWeek}
            {isThisWeek && <span className="ml-1.5 text-indigo-400">·  Esta semana</span>}
          </p>
          <p className="text-[10px] text-foreground/30">
            {weekStart.getDate()} {MONTHS_SHORT[weekStart.getMonth()]} – {weekEnd.getDate()} {MONTHS_SHORT[weekEnd.getMonth()]} {currentYear}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {!isThisWeek && (
            <button onClick={() => { setCurrentWeek(todayWeek); setCurrentYear(todayYear) }}
              className="text-[10px] px-2 py-0.5 rounded-full text-indigo-400"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
              Hoy
            </button>
          )}
          <button onClick={() => navigateWeek(1)}
            className="size-7 flex items-center justify-center rounded-full"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            <ChevronRight className="size-4 text-foreground/50" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-foreground/40 uppercase tracking-widest">Plan semanal</p>
        <button
          onClick={() => setEditing(e => !e)}
          className="text-xs px-2.5 py-1 rounded-lg transition-all"
          style={{
            background: editing ? 'rgba(99,102,241,0.2)' : 'var(--surface)',
            color: editing ? '#a5b4fc' : undefined,
            border: '1px solid var(--surface-border)',
          }}>
          {editing ? 'Listo' : 'Editar'}
        </button>
      </div>

      {editing && (
        <p className="text-xs text-foreground/35 mb-2">Toca un día para cambiar la actividad</p>
      )}

      <div className="grid grid-cols-7 gap-1">
        {DAYS_SHORT.map((day, i) => {
          const actId = plan[i] ?? 'rest'
          const opt = OPTIONS.find(o => o.id === actId) ?? OPTIONS[OPTIONS.length - 1]
          const isToday = i === todayDayIdx
          const isRest = actId === 'rest'

          return (
            <button
              key={day}
              onClick={() => cycle(i)}
              disabled={!editing}
              className="flex flex-col items-center gap-1 py-2 rounded-2xl transition-all"
              style={{
                background: isToday ? `${opt.color}22` : 'var(--surface)',
                border: isToday ? `1.5px solid ${opt.color}` : '1px solid var(--surface-border)',
              }}>
              <span className={`text-[9px] uppercase tracking-wider font-semibold ${isToday ? 'text-foreground' : 'text-foreground/40'}`}>
                {day}
              </span>
              <span className="text-[8px] text-foreground/25">{dateLabel(i)}</span>
              <div className="size-5 rounded-full flex items-center justify-center"
                style={{ background: isRest ? 'transparent' : `${opt.color}22` }}>
                {isRest
                  ? <span className="text-foreground/20 text-[10px]">—</span>
                  : <span className="size-2 rounded-full" style={{ background: opt.color }} />
                }
              </div>
              <span className="text-[8px] font-bold leading-tight text-center px-0.5"
                style={{ color: isRest ? 'rgba(255,255,255,0.15)' : opt.color }}>
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Today's focus */}
      {isThisWeek && (() => {
        const todayAct = OPTIONS.find(o => o.id === plan[todayDayIdx]) ?? OPTIONS[OPTIONS.length - 1]
        if (todayAct.id === 'rest') return null
        return (
          <div className="mt-3 rounded-xl px-3 py-2 flex items-center gap-2"
            style={{ background: `${todayAct.color}15`, border: `1px solid ${todayAct.color}33` }}>
            <span className="size-2 rounded-full shrink-0" style={{ background: todayAct.color }} />
            <span className="text-xs text-foreground/60">
              Hoy: <span className="font-bold" style={{ color: todayAct.color }}>{todayAct.label}</span>
              {' '}— {DAY_FULL[todayDayIdx]}
            </span>
          </div>
        )
      })()}
    </div>
  )
}
