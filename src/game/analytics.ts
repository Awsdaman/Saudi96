import { isAdminHost, isAudienceWindow } from './hostSync'
import type { AnswerRecord } from './gameReducer'
import type { GameRoundId, PlayMode } from './types'

/**
 * إحصاءاتٌ مجهولة الهوية للوحة الإدارة — معرّفٌ عشوائي لكل متصفّح، بلا
 * اسمٍ ولا بيانات شخصية. لا شيء يُرسَل من ملفٍّ مفتوحٍ من القرص (file://)
 * ولا من تبويب الجمهور (يعكس المستضيف فقط) ولا من لوحة الإدارة نفسها.
 * الإرسال «أطلق وانسَ»: فشله لا يمسّ اللعب إطلاقاً.
 */

export type TrackedRound = GameRoundId | 'logos-cards'
/** h: كشفها المستضيف بنفسه — تُعدّ منفصلةً ولا تدخل دقّة التصنيف أو السؤال */
export interface TrackedAnswer { q: string; c: boolean; r: TrackedRound; h?: true }

const ENDPOINT = '/api/events'
const VISITOR_KEY = 'saudiknowledge.visitor'
const VISIT_SENT_KEY = 'saudiknowledge.visitSent'
const VISITOR_FORMAT = /^[A-Za-z0-9_-]{8,64}$/

function enabled(): boolean {
  try {
    return window.location.protocol.startsWith('http') && !isAudienceWindow() && !isAdminHost()
  } catch {
    return false
  }
}

function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join('')
  }
}

function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id || !VISITOR_FORMAT.test(id)) {
      id = newId()
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return newId()
  }
}

function send(event: Record<string, unknown>) {
  if (!enabled()) return
  const body = JSON.stringify({ ...event, visitor: visitorId() })
  try {
    if (navigator.sendBeacon?.(ENDPOINT, body)) return
  } catch {
    // يسقط إلى fetch أدناه
  }
  fetch(ENDPOINT, { method: 'POST', body, keepalive: true }).catch(() => {})
}

export type FeedbackResult = 'ok' | 'offline' | 'rate' | 'invalid' | 'error'
export const FEEDBACK_MIN = 3
export const FEEDBACK_MAX = 1000

/**
 * اقتراحٌ أو إضافةٌ يكتبها اللاعب — تظهر في لوحة الإدارة. على خلاف بقية
 * الأحداث تنتظر الردّ، ليعرف اللاعب أن رسالته وصلت. من ملفٍّ مفتوحٍ من
 * القرص (file://) لا خادم يستقبلها.
 */
export async function sendFeedback(text: string): Promise<FeedbackResult> {
  if (!window.location.protocol.startsWith('http')) return 'offline'
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'feedback', text, visitor: visitorId() }),
    })
    if (res.ok) return 'ok'
    if (res.status === 429) return 'rate'
    if (res.status === 400) return 'invalid'
    return 'error'
  } catch {
    return 'error'
  }
}

/** زيارةٌ واحدة لكل جلسة تبويب — لا لكل إعادة تصيير أو رجوعٍ للرئيسية */
export function trackVisit() {
  try {
    if (sessionStorage.getItem(VISIT_SENT_KEY)) return
    sessionStorage.setItem(VISIT_SENT_KEY, '1')
  } catch {
    // بلا تخزين جلسة: تُرسَل مع كل تحميلٍ للصفحة، وهذا مقبول
  }
  send({ type: 'visit' })
}

export function trackRoundStart(round: TrackedRound, opts: { mode?: PlayMode; teams: boolean; audience: boolean; count: number }) {
  if (opts.count < 1) return
  send({ type: 'round_start', round, ...opts })
}

export function trackRoundEnd(round: TrackedRound, completed: boolean, answers: TrackedAnswer[]) {
  if (!answers.length && !completed) return
  send({ type: 'round_end', round, completed, answers })
}

/** إجابات الجولة بصيغة الإرسال — كلٌّ منسوبٌ لتصنيف سؤاله هو، لا للجولة التي لُعب فيها */
export function answersOf(records: readonly AnswerRecord[]): TrackedAnswer[] {
  return records
    .filter((r) => !r.unavailable)
    .map((r) => ({ q: r.question.id, c: r.correct, r: r.question.round, ...(r.revealed ? { h: true as const } : {}) }))
}

/**
 * يتذكّر كم إجابةً من الجولة الجارية أُرسلت، فيعيد الجديدة وحدها — إغلاق
 * التبويب يُرسل ما أُجيب حتى لحظته، فإن عاد اللاعب (ذاكرة المتصفح) وأكمل
 * الجولة لم تُحسب إجاباتها الأولى مرّتين. يُصفَّر بجولةٍ جديدة (مصفوفة
 * أسئلةٍ جديدة) تلقائياً.
 */
export function createRoundReporter() {
  let round: unknown = null
  let sent = 0
  return (roundKey: unknown, records: readonly AnswerRecord[]): TrackedAnswer[] => {
    if (roundKey !== round) {
      round = roundKey
      sent = 0
    }
    const fresh = records.slice(sent)
    sent = records.length
    return answersOf(fresh)
  }
}
