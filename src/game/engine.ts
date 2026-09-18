import type { Question, SongPhase } from './types'

/** أقصى مضاعف يمكن بلوغه بالسلسلة المتتابعة */
export const MAX_STREAK_BONUS = 5

/**
 * نقاطٌ ثابتة موحَّدة — كانت تعتمد على تصنيف صعوبة السؤال (١٠٠-٤٠٠)،
 * فتبدو للاعب متفاوتةً بلا سبب واضح إذ لا يرى تصنيف الصعوبة أصلاً في
 * أي مكان. الآن قيمتان فقط في اللعبة كلها: سؤال اختيارٍ من متعدد
 * عادي، وتذكّر «خمّن الشعار» الحرّ بلا خيارات (أصعب، فنقاطه أعلى).
 */
export const MC_POINTS = 300
export const LOGO_RECALL_POINTS = 500

/** نقاط كل مرحلة في «خمّن الأغنية» — تتناقص كلما احتجت مقطعاً أطول */
const SONG_PHASE_POINTS: Record<SongPhase, number> = { 1: 300, 2: 150, 3: 50 }

/** مضاعف السلسلة: يزيد ١٠٪ لكل إجابة صحيحة متتابعة حتى ٥٠٪ */
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(streak, MAX_STREAK_BONUS) * 0.1
}

/** النقاط النهائية لسؤال اختيارٍ من متعدد: قيمةٌ ثابتة، ومضاعف السلسلة فوقها. */
export function scoreAnswer(streak: number): number {
  return Math.round(MC_POINTS * streakMultiplier(streak))
}

export function scoreSong(phase: SongPhase, streak: number): number {
  return Math.round(SONG_PHASE_POINTS[phase] * streakMultiplier(streak))
}

/** خلط عشوائي (Fisher–Yates) — لا يعدّل المصفوفة الأصلية */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * يخلط خيارات السؤال مع تتبّع موضع الإجابة الصحيحة،
 * حتى لا تكون الإجابة في الموضع نفسه كل مرة.
 */
export function shuffleOptions(q: Question): Question {
  if (q.kind === 'song') return q
  const correct = q.options[q.answerIndex]
  const options = shuffle(q.options)
  return { ...q, options, answerIndex: options.indexOf(correct) }
}

/** يختار أسئلة الجولة: خلط، ثم قصّ للعدد المطلوب، ثم خلط الخيارات */
export function buildRound(pool: readonly Question[], count: number): Question[] {
  return shuffle(pool).slice(0, count).map(shuffleOptions)
}

/** حصّة متوازنة لكل مصدر مختار، مع إعادة توزيع حصّة البنك الذي ينفد. */
export function buildMixedRound(pool: readonly Question[], count: number): Question[] {
  const groups = new Map<string, Question[]>()
  for (const question of pool) {
    const key = question.selectionSource ?? question.round
    const group = groups.get(key) ?? []
    group.push(question)
    groups.set(key, group)
  }
  const buckets = [...groups.values()].map(shuffle)
  const picked: Question[] = []
  const limit = Math.min(pool.length, Math.max(0, Math.trunc(count)))
  while (picked.length < limit) {
    for (const bucket of shuffle(buckets.filter((b) => b.length))) {
      if (picked.length === limit) break
      picked.push(bucket.pop()!)
    }
  }
  return shuffle(picked).map(shuffleOptions)
}
