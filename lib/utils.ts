import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEuro(amount: number, whole = false): string {
  const abs = Math.abs(amount)
  const intPart = whole ? String(Math.round(abs)) : abs.toFixed(2).split('.')[0]
  const decPart = whole ? null : abs.toFixed(2).split('.')[1]
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${amount < 0 ? '-' : ''}€${intFormatted}${decPart ? `,${decPart}` : ''}`
}
