import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { createSupabaseMock } from './supabase-mock'

const db = vi.hoisted(() => ({ mock: null as unknown as ReturnType<typeof createSupabaseMock> }))

vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('./supabase-mock')
  db.mock = createSupabaseMock()
  return { supabase: db.mock.client }
})
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const { revalidatePath } = await import('next/cache')
const actions = await import('@/lib/actions')

const revalidated = () => vi.mocked(revalidatePath).mock.calls.map(c => c[0])

beforeEach(() => {
  db.mock.reset()
  vi.mocked(revalidatePath).mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('deleteExpense', () => {
  it('deletes the expense, refunds the account and revalidates / and /gastos', async () => {
    await actions.deleteExpense('exp-1', 'Revolut', 12.5)

    expect(db.mock.callsFor('expenses')).toEqual([['delete'], ['eq', 'id', 'exp-1']])
    expect(db.mock.client.rpc).toHaveBeenCalledExactlyOnceWith('add_to_account', {
      account_name: 'Revolut',
      add_amount: 12.5,
    })
    expect(db.mock.order).toEqual(['from:expenses', 'rpc:add_to_account'])
    expect(revalidated()).toEqual(['/', '/gastos'])
  })

  // BUG (documented, not fixed): the Supabase error is ignored, so the account is
  // still refunded even though the expense row was not deleted.
  it('still refunds the account when the delete fails', async () => {
    db.mock.queue('expenses', { error: { message: 'delete failed' } })

    await expect(actions.deleteExpense('exp-1', 'Revolut', 12.5)).resolves.toBeUndefined()

    expect(db.mock.client.rpc).toHaveBeenCalledWith('add_to_account', expect.anything())
    expect(revalidated()).toEqual(['/', '/gastos'])
  })

  // BUG (documented, not fixed): RPC errors are ignored too, leaving the expense
  // deleted but the balance not refunded.
  it('resolves silently when the refund RPC fails', async () => {
    db.mock.queue('rpc:add_to_account', { error: { message: 'rpc failed' } })
    await expect(actions.deleteExpense('exp-1', 'Revolut', 12.5)).resolves.toBeUndefined()
  })
})

describe('addExpense', () => {
  const expense = { amount: 8.4, concept: 'Mercadona', category: 'Supermarket', account: 'Revolut', date: '2026-10-26' }

  it('inserts a manual expense, deducts from the account and revalidates / and /gastos', async () => {
    await actions.addExpense(expense)

    expect(db.mock.callsFor('expenses')).toEqual([['insert', { ...expense, source: 'manual' }]])
    expect(db.mock.client.rpc).toHaveBeenCalledExactlyOnceWith('deduct_from_account', {
      account_name: 'Revolut',
      deduct_amount: 8.4,
    })
    expect(db.mock.order).toEqual(['from:expenses', 'rpc:deduct_from_account'])
    expect(revalidated()).toEqual(['/', '/gastos'])
  })

  // BUG (documented, not fixed): a failed insert still deducts the balance.
  it('still deducts from the account when the insert fails', async () => {
    db.mock.queue('expenses', { error: { message: 'insert failed' } })

    await expect(actions.addExpense(expense)).resolves.toBeUndefined()

    expect(db.mock.client.rpc).toHaveBeenCalledWith('deduct_from_account', expect.anything())
  })
})

describe('updateAccountBalance', () => {
  it('updates balance + updated_at by id and revalidates / and /cuentas', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T10:00:00Z'))

    await actions.updateAccountBalance('acc-1', 1500)

    expect(db.mock.callsFor('accounts')).toEqual([
      ['update', { balance: 1500, updated_at: '2026-10-26T10:00:00.000Z' }],
      ['eq', 'id', 'acc-1'],
    ])
    expect(revalidated()).toEqual(['/', '/cuentas'])
  })
})

describe('upsertBudget', () => {
  it('upserts on (month, category) and revalidates /gastos and /', async () => {
    await actions.upsertBudget('2026-10-01', 'Ocio', 120)

    expect(db.mock.callsFor('budgets')).toEqual([
      ['upsert', { month: '2026-10-01', category: 'Ocio', amount: 120 }, { onConflict: 'month,category' }],
    ])
    expect(revalidated()).toEqual(['/gastos', '/'])
  })
})

describe('copyBudgetFromMonth', () => {
  it('copies every category of the source month into the target month', async () => {
    db.mock.queue('budgets', {
      data: [
        { category: 'Ocio', amount: 120 },
        { category: 'Supermarket', amount: 300 },
      ],
    })

    await actions.copyBudgetFromMonth('2026-09-01', '2026-10-01')

    expect(db.mock.callsFor('budgets')).toEqual([
      ['select', 'category, amount'],
      ['eq', 'month', '2026-09-01'],
      [
        'upsert',
        [
          { month: '2026-10-01', category: 'Ocio', amount: 120 },
          { month: '2026-10-01', category: 'Supermarket', amount: 300 },
        ],
        { onConflict: 'month,category' },
      ],
    ])
    expect(revalidated()).toEqual(['/gastos'])
  })

  it.each([[null], [[]]])('does nothing when the source month has no budgets (%j)', async data => {
    db.mock.queue('budgets', { data })

    await actions.copyBudgetFromMonth('2026-09-01', '2026-10-01')

    expect(db.mock.callsFor('budgets').map(c => c[0])).toEqual(['select', 'eq'])
    expect(revalidated()).toEqual([])
  })
})

describe('logWorkout', () => {
  it('inserts the workout with a computed load and revalidates /salud', async () => {
    await actions.logWorkout({ date: '2026-10-26', type: 'Gym', duration_min: 60, rpe: 7 })

    expect(db.mock.callsFor('workouts')).toEqual([
      ['insert', { date: '2026-10-26', type: 'Gym', duration_min: 60, rpe: 7, load: 63, source: 'app_builder' }],
    ])
    expect(revalidated()).toEqual(['/salud'])
  })

  it('sets load to null when duration or RPE is missing', async () => {
    await actions.logWorkout({ date: '2026-10-26', type: 'Gym', duration_min: 60 })
    expect(db.mock.callsFor('workouts')[0][1]).toMatchObject({ load: null })
  })

  // The try/catch only catches thrown errors; a Supabase `{ error }` result
  // (e.g. missing table) is ignored and the path is still revalidated.
  it('ignores Supabase errors', async () => {
    db.mock.queue('workouts', { error: { message: 'relation "workouts" does not exist' } })
    await expect(actions.logWorkout({ date: '2026-10-26', type: 'Gym' })).resolves.toBeUndefined()
    expect(revalidated()).toEqual(['/salud'])
  })
})

describe('logHealthMetric', () => {
  it('upserts a (date, metric) row into health_metrics and revalidates /salud', async () => {
    await actions.logHealthMetric('2026-10-26', 'weight', 88.4)

    expect(db.mock.callsFor('health_metrics')).toEqual([
      ['upsert', { date: '2026-10-26', metric: 'weight', value: 88.4, source: 'manual' }, { onConflict: 'date,metric' }],
    ])
    expect(revalidated()).toEqual(['/salud'])
  })
})

describe('workout confirmation', () => {
  it('confirmWorkout marks one workout as garmin', async () => {
    await actions.confirmWorkout('w-1')

    expect(db.mock.callsFor('workouts')).toEqual([['update', { source: 'garmin' }], ['eq', 'id', 'w-1']])
    expect(revalidated()).toEqual(['/salud', '/entrenos'])
  })

  it('confirmAllPendingWorkouts marks every garmin_pending workout as garmin', async () => {
    await actions.confirmAllPendingWorkouts()

    expect(db.mock.callsFor('workouts')).toEqual([
      ['update', { source: 'garmin' }],
      ['eq', 'source', 'garmin_pending'],
    ])
    expect(revalidated()).toEqual(['/salud', '/entrenos'])
  })

  it('discardWorkout deletes the workout and revalidates /salud', async () => {
    await actions.discardWorkout('w-1')

    expect(db.mock.callsFor('workouts')).toEqual([['delete'], ['eq', 'id', 'w-1']])
    expect(revalidated()).toEqual(['/salud'])
  })
})

describe('triggerGarminSync', () => {
  it('returns an error without calling fetch when the webhook is not configured', async () => {
    vi.stubEnv('N8N_GARMIN_WEBHOOK_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await actions.triggerGarminSync()).toEqual({ imported: 0, error: 'Webhook no configurado' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts a 7-day sync request and returns the imported count', async () => {
    vi.stubEnv('N8N_GARMIN_WEBHOOK_URL', 'https://n8n.test/hook')
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ imported: 3 }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await actions.triggerGarminSync()).toEqual({ imported: 3 })
    expect(fetchMock).toHaveBeenCalledWith('https://n8n.test/hook', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'sync', days: 7 }),
    }))
    expect(revalidated()).toEqual(['/salud'])
  })

  it('defaults imported to 0 when the response body is not JSON', async () => {
    vi.stubEnv('N8N_GARMIN_WEBHOOK_URL', 'https://n8n.test/hook')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok')))

    expect(await actions.triggerGarminSync()).toEqual({ imported: 0 })
  })

  it('reports non-2xx responses and network errors', async () => {
    vi.stubEnv('N8N_GARMIN_WEBHOOK_URL', 'https://n8n.test/hook')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 502 })))
    expect(await actions.triggerGarminSync()).toEqual({ imported: 0, error: 'n8n error: 502' })

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    expect(await actions.triggerGarminSync()).toEqual({ imported: 0, error: 'ECONNREFUSED' })
    expect(revalidated()).toEqual([])
  })
})

