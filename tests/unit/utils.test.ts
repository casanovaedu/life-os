import { describe, expect, it } from 'vitest'
import { cn, formatEuro } from '@/lib/utils'
import { VARIABLE_CATEGORIES } from '@/lib/constants'

describe('cn', () => {
  it('joins class names and drops falsy values', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c')
  })

  it('lets later Tailwind classes win conflicts', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('text-red-500', { 'text-lime-400': true })).toBe('text-lime-400')
  })
})

describe('formatEuro', () => {
  it('formats with two decimals, comma decimal separator and dot thousands', () => {
    expect(formatEuro(0)).toBe('€0,00')
    expect(formatEuro(12.5)).toBe('€12,50')
    expect(formatEuro(1234.56)).toBe('€1.234,56')
    expect(formatEuro(1234567.891)).toBe('€1.234.567,89')
  })

  it('puts the minus sign before the euro symbol', () => {
    expect(formatEuro(-12.5)).toBe('-€12,50')
    expect(formatEuro(-1234.5)).toBe('-€1.234,50')
  })

  it('rounds decimals half-up via toFixed', () => {
    expect(formatEuro(9.999)).toBe('€10,00')
    expect(formatEuro(999.999)).toBe('€1.000,00')
  })

  it('drops decimals and rounds when whole = true', () => {
    expect(formatEuro(1234.4, true)).toBe('€1.234')
    expect(formatEuro(1234.5, true)).toBe('€1.235')
    expect(formatEuro(-2500.6, true)).toBe('-€2.501')
  })

  // Current behaviour: tiny negatives keep the minus sign even though they round to zero.
  it('keeps the minus sign for negatives that round to zero', () => {
    expect(formatEuro(-0.001)).toBe('-€0,00')
    expect(formatEuro(-0.4, true)).toBe('-€0')
  })
})

describe('VARIABLE_CATEGORIES', () => {
  it('has no duplicates', () => {
    expect(new Set(VARIABLE_CATEGORIES).size).toBe(VARIABLE_CATEGORIES.length)
  })
})
