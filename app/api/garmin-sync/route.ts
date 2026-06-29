import { NextResponse } from 'next/server'

export async function POST() {
  const webhookUrl = process.env.N8N_GARMIN_WEBHOOK_URL
  if (!webhookUrl) return NextResponse.json({ error: 'Webhook no configurado' })

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync', days: 7 }),
    })
    if (!res.ok) return NextResponse.json({ error: `n8n error: ${res.status}` })
    const json = await res.json().catch(() => ({}))
    return NextResponse.json({ imported: json.imported ?? 0 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error de conexión' })
  }
}
