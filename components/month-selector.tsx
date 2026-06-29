'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function MonthSelector({ current }: { current: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigate(dir: -1 | 1) {
    const live = searchParams.get('m') ?? current
    const [y, m] = live.split('-').map(Number)
    const next_m = m + dir
    const next_y = next_m === 13 ? y + 1 : next_m === 0 ? y - 1 : y
    const real_m = next_m === 13 ? 1 : next_m === 0 ? 12 : next_m
    const next = `${next_y}-${String(real_m).padStart(2, '0')}`
    router.push(`/gastos?m=${next}`)
  }

  const [year, month] = current.split('-').map(Number)
  const raw = new Date(year, month - 1, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  })
  const label = raw.toLowerCase().replace(/^\w/, c => c.toUpperCase())

  return (
    <div className="flex items-center justify-between px-1">
      <button
        onClick={() => navigate(-1)}
        className="p-2 -ml-2 text-foreground/40 hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-5" />
      </button>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <button
        onClick={() => navigate(1)}
        className="p-2 -mr-2 text-foreground/40 hover:text-foreground transition-colors"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  )
}
