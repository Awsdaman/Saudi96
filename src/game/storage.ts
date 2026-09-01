const KEY = 'saudiknowledge.best'

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
    return (JSON.parse(localStorage.getItem(LEN_KEY) ?? '{}') as Record<string, number>)[round] ?? null
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