describe('generateWorkoutPlan', () => {
  const params = {
    muscles: ['Pecho', 'Tríceps'],
    cardio: 'Cinta',
    time_min: 60,
    fitness_state: { ctl: 40, atl: 55, tsb: -15 },
    recent_workouts: [],
  }
  const plan = { intent: 'x', fatigue_warning: null, sections: [], cardio: null, insight: 'y' }

  it('throws when ANTHROPIC_API_KEY is missing or still the placeholder', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    await expect(actions.generateWorkoutPlan(params)).rejects.toThrow('ANTHROPIC_API_KEY not set')
    vi.stubEnv('ANTHROPIC_API_KEY', 'your_anthropic_api_key_here')
    await expect(actions.generateWorkoutPlan(params)).rejects.toThrow('ANTHROPIC_API_KEY not set')
  })

  it('calls the Messages API and parses a fenced JSON reply', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test')
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ content: [{ text: '```json\n' + JSON.stringify(plan) + '\n```' }] }),
    )
    vi.stubGlobal('fetch', fetchMock)

    expect(await actions.generateWorkoutPlan(params)).toEqual(plan)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(init.headers['x-api-key']).toBe('sk-test')
    const prompt: string = JSON.parse(init.body).messages[0].content
    // 28% of the session goes to cardio when cardio is selected.
    expect(prompt).toContain('43min fuerza + 17min cardio Cinta')
    expect(prompt).toContain('Músculos: Pecho, Tríceps')
  })

  it('throws on a non-2xx API response', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 529 })))
    await expect(actions.generateWorkoutPlan(params)).rejects.toThrow('Claude API error: 529')
  })
})

