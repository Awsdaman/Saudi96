import type { RoundId } from './types'

/**
 * كل جولة تستعير لوناً واحداً من قيم هوية اليوم الوطني السعودي
 * («عزّنا بطبعنا») ونسيج سدو من دليلها الرسمي. «لعبتي» تبقى بلا
 * هوية مستعارة — فهي ليست جولة واحدة بل ما يبنيه اللاعب.
 *
 * لونٌ واحد لكل جولة (فاتحٌ يكفي للقراءة على الأرضية الداكنة —
 * السطح الوحيد في اللعبة بعد إلغاء عرض المسرح).
 */
export interface RoundTheme {
  color: string
  /** اسم القيمة في ملفّات النسيج تحت public/assets/identity */
  tapestry: string
}

export const ROUND_THEME: Partial<Record<RoundId, RoundTheme>> = {
  logos:     { color: '#5ABA1C', tapestry: 'authenticity' },
  landmarks: { color: '#C9A24A', tapestry: 'vision' },
  regions:   { color: '#598DCB', tapestry: 'generosity' },
  dishes:    { color: '#E5738F', tapestry: 'determination' },
  people:    { color: '#A9C48A', tapestry: 'courage' },
  trivia:    { color: '#A9A9F0', tapestry: 'giving' },
}

export function tapestryUrl(id: RoundId): string | null {
  const t = ROUND_THEME[id]
  return t ? `assets/identity/${t.tapestry}-tapestry.jpg` : null
}

/** رقعة الأيقونة المؤطَّرة — المربّع الكبير على الرئيسية، وشارة التعليمات */
export function iconTileUrl(id: RoundId): string | null {
  const t = ROUND_THEME[id]
  return t ? `assets/identity/${t.tapestry}-icon.jpg` : null
}

/** المربّع الافتراضي حين لا جولة مُعاينة ولا مختارة — سيف الشجاعة */
export const DEFAULT_ICON_TILE = 'assets/identity/courage-icon.jpg'
