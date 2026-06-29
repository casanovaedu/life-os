'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GymMode } from '@/components/gym-mode'
import type { WorkoutPlan } from '@/lib/actions'

export default function GymPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gym_active_plan')
      if (stored) setPlan(JSON.parse(stored))
    } catch {}
    setLoading(false)
  }, [])

  if (loading) return null

  if (!plan) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-foreground/40 text-sm">No hay plan activo.</p>
        <button onClick={() => router.push('/salud')}
          className="text-indigo-400 text-sm underline">
          Volver a Salud
        </button>
      </div>
    )
  }

  return (
    <GymMode
      plan={plan}
      onClose={() => {
        router.push('/salud')
      }}
    />
  )
}
