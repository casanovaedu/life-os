'use client'

import { useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function LoginPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    const supabase = createSupabaseBrowser()
    await supabase.auth.signInWithOtp({
      email: 'casanovaeduard@gmail.com',
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <p className="text-xs text-foreground/40 uppercase tracking-widest font-medium mb-2">Life OS</p>
          <p className="text-foreground/50 text-sm">Acceso privado</p>
        </div>

        {sent ? (
          <div
            className="rounded-2xl p-6 space-y-2"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
          >
            <p className="text-2xl">📬</p>
            <p className="font-semibold text-foreground">Revisa tu email</p>
            <p className="text-sm text-foreground/50">
              Te hemos enviado un enlace a<br />
              <span className="text-foreground/80">casanovaeduard@gmail.com</span>
            </p>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-semibold text-sm transition-opacity disabled:opacity-50"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--foreground)' }}
          >
            {loading ? 'Enviando...' : 'Enviar enlace de acceso'}
          </button>
        )}
      </div>
    </div>
  )
}
