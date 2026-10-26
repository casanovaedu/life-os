import { vi } from 'vitest'

type Result = { data?: unknown; error?: unknown }

/**
 * Chainable stand-in for the supabase-js query builder. Every builder method
 * records its call and returns the builder; awaiting the builder resolves to
 * the next queued result for that table (or `{ data: null, error: null }`).
 */
export function createSupabaseMock() {
  const calls: { table: string; method: string; args: unknown[] }[] = []
  const results = new Map<string, Result[]>()
  const order: string[] = []

  function builder(table: string) {
    const b: Record<string, unknown> = {}
    for (const method of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'order']) {
      b[method] = vi.fn((...args: unknown[]) => {
        calls.push({ table, method, args })
        return b
      })
    }
    b.then = (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) => {
      order.push(`from:${table}`)
      const queued = results.get(table)?.shift() ?? { data: null, error: null }
      return Promise.resolve(queued).then(resolve, reject)
    }
    return b
  }

  const client = {
    from: vi.fn((table: string) => builder(table)),
    rpc: vi.fn(async (fn: string, args: unknown) => {
      order.push(`rpc:${fn}`)
      void args
      return results.get(`rpc:${fn}`)?.shift() ?? { data: null, error: null }
    }),
  }

  return {
    client,
    /** Builder calls made against `table`, as [method, ...args]. */
    callsFor: (table: string) => calls.filter(c => c.table === table).map(c => [c.method, ...c.args]),
    /** Queue the result of the next awaited query on `table` (or `rpc:<name>`). */
    queue(key: string, result: Result) {
      results.set(key, [...(results.get(key) ?? []), result])
    },
    /** The order in which queries/RPCs were awaited. */
    order,
    reset() {
      calls.length = 0
      order.length = 0
      results.clear()
      client.from.mockClear()
      client.rpc.mockClear()
    },
  }
}
