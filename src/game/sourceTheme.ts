import { ROUND_THEME, iconTileUrl } from './roundTheme'
import type { RoundId } from './types'

/**
 * هوية بصرية لكل مصدرٍ يمكن اختياره في «لعبتي» (poolSources في
 * content.ts) — لونٌ وصورة معاينة، بنفس فكرة ROUND_THEME لكن بدقّةٍ
 * أعلى: مصدرٌ واحد لكل جولة كاملة، ولكل فئة شخصياتٍ ومعرفةٍ فرعية.
 *
 * لا صور جديدة هنا — كل صورة مُستعارة من أصلٍ موجود فعلاً:
 * - الجولات: رقعة هوية الجولة نفسها (roundTheme.iconTileUrl).
 * - فئات الشخصيات: صورة شخصٍ حقيقيٍّ من الفئة (people.json)، فيها
 *   بالفعل ما يدلّ على الفئة (وزير، ملك، رائد فضاء...).
 * - التصنيفات المعرفية: أسئلة نصّية بلا صور مصدرية، فتُعار رقعة جولة
 *   «أسئلة معرفية» نفسها لكل التصنيفات الفرعية، ويكفي اللون للتمييز
 *   بينها — إلا «معالم» فتأخذ لون جولة «خمّن المعلم» نفسها، إذ
 *   الفئتان عن الموضوع نفسه بالضبط.
 */
export interface SourceTheme {
  color: string
  /** مسارٌ نسبيّ تحت public — يُستخدم كـ src مباشرةً، لا كخلفية CSS */
  image: string
}

const TRIVIA_ICON = iconTileUrl('trivia' as RoundId)!

const ROUND_SOURCE: Record<string, SourceTheme> = Object.fromEntries(
  (Object.entries(ROUND_THEME) as [RoundId, { color: string }][]).map(([id, t]) => [
    `round:${id}`,
    { color: t.color, image: iconTileUrl(id)! },
  ]),
)

/** فئات الشخصيات — GROUP_LABEL في content.ts، بصورة أول عضوٍ له صورة في الفئة */
const PEOPLE_SOURCE: Record<string, SourceTheme> = {
  'people:وزراء': { color: '#7FB8E0', image: 'assets/people/mbs.jpg' },
  'people:ملوك': { color: '#D9B65C', image: 'assets/people/king-abdulaziz.png' },
  'people:أمراء مناطق': { color: '#C98BD1', image: 'assets/people/gov-riyadh.jpg' },
  'people:رواد فضاء': { color: '#6FD6C8', image: 'assets/people/sultan-bin-salman.jpg' },
  'people:رياضيون': { color: '#F08A5D', image: 'assets/people/owairan.jpg' },
  'people:فنانون': { color: '#E8779A', image: 'assets/people/mohammed-abdu.jpg' },
  'people:قادة أعمال': { color: '#B7A6E0', image: 'assets/people/amin-nasser.png' },
  'people:شخصيات تاريخية': { color: '#BFA07A', image: 'assets/people/khamis-ramthan.jpg' },
}

/** التصنيفات المعرفية الثلاثة عشر — trivia.json category */
const TRIVIA_SOURCE: Record<string, SourceTheme> = {
  'cat:جغرافيا': { color: '#6FA8DC', image: TRIVIA_ICON },
  'cat:المناطق': { color: '#7EC8E3', image: TRIVIA_ICON },
  'cat:تاريخ': { color: '#B98D6F', image: TRIVIA_ICON },
  'cat:ثقافة وطعام': { color: '#E29A6B', image: TRIVIA_ICON },
  // نفس لون جولة «خمّن المعلم» — الموضوع واحد بالضبط
  'cat:معالم': { color: ROUND_THEME.landmarks!.color, image: iconTileUrl('landmarks')! },
  'cat:محميات وحياة فطرية': { color: '#8FBF7F', image: TRIVIA_ICON },
  'cat:رؤية 2030': { color: '#4FA8A0', image: TRIVIA_ICON },
  'cat:اقتصاد وطاقة': { color: '#E3B94A', image: TRIVIA_ICON },
  'cat:رياضة': { color: '#F08A5D', image: TRIVIA_ICON },
  'cat:شخصيات': { color: '#A9C48A', image: TRIVIA_ICON },
  'cat:حكومة وأنظمة': { color: '#7A93B8', image: TRIVIA_ICON },
  'cat:علوم وتقنية': { color: '#7FD1D6', image: TRIVIA_ICON },
  'cat:تراث وعادات': { color: '#C9A9D9', image: TRIVIA_ICON },
}

export const SOURCE_THEME: Record<string, SourceTheme> = {
  ...ROUND_SOURCE,
  ...PEOPLE_SOURCE,
  ...TRIVIA_SOURCE,
}

/** لون مصدر السؤال أثناء «لعبتي» — يقرأه useRoundTheme ليصبغ الخلفية
 * حسب فئة السؤال الحالي، لا لون الجولة المخصّصة الثابت (لا لون لها أصلاً) */
export function sourceColor(selectionSource: string | undefined): string | null {
  if (!selectionSource) return null
  return SOURCE_THEME[selectionSource]?.color ?? null
}
