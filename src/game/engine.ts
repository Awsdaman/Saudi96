import type { Question } from './types'

/**
 * نقطةٌ ثابتة واحدة لكل إجابة صحيحة، في كل جولةٍ وكل صيغة، بلا استثناء:
 * اختيارٌ من متعدد، تذكّر «خمّن الشعار» الحرّ، وأيّ مرحلةٍ من مراحل
 * «خمّن الأغنية». كانت تتفاوت (٣٠٠ أساسية × مضاعف سلسلة، ٥٠٠ للشعار
 * الحرّ، ٣٠٠/١٥٠/٥٠ حسب مرحلة الأغنية) فبدت للاعب عشوائية التفاوت —
 * نفس السؤال يمنح نقاطاً مختلفة بلا سببٍ ظاهر. رقمٌ واحد يُنهي الالتباس.
 */
export const POINTS = 300

/**
 * إظهار الخيارات في السؤال المخفي (نمط متوسط/صعب) هو مخاطرةٌ اختيارية:
 * تخمينٌ بلا خيارات (المستضيف يسأل شفهياً ويستعمل «اعرض لي الإجابة»
 * وحده) يستحقّ النقطة الكاملة؛ طلب الخيارات على الشاشة يُنزلها إلى
 * نصفها — فالكشف مخاطرةٌ، لا مجرّد توقيت.
 */
export const DISCOUNTED_POINTS = 150

/** النقاط النهائية لسؤال اختيارٍ من متعدد — كاملة، أو منصّفة إن أُظهرت الخيارات أولاً */
export function scoreAnswer(discounted = false): number {
  return discounted ? DISCOUNTED_POINTS : POINTS
}

/** النقاط النهائية لأي مرحلةٍ في «خمّن الأغنية» — ثابتة دائماً، بلا فرقٍ بين المراحل */
export function scoreSong(): number {
  return POINTS
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
