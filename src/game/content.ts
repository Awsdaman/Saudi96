import entitiesRaw from '../data/entities.json'
import landmarksRaw from '../data/landmarks.json'
import regionsRaw from '../data/regions.json'
import dishesRaw from '../data/dishes.json'
import peopleRaw from '../data/people.json'
import triviaRaw from '../data/trivia.json'
import { shuffle } from './engine'
import type { Difficulty, Entity, Question, RoundMeta } from './types'

export const entities = entitiesRaw as Entity[]

interface Landmark {
  id: string; nameAr: string; regionAr: string; category: string; noteAr: string; image: string | null
}
interface Region {
  id: string; nameAr: string; shortAr: string; capitalAr: string; historicAr: string; noteAr: string; image: string | null
}
interface Dish {
  id: string; nameAr: string; regionAr: string; descAr: string; image: string | null
}
/**
 * فئة الشخصية — تحدّد من أين تُسحب المموّهات ونصّ السؤال.
 * المموّهات من الفئة نفسها أولاً، فلا يُسأل عن ملك وتُعرض أسماء وزراء.
 */
export type PersonGroup = 'ministers' | 'kings' | 'governors' | 'astronauts' | 'athletes' | 'artists' | 'business' | 'historic'
/** نوع السؤال الثاني (غير الصورة) وما يُعرض في خياراته */
export type FactKind = 'role' | 'reign' | 'region' | 'fame'
interface Person {
  id: string; nameAr: string; roleAr: string
  /** تُؤنَّث صيغة السؤال — «من رائدة الفضاء هذه؟» بدل «من رائد الفضاء هذا؟» */
  fem: boolean
  group: PersonGroup; factKind: FactKind; factAr: string
  entityId: string | null; since: string | null; image: string | null
}

interface Trivia {
  id: string; category: string; difficulty: number; prompt: string
  options: string[]; answerIndex: number; explanation: string; sourceUrl?: string
}

export const landmarks = landmarksRaw as Landmark[]
export const regions = regionsRaw as Region[]
export const dishes = dishesRaw as Dish[]
export const people = peopleRaw as Person[]

/**
 * يختار مموّهات من المجموعة نفسها — الوزارات تنافس الوزارات، والأندية الأندية.
 * بلا هذا القيد تصير الإجابة واضحة بالاستبعاد وحده.
 */
function distractors<T>(correct: T, pool: readonly T[], label: (x: T) => string, n = 3): string[] {
  const wanted = label(correct)
  const others = pool.filter((x) => label(x) !== wanted)
  return shuffle(others).slice(0, n).map(label)
}

function optionsFor<T>(correct: T, pool: readonly T[], label: (x: T) => string): { options: string[]; answerIndex: number } {
  const options = [label(correct), ...distractors(correct, pool, label)]
  return { options, answerIndex: 0 } // buildRound يتكفّل بالخلط لاحقاً
}

/** صعوبة الجهة حسب شهرتها التقريبية */
function entityDifficulty(e: Entity): Difficulty {
  if (e.type === 'commission') return 4
  if (e.type === 'authority') return 3
  if (e.type === 'ministry') return 2
  return 2
}

/** جولة الشعارات — تتطلّب صوراً؛ الجهات بلا شعار مجلوب تُستبعد */
export function logoQuestions(): Question[] {
  const withLogos = entities.filter((e) => e.logo || e.lockup)
  return withLogos.map((e) => {
    // الفئة أ: يُقصّ الرمز وحده ويُكشف من الظل.
    // الفئة ب: شعارها مبني على الرمز الوطني المشترك، فيُعرض الشعار كاملاً
    //          مع تضبيب الاسم — اللون والخط والتكوين هي الدليل.
    const useSymbol = e.tier === 'A' && !!e.logo
    const samePool = entities.filter((x) => x.type === e.type)
    const pool = samePool.length >= 4 ? samePool : entities
    return {
      id: `logo_${e.id}`,
      round: 'logos' as const,
      prompt: 'ما الجهة صاحبة هذا الشعار؟',
      image: useSymbol ? e.logo! : (e.lockup ?? e.logo!),
      reveal: useSymbol ? ('silhouette' as const) : ('blur' as const),
      difficulty: entityDifficulty(e),
      category: e.type,
      sourceUrl: e.site,
      explanation: e.nameAr,
      ...optionsFor(e, pool, (x) => x.nameAr),
    }
  })
}

