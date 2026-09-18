import type { Difficulty, Question, SongPhase } from './types'

/** أقصى مضاعف يمكن بلوغه بالسلسلة المتتابعة */
export const MAX_STREAK_BONUS = 5

/** نقاط أساسية حسب الصعوبة */
export function basePoints(difficulty: Difficulty): number {
  return 100 * difficulty
}

/** مضاعف السلسلة: يزيد ١٠٪ لكل إجابة صحيحة متتابعة حتى ٥٠٪ */
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(streak, MAX_STREAK_BONUS) * 0.1
}

/** النقاط النهائية للإجابة الصحيحة: أساسها الصعوبة، ومضاعف السلسلة فوقه. */
export function scoreAnswer(difficulty: Difficulty, streak: number): number {
  return Math.round(basePoints(difficulty) * streakMultiplier(streak))
}

export function scoreSong(phase: SongPhase, streak: number): number {
  return Math.round((400 - phase * 100) * streakMultiplier(streak))
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
