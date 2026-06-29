'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) { router.replace('/'); return }

    const supabase = createSupabaseBrowser()
    supabase.auth.exchangeCodeForSession(code).then(() => {
      router.replace('/')
    })
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-foreground/40 text-sm">Iniciando sesión...</p>
    </div>
  )
}