/** جولة المعالم — سؤال بالصورة إن وُجدت، وإلا سؤال نصي من الوصف */
export function landmarkQuestions(): Question[] {
  return landmarks.map((l) => {
    const sameCat = landmarks.filter((x) => x.category === l.category)
    const pool = sameCat.length >= 4 ? sameCat : landmarks
    const base = {
      id: `lmk_${l.id}`,
      round: 'landmarks' as const,
      difficulty: (l.category === 'unesco' || l.category === 'religious' ? 2 : 3) as Difficulty,
      category: l.category,
      explanation: l.noteAr,
      ...optionsFor(l, pool, (x) => x.nameAr),
    }
    return l.image
      ? { ...base, prompt: 'ما هذا المعلم؟', image: l.image, reveal: 'zoom' as const }
      : { ...base, prompt: `${l.noteAr.replace(/[.،]\s*$/, '')} — ما هذا المعلم؟`, explanation: `${l.nameAr} — ${l.regionAr}` }
  })
}

/** جولة المناطق — عواصم المناطق، وصورة المنطقة إن وُجدت */
export function regionQuestions(): Question[] {
  const capitals: Question[] = regions.map((r) => ({
    id: `reg_cap_${r.id}`,
    round: 'regions',
    prompt: `ما عاصمة ${r.nameAr}؟`,
    difficulty: (r.capitalAr === r.shortAr ? 2 : 3) as Difficulty,
    category: 'عواصم المناطق',
    explanation: r.noteAr,
    ...optionsFor(r, regions, (x) => x.capitalAr),
  }))

  const photos: Question[] = regions
    .filter((r) => r.image)
    .map((r) => ({
      id: `reg_img_${r.id}`,
      round: 'regions',
      prompt: 'من أي منطقة هذه الصورة؟',
      image: r.image!,
      reveal: 'zoom',
      difficulty: 3,
      category: 'مشاهد المناطق',
      explanation: `${r.nameAr} — ${r.noteAr}`,
      ...optionsFor(r, regions, (x) => x.nameAr),
    }))

  return [...capitals, ...photos]
}

/** جولة الأطباق — المطابقة بين المنطقة وطبقها الرسمي، وصورة الطبق إن وُجدت */
export function dishQuestions(): Question[] {
  const pairings: Question[] = dishes.map((d) => ({
    id: `dish_reg_${d.id}`,
    round: 'dishes',
    prompt: `ما الطبق الرسمي لمنطقة ${d.regionAr}؟`,
    difficulty: 3,
    category: 'أطباق المناطق',
    explanation: `${d.nameAr} — ${d.descAr}`,
    ...optionsFor(d, dishes, (x) => x.nameAr),
  }))

  const photos: Question[] = dishes
    .filter((d) => d.image)
    .map((d) => ({
      id: `dish_img_${d.id}`,
      round: 'dishes',
      prompt: 'ما هذا الطبق؟',
      image: d.image!,
      reveal: 'zoom',
      difficulty: 3,
      category: 'صور الأطباق',
      explanation: `${d.nameAr} — الطبق الرسمي لمنطقة ${d.regionAr}`,
      ...optionsFor(d, dishes, (x) => x.nameAr),
    }))

  return [...pairings, ...photos]
}

/** جولة الأسئلة المعرفية — من حقيبة البحث */
export function triviaQuestions(): Question[] {
  return (triviaRaw as Trivia[]).map((t) => ({
    id: t.id,
    round: 'trivia',
    prompt: t.prompt,
    options: t.options,
    answerIndex: t.answerIndex,
    difficulty: t.difficulty as Difficulty,
    category: t.category,
    explanation: t.explanation,
    sourceUrl: t.sourceUrl,
  }))
}

