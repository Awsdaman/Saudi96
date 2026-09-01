import type { Difficulty, Question } from './types'

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

/**
 * النقاط النهائية للإجابة الصحيحة.
 * السرعة تُكافأ لأن الصورة تنكشف تدريجياً مع الوقت —
 * فمن يخمّن الشعار من ظلّه وحده يستحق أكثر ممن انتظر ظهوره كاملاً.
 */
export function scoreAnswer(
  difficulty: Difficulty,
  timeLeft: number,
  totalTime: number,
  streak: number,
): number {
  const base = basePoints(difficulty)
  const speedBonus = base * (Math.max(timeLeft, 0) / totalTime) * 0.5
  return Math.round((base + speedBonus) * streakMultiplier(streak))
}

/** نسبة الكشف عن الصورة: 0 = مخفية تماماً · 1 = ظاهرة كاملة */
export function revealProgress(timeLeft: number, totalTime: number): number {
  if (totalTime <= 0) return 1
  return Math.min(1, Math.max(0, 1 - timeLeft / totalTime))
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
  const correct = q.options[q.answerIndex]
  const options = shuffle(q.options)
  return { ...q, options, answerIndex: options.indexOf(correct) }
}

/** يختار أسئلة الجولة: خلط، ثم قصّ للعدد المطلوب، ثم خلط الخيارات */
export function buildRound(pool: readonly Question[], count: number): Question[] {
  return shuffle(pool).slice(0, count).map(shuffleOptions)
}
