'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Receipt, Wallet, Activity, Dumbbell } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',         icon: LayoutDashboard, label: 'Inicio'   },
  { href: '/gastos',   icon: Receipt,         label: 'Gastos'   },
  { href: '/cuentas',  icon: Wallet,          label: 'Cuentas'  },
  { href: '/salud',    icon: Activity,        label: 'Salud'    },
  { href: '/entrenos', icon: Dumbbell,        label: 'Entrenos' },
]

export function BottomNav() {
  const pathname = usePathname()
  // Hide nav on fullscreen gym page
  if (pathname === '/gym') return null

  return (
    <nav className="fixed bottom-4 left-2 right-2 z-50 flex items-center justify-center gap-2">
      {/* Main pill */}
      <div
        className="flex items-center p-1 rounded-full shadow-2xl"
        style={{
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          background: 'var(--nav-bg)',
          border: '1px solid var(--nav-border)',
        }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-full transition-all duration-250"
              style={active ? { background: 'var(--nav-active-bg)' } : undefined}
            >
              <Icon
                className="size-5"
                strokeWidth={active ? 2.5 : 1.5}
                style={{ color: active ? 'var(--nav-active-color)' : 'var(--nav-inactive-color)' }}
              />
              <span
                className="text-[9px] tracking-wide"
                style={{
                  color: active ? 'var(--nav-active-color)' : 'var(--nav-inactive-color)',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>

    </nav>
  )
}