/** عنوان كل فئة، ونصّ سؤالها المصوّر */
const GROUP_LABEL: Record<PersonGroup, string> = {
  ministers: 'وزراء', kings: 'ملوك', governors: 'أمراء مناطق',
  astronauts: 'رواد فضاء', athletes: 'رياضيون', artists: 'فنانون',
  business: 'قادة أعمال', historic: 'شخصيات تاريخية',
}

/** [مذكّر، مؤنّث] */
const WHO_PROMPT: Record<PersonGroup, readonly [string, string]> = {
  ministers: ['من هذه الشخصية؟', 'من هذه الشخصية؟'],
  kings: ['من هذا الملك؟', 'من هذه الملكة؟'],
  governors: ['من هذه الشخصية؟', 'من هذه الشخصية؟'],
  astronauts: ['من رائد الفضاء هذا؟', 'من رائدة الفضاء هذه؟'],
  athletes: ['من هذا الرياضي؟', 'من هذه الرياضية؟'],
  artists: ['من هذا الفنان؟', 'من هذه الفنانة؟'],
  business: ['من هذه الشخصية؟', 'من هذه الشخصية؟'],
  historic: ['من هذه الشخصية؟', 'من هذه الشخصية؟'],
}

/** نصّ السؤال الثاني حسب نوعه */
function factPrompt(p: Person): string {
  switch (p.factKind) {
    case 'role': return p.fem ? `أي منصب تتولّاه ${p.nameAr}؟` : `أي منصب يتولّاه ${p.nameAr}؟`
    case 'reign': return `في أي فترة حكم ${p.nameAr}؟`
    case 'region': return p.fem ? `أي منطقة تحكمها ${p.nameAr}؟` : `أي منطقة يحكمها ${p.nameAr}؟`
    case 'fame': return p.fem ? `بماذا اشتُهرت ${p.nameAr}؟` : `بماذا اشتُهر ${p.nameAr}؟`
  }
}

/** «منذ» تصلح للمنصب والمنطقة، لا لفترة حكمٍ منتهية ولا لإنجازٍ وقع مرّة */
function factExplanation(p: Person): string {
  if (p.factKind === 'reign') return `${p.nameAr} — ${p.roleAr} (${p.factAr})`
  if (p.factKind === 'fame' || !p.since) return `${p.nameAr} — ${p.roleAr}`
  return `${p.nameAr} — ${p.roleAr} منذ ${p.since}`
}

/**
 * يبني خيارات من الفئة نفسها، ويوسّع الدائرة إن لم تكفِ الفئة أربعةَ خيارات
 * (رواد الفضاء ثلاثة، وقادة الأعمال اثنان).
 */
function peopleOptions(correct: Person, tiers: readonly (readonly Person[])[], label: (p: Person) => string) {
  const wanted = label(correct)
  const picked: string[] = []
  const seen = new Set([wanted])
  for (const tier of tiers) {
    if (picked.length >= 3) break
    const fresh = shuffle(tier.filter((x) => !seen.has(label(x))))
    for (const x of fresh) {
      if (picked.length >= 3) break
      picked.push(label(x))
      seen.add(label(x))
    }
  }
  return { options: [wanted, ...picked], answerIndex: 0 } // buildRound يتكفّل بالخلط لاحقاً
}

/**
 * جولة الشخصيات — سؤال مصوّر عن الاسم، وسؤال نصّي عن المنصب أو الفترة أو المنطقة أو الشهرة.
 * السؤال النصّي لا يحتاج صورة، فمن لا صورة له يبقى في اللعبة بسؤال واحد.
 */
