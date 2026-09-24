// v2: النقاط تغيّرت جذرياً (نقطة ثابتة 300 بدل مضاعف سلسلة)، فأرقام
// v1 القياسية القديمة (٩٩٠، ١٬٢٦٠...) صارت من نظامٍ لا يعود ممكناً بلوغه
// أو مقارنته بعدله — مفتاحٌ جديدٌ يُنسي تلك الأرقام دون حذف بياناتٍ فعلياً.
const KEY = 'saudiknowledge.best.v2'

type Bests = Record<string, number>

function read(): Bests {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Bests
  } catch {
    return {}
  }
}

export function loadBest(round: string): number {
  return read()[round] ?? 0
}

/** يحفظ النتيجة إن تجاوزت الأفضل، ويعيد true إن كان رقماً قياسياً جديداً */
export function saveBest(round: string, score: number): boolean {
  const all = read()
  if (score <= (all[round] ?? 0)) return false
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...all, [round]: score }))
  } catch {
    // التخزين قد يكون معطّلاً — لا يمنع اللعب
  }
  return true
}

const LEN_KEY = 'saudiknowledge.length'

/** آخر عدد أسئلة اختاره اللاعب لكل جولة */
export function loadLength(round: string): number | null {
  try {
    const value = (JSON.parse(localStorage.getItem(LEN_KEY) ?? '{}') as Record<string, number> | null)?.[round]
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function saveLength(round: string, count: number) {
  try {
    const all = JSON.parse(localStorage.getItem(LEN_KEY) ?? '{}') as Record<string, number>
    localStorage.setItem(LEN_KEY, JSON.stringify({ ...all, [round]: count }))
  } catch {
    // التخزين قد يكون معطّلاً — لا يمنع اللعب
  }
}

const EASY_KEY = 'saudiknowledge.playMode'

/**
 * نمط اللعب — ثلاث درجات يقرّرها اللاعب بعد اختيار التصنيف:
 *  سهل   — الخيارات ظاهرة فوراً، بمموّهاتها المعتادة.
 *  متوسط — الخيارات نفسها، لكن مخفيّة حتى تُطلَب («أظهر الخيارات»).
 *  صعب   — مخفيّة أيضاً، لكن بمموّهاتٍ أعسر (انظر content.ts، applyDifficulty).
 * في «خمّن الشعار» تحديداً: سهل/متوسط اختيارٌ من متعدد (بتوقيتين
 * مختلفين)، وصعب بطاقات التذكّر الحرّ بلا خيارات على الإطلاق — أصعب
 * من أي خيارات مهما صُعِّبت، فلا حاجة لمموّهاتٍ أعسر هناك أصلاً.
 * القيمة الافتراضية «متوسط» — أقرب لسلوك الإصدار السابق حين لم يكن
 * هناك سوى مفتاحٍ ثنائي، افتراضه إخفاء الخيارات بمحتواها المعتاد.
 */
export function loadPlayMode(): 'easy' | 'medium' | 'hard' {
  try {
    const v = localStorage.getItem(EASY_KEY)
    return v === 'easy' || v === 'medium' || v === 'hard' ? v : 'medium'
  } catch {
    return 'medium'
  }
}

export function savePlayMode(mode: 'easy' | 'medium' | 'hard') {
  try {
    localStorage.setItem(EASY_KEY, mode)
  } catch {
    // التخزين قد يكون معطّلاً — لا يمنع اللعب
  }
}

const SEEN_KEY = 'saudiknowledge.seen'

function readSeen(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}') as Record<string, string[]>
  } catch {
    return {}
  }
}

/**
 * أسئلة سبق طرحها لهذا المصدر (جولة، أو تركيبة «لعبتي») — تُستبعد من
 * الاختيار العشوائي حتى تنفد كلّها، فلا يتكرّر سؤالٌ قبل أن يمرّ البنك
 * كلّه، مهما لُعبت الفئة نفسها من المرّات.
 */
export function loadSeen(key: string): Set<string> {
  return new Set(readSeen()[key] ?? [])
}

export function markSeen(key: string, ids: readonly string[]) {
  if (!ids.length) return
  try {
    const all = readSeen()
    const merged = Array.from(new Set([...(all[key] ?? []), ...ids]))
    localStorage.setItem(SEEN_KEY, JSON.stringify({ ...all, [key]: merged }))
  } catch {
    // التخزين قد يكون معطّلاً — لا يمنع اللعب
  }
}

/** يُستدعى حين ينفد البنك غير المشاهَد فيبدأ الدورة من جديد */
export function resetSeen(key: string) {
  try {
    const all = readSeen()
    if (!(key in all)) return
    delete all[key]
    localStorage.setItem(SEEN_KEY, JSON.stringify(all))
  } catch {
    // التخزين قد يكون معطّلاً — لا يمنع اللعب
  }
}
