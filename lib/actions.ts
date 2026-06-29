'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from './supabase'

export async function deleteExpense(id: string, account: string, amount: number) {
  await supabase.from('expenses').delete().eq('id', id)
  await supabase.rpc('add_to_account', { account_name: account, add_amount: amount })
  revalidatePath('/')
  revalidatePath('/gastos')
}

export async function addExpense(data: {
  amount: number
  concept: string
  category: string
  account: string
  date: string
}) {
  await supabase.from('expenses').insert({ ...data, source: 'manual' })
  await supabase.rpc('deduct_from_account', {
    account_name: data.account,
    deduct_amount: data.amount,
  })
  revalidatePath('/')
  revalidatePath('/gastos')
}

export async function updateAccountBalance(id: string, balance: number) {
  await supabase
    .from('accounts')
    .update({ balance, updated_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/')
  revalidatePath('/cuentas')
}

export async function upsertBudget(month: string, category: string, amount: number) {
  await supabase
    .from('budgets')
    .upsert({ month, category, amount }, { onConflict: 'month,category' })
  revalidatePath('/gastos')
  revalidatePath('/')
}

export async function copyBudgetFromMonth(fromMonth: string, toMonth: string) {
  const { data } = await supabase.from('budgets').select('category, amount').eq('month', fromMonth)
  if (!data?.length) return
  await supabase.from('budgets').upsert(
    data.map(b => ({ month: toMonth, category: b.category, amount: b.amount })),
    { onConflict: 'month,category' }
  )
  revalidatePath('/gastos')
}

// ─── Workout types ────────────────────────────────────────────────────────────

export type WorkoutPlanSection = {
  name: string
  duration_min: number
  focus: string
  exercises: {
    name: string
    equipment: string
    sets: number
    reps: string
    rest_s: number
    tip: string
  }[]
}

export type WorkoutPlan = {
  intent: string
  fatigue_warning: string | null
  sections: WorkoutPlanSection[]
  cardio: { type: string; duration_min: number; protocol: string } | null
  insight: string
}

export type GenerateParams = {
  muscles: string[]
  cardio: string
  time_min: number
  excluded_equipment?: string[]
  fitness_state: { ctl: number; atl: number; tsb: number }
  recent_workouts: {
    date: string
    type: string
    muscle_groups: string[] | null
    duration_min: number | null
    rpe: number | null
    load: number | null
  }[]
}

export async function generateWorkoutPlan(params: GenerateParams): Promise<WorkoutPlan | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY not set in .env.local')
  }

  const { muscles, cardio, time_min, fitness_state, recent_workouts, excluded_equipment = [] } = params
  const hasCardio = cardio !== 'none' && cardio !== ''
  const cardioMin = hasCardio ? Math.round(time_min * 0.28) : 0
  const strengthMin = time_min - cardioMin

  const historyText = recent_workouts.length === 0
    ? 'Sin entrenamientos previos registrados.'
    : recent_workouts.map(w => {
        const mgStr = w.muscle_groups?.length ? w.muscle_groups.join('+') : w.type
        return `${w.date}: ${mgStr} | ${w.duration_min ?? '?'}min | RPE ${w.rpe ?? '?'} | Carga ${w.load ?? '?'}`
      }).join('\n')

  const tsbStatus = fitness_state.tsb < -20
    ? 'FATIGADO — reduce volumen (-1 serie por ejercicio)'
    : fitness_state.tsb > 10
    ? 'FRESCO — puedes ir a tope hoy'
    : 'NORMAL — entrena con normalidad'

  const prompt = `Eres un entrenador personal de élite especializado en recomposición corporal y estética. Tu cliente es Edu, 89kg, objetivo: definición y pérdida de grasa para verano. Habla en español.

ESTADO DE FORMA (ATL/CTL/TSB):
- Fitness CTL (42d): ${fitness_state.ctl.toFixed(1)}
- Fatiga ATL (7d): ${fitness_state.atl.toFixed(1)}  
- Forma TSB: ${fitness_state.tsb.toFixed(1)} → ${tsbStatus}

HISTORIAL RECIENTE:
${historyText}

SESIÓN DE HOY:
- Tiempo: ${time_min} min (${strengthMin}min fuerza${hasCardio ? ` + ${cardioMin}min cardio ${cardio}` : ', sin cardio'})
- Músculos: ${muscles.join(', ')}

EQUIPAMIENTO EXCLUIDO (NO uses estos ejercicios/máquinas): ${excluded_equipment.length > 0 ? excluded_equipment.join(', ') : 'ninguno'}

FILOSOFÍA: Sobrecarga progresiva para hipertrofia. Cardio siempre LISS Zona 2 (120-135 ppm) para oxidación de grasa sin elevar cortisol. Varía ejercicios respecto al historial. Si TSB < -15, -1 serie/ejercicio.

Devuelve ÚNICAMENTE JSON válido (sin markdown, sin texto extra):
{
  "intent": "Frase estratégica corta",
  "fatigue_warning": null,
  "sections": [
    {
      "name": "Nombre del bloque",
      "duration_min": ${strengthMin},
      "focus": "Hipertrofia — tensión mecánica",
      "exercises": [
        {
          "name": "Nombre ejercicio",
          "equipment": "Máquina/equipo",
          "sets": 4,
          "reps": "8-10",
          "rest_s": 120,
          "tip": "Técnica clave"
        }
      ]
    }
  ],
  "cardio": ${hasCardio ? `{"type":"${cardio}","duration_min":${cardioMin},"protocol":"Zona 2 LISS, 120-135 ppm. Descripción."}` : 'null'},
  "insight": "Dato científico interesante sobre esta sesión"
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)
  const json = await res.json()
  let raw = (json.content[0].text as string).trim()
  raw = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(raw) as WorkoutPlan
}

// ─── Workout logging ──────────────────────────────────────────────────────────

export async function logWorkout(data: {
  date: string
  type: string
  duration_min?: number
  notes?: string
  rpe?: number
  muscle_groups?: string[]
  cardio_type?: string
  cardio_min?: number
  plan_json?: object
  fitness_ctl?: number
  fatigue_atl?: number
  form_tsb?: number
}) {
  const load = data.duration_min && data.rpe
    ? Math.round(data.duration_min * data.rpe * 1.5 / 10)
    : null

  try {
    await supabase.from('workouts').insert({ ...data, load, source: 'app_builder' })
    revalidatePath('/salud')
  } catch {
    // table may not exist yet
  }
}

export async function logHealthMetric(date: string, metric: string, value: number) {
  try {
    await supabase
      .from('health_metrics')
      .upsert({ date, metric, value, source: 'manual' }, { onConflict: 'date,metric' })
    revalidatePath('/salud')
  } catch {
    // table may not exist yet
  }
}

// ─── Garmin sync via n8n ─────────────────────────────────────────────────────

export async function triggerGarminSync(): Promise<{ imported: number } | null> {
  const webhookUrl = process.env.N8N_GARMIN_WEBHOOK_URL
  if (!webhookUrl) throw new Error('N8N_GARMIN_WEBHOOK_URL not set in .env.local')
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync', days: 7 }),
    })
    if (!res.ok) throw new Error(`n8n error: ${res.status}`)
    const json = await res.json().catch(() => ({}))
    revalidatePath('/salud')
    return { imported: json.imported ?? 0 }
  } catch (e) {
    throw e
  }
}

export async function confirmWorkout(id: string) {
  await supabase
    .from('workouts')
    .update({ source: 'garmin' })
    .eq('id', id)
  revalidatePath('/salud')
  revalidatePath('/entrenos')
}

export async function confirmAllPendingWorkouts() {
  await supabase
    .from('workouts')
    .update({ source: 'garmin' })
    .eq('source', 'garmin_pending')
  revalidatePath('/salud')
  revalidatePath('/entrenos')
}

export async function discardWorkout(id: string) {
  await supabase.from('workouts').delete().eq('id', id)
  revalidatePath('/salud')
}

// ─── Optional Telegram via n8n webhook ───────────────────────────────────────

export async function sendWorkoutToTelegram(
  plan: WorkoutPlan,
  params: { muscles: string[]; time_min: number; fitnessState: { ctl: number; atl: number; tsb: number } }
) {
  const webhookUrl = process.env.N8N_GYM_WEBHOOK_URL
  if (!webhookUrl) return // silently skip if not configured

  const exerciseSummary = plan.sections
    .flatMap(s => s.exercises.map(e => `• <b>${e.name}</b> (${e.equipment}) — ${e.sets}×${e.reps}, ${e.rest_s}s descanso\n  <i>${e.tip}</i>`))
    .join('\n')

  const cardioText = plan.cardio
    ? `\n\n🏃 <b>CARDIO — ${plan.cardio.type}</b> · ${plan.cardio.duration_min} min\n<i>${plan.cardio.protocol}</i>`
    : ''

  const tsbEmoji = params.fitnessState.tsb < -20 ? '🔴' : params.fitnessState.tsb > 5 ? '🟢' : '🟡'

  const text = `🏋️ <b>Plan de entrenamiento — ${params.muscles.join(' + ')}</b>
⏱ ${params.time_min} min | CTL ${params.fitnessState.ctl.toFixed(0)} | ATL ${params.fitnessState.atl.toFixed(0)} | TSB ${tsbEmoji} ${params.fitnessState.tsb.toFixed(0)}

⚡ <i>${plan.intent}</i>${plan.fatigue_warning ? `\n⚠️ ${plan.fatigue_warning}` : ''}

${exerciseSummary}${cardioText}

🧠 <i>${plan.insight}</i>`

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, plan_json: plan }),
    })
  } catch {
    // non-critical, ignore failures
  }
}