export function peopleQuestions(): Question[] {
  const withPhoto = people.filter((p) => p.image)
  const byGroup = (g: PersonGroup, pool: readonly Person[]) => pool.filter((p) => p.group === g)
  const byFact = (k: FactKind, pool: readonly Person[]) => pool.filter((p) => p.factKind === k)
  const out: Question[] = []

  for (const p of people) {
    if (p.image) {
      out.push({
        id: `who_${p.id}`,
        round: 'people',
        prompt: WHO_PROMPT[p.group][p.fem ? 1 : 0],
        image: p.image,
        reveal: 'none',
        difficulty: p.group === 'governors' ? 4 : 3,
        category: GROUP_LABEL[p.group],
        explanation: `${p.nameAr} — ${p.roleAr}`,
        ...peopleOptions(p, [byGroup(p.group, withPhoto), byFact(p.factKind, withPhoto), withPhoto], (x) => x.nameAr),
      })
    }

    out.push({
      id: `fact_${p.id}`,
      round: 'people',
      prompt: factPrompt(p),
      difficulty: p.group === 'governors' ? 4 : 3,
      category: GROUP_LABEL[p.group],
      explanation: factExplanation(p),
      ...peopleOptions(p, [byFact(p.factKind, people), people], (x) => x.factAr),
    })
  }

  return out
}

export const ROUNDS: RoundMeta[] = [
  {
    id: 'logos', title: 'خمّن الشعار', subtitle: 'وزارات وهيئات وشركات ومشاريع', icon: '◆', seconds: 20,
    howTo: [
      'يظهر الرمز وحده بلا اسم مكتوب.',
      'خمّن الجهة في بالك، ثم اضغط «اعرض الإجابة».',
      'يظهر الشعار كاملاً مع الاسم، فاحكم على نفسك: عرفتها أو ما عرفتها.',
      'لا مؤقّت في هذه الجولة — خذ راحتك.',
    ],
  },
  {
    id: 'landmarks', title: 'خمّن المعلم', subtitle: 'مواقع اليونسكو والمعالم والعمارة', icon: '▲', seconds: 20,
    howTo: [
      'تبدأ الصورة من تفصيل مقصوص ثم تتّسع شيئاً فشيئاً.',
      'اختر الإجابة الصحيحة قبل نفاد الوقت.',
      'كلما أجبت أبكر زادت نقاطك.',
      'كل إجابة صحيحة متتابعة ترفع مضاعف النقاط.',
    ],
  },
  {
    id: 'regions', title: 'خمّن المنطقة', subtitle: 'المناطق الثلاث عشرة وعواصمها', icon: '●', seconds: 18,
    howTo: [
      'أسئلة عن المناطق الثلاث عشرة وعواصمها.',
      'اختر الإجابة قبل نفاد الوقت.',
      'السرعة تزيد النقاط، والسلسلة المتتابعة تضاعفها.',
    ],
  },
  {
    id: 'dishes', title: 'خمّن الطبق', subtitle: 'الأطباق الرسمية للمناطق', icon: '◗', seconds: 18,
    howTo: [
      'لكل منطقة طبق رسمي واحد معتمد.',
      'اختر الإجابة قبل نفاد الوقت.',
      'السرعة تزيد النقاط، والسلسلة المتتابعة تضاعفها.',
    ],
  },
  {
    id: 'people', title: 'خمّن الشخصية', subtitle: 'ملوك ووزراء وأمراء ومشاهير', icon: '◉', seconds: 20,
    howTo: [
      'تظهر صورة شخصية والسؤال عن اسمها، أو يأتي الاسم والسؤال عن منصبه أو منطقته أو فترة حكمه أو ما اشتُهر به.',
      'الخيارات من الفئة نفسها: ملك مع ملوك، ووزير مع وزراء.',
      'اختر الإجابة قبل نفاد الوقت.',
      'السرعة تزيد النقاط، والسلسلة المتتابعة تضاعفها.',
      'أسماء الوزراء وأمراء المناطق محدّثة حسب آخر تشكيل.',
    ],
  },
  {
    id: 'trivia', title: 'أسئلة معرفية', subtitle: 'جغرافيا وتاريخ وثقافة', icon: '✦', seconds: 25,
    howTo: [
      'أسئلة من جغرافيا وتاريخ وثقافة ومعالم ومحميات ورؤية 2030 وغيرها.',
      'اختر الإجابة قبل نفاد الوقت.',
      'السرعة تزيد النقاط، والسلسلة المتتابعة تضاعفها.',
      'بعد كل إجابة يظهر شرح مختصر.',
    ],
  },
]

