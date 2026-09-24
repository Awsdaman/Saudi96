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
export interface TrackedAnswer { q: string; c: boolean; r: TrackedRound }

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
    .map((r) => ({ q: r.question.id, c: r.correct, r: r.question.round }))
}
