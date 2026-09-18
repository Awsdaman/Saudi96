import type { RevealKind, Team } from './types'

/**
 * القناة بين تبويب المستضيف وتبويب الجمهور — كلاهما على الجهاز نفسه.
 * المستضيف يعرف الإجابة دوماً؛ الجمهور لا يتلقّى answerIndex/correctText
 * إلا بعد أن يفصح المستضيف عنها فعلاً (انظر التعليقات في كل شاشة لعب).
 */
export const AUDIENCE_CHANNEL = 'saudiknowledge-audience'

export interface AudienceQuestion {
  roundTitle: string
  itemLabel: string
  index: number
  total: number
  prompt: string
  image?: string
  reveal?: RevealKind
  options?: string[]
  /** يصل فقط حين يُفصح المستضيف عن الإجابة */
  answerIndex?: number
  /** إجابة الأسئلة التي لا خيارات فيها (الأغنية، بطاقة الشعار) */
  correctText?: string
}

export type AudienceMessage =
  | { type: 'idle' }
  | { type: 'question'; data: AudienceQuestion }
  | { type: 'results'; score: number }
  | { type: 'teams'; teams: [Team, Team] | null }

export function isAudienceWindow(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('role') === 'audience'
  } catch {
    return false
  }
}

export function audienceUrl(): string {
  const url = new URL(window.location.href)
  url.search = 'role=audience'
  url.hash = ''
  return url.toString()
}