describe('sendWorkoutToTelegram', () => {
  const plan = {
    intent: 'Empuje',
    fatigue_warning: null,
    sections: [{
      name: 'Bloque',
      duration_min: 40,
      focus: 'Hipertrofia',
      exercises: [{ name: 'Press banca', equipment: 'Barra', sets: 4, reps: '8-10', rest_s: 120, tip: 'Codos 45°' }],
    }],
    cardio: null,
    insight: 'Dato',
  }
  const params = { muscles: ['Pecho'], time_min: 60, fitnessState: { ctl: 40, atl: 55, tsb: -25 } }

  it('does nothing when the webhook is not configured', async () => {
    vi.stubEnv('N8N_GYM_WEBHOOK_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await actions.sendWorkoutToTelegram(plan, params)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts the formatted plan to the webhook', async () => {
    vi.stubEnv('N8N_GYM_WEBHOOK_URL', 'https://n8n.test/gym')
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'))
    vi.stubGlobal('fetch', fetchMock)

    await actions.sendWorkoutToTelegram(plan, params)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://n8n.test/gym')
    const body = JSON.parse(init.body)
    expect(body.plan_json).toEqual(plan)
    expect(body.text).toContain('<b>Press banca</b> (Barra) — 4×8-10, 120s descanso')
    expect(body.text).toContain('TSB 🔴 -25')
  })

  it('swallows webhook failures', async () => {
    vi.stubEnv('N8N_GYM_WEBHOOK_URL', 'https://n8n.test/gym')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    await expect(actions.sendWorkoutToTelegram(plan, params)).resolves.toBeUndefined()
  })
})
