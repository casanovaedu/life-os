import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const auth = vi.hoisted(() => ({ session: null as null | { user: { id: string } } }))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getSession: vi.fn(async () => ({ data: { session: auth.session } })) },
  })),
}))

const { proxy } = await import('@/proxy')

const run = (path: string) => proxy(new NextRequest(new URL(path, 'http://localhost:3000')))

beforeEach(() => {
  auth.session = null
})

describe('proxy', () => {
  it.each(['/', '/gastos', '/cuentas', '/salud', '/entrenos', '/api/garmin-sync'])(
    'redirects unauthenticated %s to /login',
    async path => {
      const res = await run(path)
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe('http://localhost:3000/login')
    },
  )

  it.each(['/login', '/auth/callback'])('lets unauthenticated %s through', async path => {
    const res = await run(path)
    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('lets authenticated requests through', async () => {
    auth.session = { user: { id: 'u1' } }
    const res = await run('/gastos')
    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
})
