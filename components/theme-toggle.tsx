'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const isDark = stored !== 'light'
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      className="size-8 rounded-full flex items-center justify-center transition-all"
      style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
      aria-label="Cambiar tema"
    >
      {dark
        ? <Sun className="size-3.5 text-foreground/50" />
        : <Moon className="size-3.5 text-foreground/50" />}
    </button>
  )
}
