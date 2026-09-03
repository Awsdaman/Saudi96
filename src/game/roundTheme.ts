import type { RoundId } from './types'

/**
 * كل جولة تستعير لوناً واحداً من قيم هوية اليوم الوطني السعودي
 * («عزّنا بطبعنا») ونسيج سدو من دليلها الرسمي. «لعبتي» تبقى بلا
 * هوية مستعارة — فهي ليست جولة واحدة بل ما يبنيه اللاعب.
 *
 * لكل جولة لونان: أحدهما للسطح الليلي (فاتحٌ يكفي للقراءة على
 * أرضية داكنة)، والآخر للمسرح (اللون الرسمي كما ورد في الدليل،
 * وهو مصمَّمٌ أصلاً لخلفية بيضاء). قيمة الشعارات والأسئلة المعرفية
 * غُيِّرت عن الرسمية بعد فحص التباين: اللون الرسمي #5ABA1C يهبط
 * إلى 2.48:1 على أبيض المسرح، فأُغمق إلى 4.76:1؛ وأزرق الكرم
 * #0050AF يهبط إلى 2.47:1 على أرضية الليل الداكنة، فأُفتح إلى 5.44:1.
 * البقية تجتاز 4.5:1 على السطحين بلونها الرسمي كما هو.
 */
export interface RoundTheme {
  night: string
  stage: string
  /** اسم القيمة في ملفّات النسيج تحت public/assets/identity */
  tapestry: string
}

export const ROUND_THEME: Partial<Record<RoundId, RoundTheme>> = {
  logos:     { night: '#5ABA1C', stage: '#3F8214', tapestry: 'authenticity' },
  landmarks: { night: '#C9A24A', stage: '#7C5D21', tapestry: 'vision' },
  regions:   { night: '#598DCB', stage: '#0050AF', tapestry: 'generosity' },
  dishes:    { night: '#E5738F', stage: '#971A4D', tapestry: 'determination' },
  people:    { night: '#A9C48A', stage: '#607C4F', tapestry: 'courage' },
  trivia:    { night: '#A9A9F0', stage: '#6565E0', tapestry: 'giving' },
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
