'use client'

import { useState, useTransition } from 'react'
import { triggerGarminSync, confirmWorkout, confirmAllPendingWorkouts, discardWorkout } from '@/lib/actions'
import { RefreshCw, Check, X, Zap } from 'lucide-react'
import { useSWRConfig } from 'swr'

const ACTIVITY_EMOJI: Record<string, string> = {
  run:      '🏃',
  running:  '🏃',
  ride:     '🚴',
  cycling:  '🚴',
  swim:     '🏊',
  walk:     '🚶',
  hike:     '🥾',
  yoga:     '🧘',
  pilates:  '🧘',
  gym:            '🏋️',
  strength:       '🏋️',
  weighttraining: '🏋️',
  workout:        '💪',
}

function activityEmoji(type: string) {
  const lower = type.toLowerCase()
  for (const [k, v] of Object.entries(ACTIVITY_EMOJI)) {
    if (lower.includes(k)) return v
  }
  return '⚡'
}

type PendingWorkout = {
  id: string
  date: string
  type: string
  duration_min: number | null
  notes: string | null
  source: string
}

export function GarminSync({ pendingWorkouts }: { pendingWorkouts: PendingWorkout[] }) {
  const [syncing, startSync] = useTransition()
  const [confirming, startConfirm] = useTransition()
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const { mutate } = useSWRConfig()

  const visible = pendingWorkouts.filter(w => !dismissed.has(w.id))

  function handleSync() {
    setSyncMsg(null)
    startSync(async () => {
      const res = await triggerGarminSync()
      if (res.error) {
        setSyncMsg(res.error)
      } else {
        setSyncMsg(res.imported > 0 ? `${res.imported} actividades importadas` : 'Sincronizado ✓')
      }
    })
  }

  function handleConfirm(id: string) {
    startConfirm(async () => {
      await confirmWorkout(id)
      setDismissed(prev => new Set([...prev, id]))
      mutate(key => true, undefined, { revalidate: true })
    })
  }

  function handleDiscard(id: string) {
    startConfirm(async () => {
      await discardWorkout(id)
      setDismissed(prev => new Set([...prev, id]))
      mutate(key => true, undefined, { revalidate: true })
    })
  }

  function handleConfirmAll() {
    startConfirm(async () => {
      await confirmAllPendingWorkouts()
      setDismissed(new Set(pendingWorkouts.map(w => w.id)))
      mutate(key => true, undefined, { revalidate: true })
    })
  }

  return (
    <div className="space-y-3">
      {/* Sync button + status */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
          <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sync Garmin'}
        </button>

        {syncMsg && (
          <p className="text-xs text-foreground/40 flex-1">{syncMsg}</p>
        )}

        {visible.length > 1 && (
          <button
            onClick={handleConfirmAll}
            disabled={confirming}
            className="ml-auto text-xs px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
            Registrar todas ({visible.length})
          </button>
        )}
      </div>

      {/* Pending activities */}
      {visible.length > 0 && (
        <div className="rounded-2xl overflow-hidden divide-y divide-foreground/5"
          style={{ border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.04)' }}>
          <div className="px-4 py-2 flex items-center gap-2">
            <Zap className="size-3 text-emerald-400" />
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              Pendientes de registrar · {visible.length}
            </p>
          </div>
          {visible.map(w => (
            <div key={w.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl shrink-0">{activityEmoji(w.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground capitalize">{w.type}</p>
                <p className="text-xs text-foreground/35">
                  {w.date}{w.duration_min ? ` · ${w.duration_min} min` : ''}{w.notes ? ` · ${w.notes}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleDiscard(w.id)}
                  disabled={confirming}
                  className="size-8 flex items-center justify-center rounded-xl disabled:opacity-30"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <X className="size-3.5 text-red-400" />
                </button>
                <button
                  onClick={() => handleConfirm(w.id)}
                  disabled={confirming}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-30"
                  style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
                  <Check className="size-3" />
                  Registrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {visible.length === 0 && !syncMsg && (
        <p className="text-xs text-foreground/25">Sin actividades pendientes</p>
      )}
    </div>
  )
}
