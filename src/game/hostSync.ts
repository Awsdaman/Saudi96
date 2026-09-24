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

/**
 * لوحة الإدارة على المسار /admin من الموقع نفسه (vercel.json يعيد توجيهه
 * إلى الصفحة ذاتها)، أو من عنوانٍ مستقلّ إن أُضيف لاحقاً
 * (saudi96-admin.vercel.app). البيانات محميّةٌ بكلمة المرور في الخادم،
 * لا بهذا الفحص. محلياً أيضاً: ?admin على خادم التطوير.
 */
export function isAdminHost(): boolean {
  try {
    if (window.location.hostname.startsWith('saudi96-admin')) return true
    if (window.location.pathname.replace(/\/+$/, '') === '/admin') return true
    return import.meta.env.DEV && new URLSearchParams(window.location.search).has('admin')
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
