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
  if (pathname === '/gym') return null

  const activeIndex = NAV_ITEMS.findIndex(item => item.href === pathname)

  return (
    <nav className="fixed bottom-4 left-2 right-2 z-50 flex items-center justify-center">
      <div
        className="relative flex items-center p-1 rounded-full shadow-2xl"
        style={{
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          background: 'var(--nav-bg)',
          border: '1px solid var(--nav-border)',
        }}
      >
        {/* Sliding active pill */}
        {activeIndex >= 0 && (
          <div
            className="absolute top-1 bottom-1 rounded-full pointer-events-none"
            style={{
              width: '20%',
              left: `calc(${activeIndex} * 20%)`,
              background: 'var(--nav-active-bg)',
              boxShadow: '0 0 12px rgba(190,255,0,0.15)',
              transition: 'left 0.35s cubic-bezier(0.34, 1.4, 0.64, 1)',
            }}
          />
        )}

        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-full z-10"
              style={{ width: '20%' }}
            >
              <Icon
                className="size-5"
                strokeWidth={active ? 2.5 : 1.5}
                style={{ color: active ? 'var(--nav-active-color)' : 'var(--nav-inactive-color)', transition: 'color 0.2s' }}
              />
              <span
                className="text-[9px] tracking-wide"
                style={{
                  color: active ? 'var(--nav-active-color)' : 'var(--nav-inactive-color)',
                  fontWeight: active ? 700 : 400,
                  transition: 'color 0.2s, font-weight 0.2s',
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