export function poolFor(round: string): Question[] {
  switch (round) {
    case 'logos': return logoQuestions()
    case 'landmarks': return landmarkQuestions()
    case 'regions': return regionQuestions()
    case 'dishes': return dishQuestions()
    case 'people': return peopleQuestions()
    case 'trivia': return triviaQuestions()
    default: return []
  }
}

// ── اللعبة المخصّصة: يختار اللاعب مصادر الأسئلة ويمزجها في جولة واحدة ──

export interface PoolSource {
  id: string
  label: string
  group: 'جولات' | 'فئات الشخصيات' | 'تصنيفات معرفية'
  count: number
}

/** كل ما يمكن للّاعب اختياره، مع عدد أسئلة كل مصدر */
export function poolSources(): PoolSource[] {
  const rounds: PoolSource[] = [
    { id: 'round:logos', label: 'الشعارات', group: 'جولات', count: logoQuestions().length },
    { id: 'round:landmarks', label: 'المعالم', group: 'جولات', count: landmarkQuestions().length },
    { id: 'round:regions', label: 'المناطق', group: 'جولات', count: regionQuestions().length },
    { id: 'round:dishes', label: 'الأطباق', group: 'جولات', count: dishQuestions().length },
    { id: 'round:people', label: 'الشخصيات', group: 'جولات', count: peopleQuestions().length },
  ]

  const peopleByGroup: Record<string, number> = {}
  for (const q of peopleQuestions()) {
    const c = q.category ?? 'غير مصنّف'
    peopleByGroup[c] = (peopleByGroup[c] ?? 0) + 1
  }
  const peopleCats: PoolSource[] = Object.entries(peopleByGroup)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ id: `people:${label}`, label, group: 'فئات الشخصيات', count }))

  const counts: Record<string, number> = {}
  for (const q of triviaQuestions()) {
    const c = q.category ?? 'غير مصنّف'
    counts[c] = (counts[c] ?? 0) + 1
  }
  const cats: PoolSource[] = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ id: `cat:${label}`, label, group: 'تصنيفات معرفية', count }))

  return [...rounds, ...peopleCats, ...cats]
}

/** يبني بنك أسئلة من المصادر المختارة. جولة الشعارات هنا بصيغة الاختيارات. */
export function poolFromSources(ids: readonly string[]): Question[] {
  const picked = new Set(ids)
  const out: Question[] = []

  if (picked.has('round:logos')) out.push(...logoQuestions())
  if (picked.has('round:landmarks')) out.push(...landmarkQuestions())
  if (picked.has('round:regions')) out.push(...regionQuestions())
  if (picked.has('round:dishes')) out.push(...dishQuestions())
  if (picked.has('round:people')) out.push(...peopleQuestions())
  else {
    const wantedPeople = new Set([...picked].filter((i) => i.startsWith('people:')).map((i) => i.slice(7)))
    if (wantedPeople.size) out.push(...peopleQuestions().filter((q) => q.category && wantedPeople.has(q.category)))
  }

  const wantedCats = [...picked].filter((i) => i.startsWith('cat:')).map((i) => i.slice(4))
  if (wantedCats.length) {
    const set = new Set(wantedCats)
    out.push(...triviaQuestions().filter((q) => q.category && set.has(q.category)))
  }

  return out
}

/** الجهات المؤهَّلة لجولة «خمّن الشعار» بصيغة البطاقات */
export function logoCards(): Entity[] {
  return entities.filter((e) => e.lockup || e.logo)
}
