import entitiesRaw from '../data/entities.json'
import landmarksRaw from '../data/landmarks.json'
import regionsRaw from '../data/regions.json'
import dishesRaw from '../data/dishes.json'
import peopleRaw from '../data/people.json'
import triviaRaw from '../data/trivia.json'
import songsRaw from '../data/songs.json'
import { shuffle } from './engine'
import type { Difficulty, Entity, PlayMode, Question, RoundMeta, Song, SongQuestion } from './types'

export const songs = songsRaw as Song[]

export function songQuestions(): SongQuestion[] {
  return songs.filter((s) => s.status === 'ready' && s.clips && s.famousStart !== null && s.famousEnd !== null)
    .map((song) => ({ kind: 'song', id: `song_${song.id}`, round: 'songs', prompt: 'ما اسم هذه الأغنية؟', song }))
}

export const entities = entitiesRaw as Entity[]

interface Landmark {
  id: string; nameAr: string; regionAr: string; category: string; noteAr: string; image: string | null
}
interface Region {
  id: string; nameAr: string; shortAr: string; capitalAr: string; historicAr: string; noteAr: string
  /** مدن حقيقية أخرى في المنطقة، ليست عاصمتها — تُثري مموّهات سؤال العاصمة */
  otherCitiesAr: string[]
  image: string | null
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

/** خيارات النمط الصعب — نفس المنطق، من مجموعةٍ أضيق (أقرب شبهاً للإجابة) */
function hardOptionsFor<T>(correct: T, pool: readonly T[], label: (x: T) => string): { hardOptions: string[]; hardAnswerIndex: number } {
  const { options, answerIndex } = optionsFor(correct, pool, label)
  return { hardOptions: options, hardAnswerIndex: answerIndex }
}

/** صعوبة الجهة حسب شهرتها التقريبية */
export function entityDifficulty(e: Entity): Difficulty {
  if (e.type === 'commission') return 4
  if (e.type === 'authority') return 3
  if (e.type === 'ministry') return 2
  return 2
}

/**
 * المشاريع والتطبيقات والشركات قليلة العدد كلٌّ على حدة، فتُجمَع في مجموعة
 * واحدة تمنحها مموّهات من الطراز نفسه (كيانات اقتصادية/استهلاكية) بدل
 * الرجوع لكل الجهات — فلا يظهر اسم وزارة كخيارٍ لسؤالٍ عن مشروع.
 */
function entityGroup(type: Entity['type']): string {
  return type === 'project' || type === 'app' || type === 'company' ? 'business' : type
}

/** جولة الشعارات — تتطلّب صوراً؛ الجهات بلا شعار مجلوب تُستبعد */
export function logoQuestions(): Question[] {
  const withLogos = entities.filter((e) => e.logo || e.lockup)
  return withLogos.map((e) => {
    // الفئة أ: الرمز المقصوص وحده يُعرض كما هو — بلا اسمٍ يكشف الإجابة،
    // فلا حاجة لتعتيمه أولاً؛ تعمية رمزٍ لا نص فيه تُصعِّب التخمين
    // بلا داعٍ بدل أن تحميه. الفئة ب: شعارها مبني على الرمز الوطني
    // المشترك فيُعرض الشعار كاملاً مع تضبيب الاسم — اللون والخط
    // والتكوين هي الدليل، والاسم وحده ما يلزم إخفاؤه.
    const useSymbol = e.tier === 'A' && !!e.logo
    const samePool = entities.filter((x) => entityGroup(x.type) === entityGroup(e.type))
    const pool = samePool.length >= 4 ? samePool : entities
    return {
      id: `logo_${e.id}`,
      round: 'logos' as const,
      prompt: 'ما الجهة صاحبة هذا الشعار؟',
      image: useSymbol ? e.logo! : (e.lockup ?? e.logo!),
      reveal: useSymbol ? ('none' as const) : ('blur' as const),
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
    // النمط الصعب: مموّهاتٌ من المنطقة والتصنيف نفسيهما إن كفت — معلمان
    // في المنطقة نفسها أصعب تمييزاً من معلمٍ بعيد من تصنيفٍ مختلف كلياً.
    const sameRegionCat = landmarks.filter((x) => x.regionAr === l.regionAr && x.category === l.category)
    const sameRegion = landmarks.filter((x) => x.regionAr === l.regionAr)
    const hardPool = sameRegionCat.length >= 4 ? sameRegionCat : sameRegion.length >= 4 ? sameRegion : pool
    const base = {
      id: `lmk_${l.id}`,
      round: 'landmarks' as const,
      difficulty: (l.category === 'unesco' || l.category === 'religious' ? 2 : 3) as Difficulty,
      category: l.category,
      explanation: l.noteAr,
      ...optionsFor(l, pool, (x) => x.nameAr),
      ...hardOptionsFor(l, hardPool, (x) => x.nameAr),
    }
    return l.image
      ? { ...base, prompt: 'ما هذا المعلم؟', image: l.image, reveal: 'zoom' as const }
      : { ...base, prompt: `${l.noteAr.replace(/[.،]\s*$/, '')} — ما هذا المعلم؟`, explanation: `${l.nameAr} — ${l.regionAr}` }
  })
}

/**
 * كل مدن المناطق الحقيقية — العواصم وغيرها — لا العواصم وحدها.
 * بلا هذا، مموّه سؤال العاصمة عاصمةٌ أخرى دائماً فيسهل استبعادها بمعرفة
 * عواصم البقية؛ أمّا مدينة حقيقية ليست عاصمة أحد فتصعب معرفتها بالاستبعاد.
 */
const allCities = regions.flatMap((r) => [r.capitalAr, ...r.otherCitiesAr])

function cityOptionsFor(correctCity: string): { options: string[]; answerIndex: number } {
  const others = allCities.filter((c) => c !== correctCity)
  return { options: [correctCity, ...shuffle(others).slice(0, 3)], answerIndex: 0 }
}

/**
 * النمط الصعب لسؤال العاصمة: مموّهاتٌ من المدن الحقيقية غير العواصم
 * حصراً — عاصمةٌ أخرى تُستبعَد بمعرفة عواصم البقية وحدها، أمّا مدينةٌ
 * حقيقية ليست عاصمة أحد فتحتاج معرفةً فعلية لا استبعاداً.
 */
const nonCapitalCities = regions.flatMap((r) => r.otherCitiesAr)

function cityHardOptionsFor(correctCity: string): { hardOptions: string[]; hardAnswerIndex: number } {
  const others = nonCapitalCities.filter((c) => c !== correctCity)
  const pool = others.length >= 3 ? others : allCities.filter((c) => c !== correctCity)
  return { hardOptions: [correctCity, ...shuffle(pool).slice(0, 3)], hardAnswerIndex: 0 }
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
    ...cityOptionsFor(r.capitalAr),
    ...cityHardOptionsFor(r.capitalAr),
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
      ...hardOptionsFor(r, regions, (x) => x.nameAr),
    }))

  return [...capitals, ...photos]
}

/**
 * تصنيفٌ تقريبي لطراز كل طبق — يُستعمَل حصراً لتضييق مموّهات النمط
 * الصعب (طبق أرزٍّ مع أطباق أرزّ أخرى أصعب تمييزاً من طبق خبزٍ بعيد
 * الشبه)، لا لأي غرضٍ آخر في اللعبة.
 */
const DISH_STYLE: Record<string, 'rice' | 'bread' | 'other'> = {
  saleeg: 'rice', 'madini-rice': 'rice', 'hassawi-rice': 'rice', haneeth: 'rice',
  sayadiyah: 'rice', kubaibat: 'rice', mlaihiyya: 'rice',
  marqooq: 'bread', ruqsh: 'bread', muqanah: 'bread',
}

function dishHardPool(d: Dish): readonly Dish[] {
  const style = DISH_STYLE[d.id] ?? 'other'
  const same = dishes.filter((x) => x.id !== d.id && (DISH_STYLE[x.id] ?? 'other') === style)
  return same.length >= 3 ? same : dishes
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
    ...hardOptionsFor(d, dishHardPool(d), (x) => x.nameAr),
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
      ...hardOptionsFor(d, dishHardPool(d), (x) => x.nameAr),
    }))

  return [...pairings, ...photos]
}

/**
 * النمط الصعب — حصراً للأسئلة التي إجابتها عددٌ صحيحٌ بسيط («كم دولة
 * تشترك مع السعودية بحدود برية؟» = ٧): مموّهاتٌ أقرب رقمياً (٦،٨،٥،٩...)
 * بدل خيارات السؤال الأصلية المتباعدة أحياناً. جُرِّبت أولاً استعارة
 * إجاباتٍ صحيحةٍ من أسئلةٍ أخرى بالتصنيف نفسه، فجاءت مموّهاتٌ لا معنى
 * لها كخيار («صحراوي حار» أمام سؤال العاصمة) لغياب تصنيفٍ دلاليٍّ أدقّ
 * من «التصنيف» العام في البيانات؛ الأمان أولى من التغطية الكاملة هنا،
 * فبقيت الأسئلة غير العددية بخياراتها المعتادة في كل الأنماط.
 */
function triviaHardOptions(t: Trivia): { hardOptions: string[]; hardAnswerIndex: number } | Record<string, never> {
  const correct = t.options[t.answerIndex]
  if (!/^\d+$/.test(correct.trim())) return {}
  const n = Number(correct)
  const used = new Set(t.options.map((o) => Number(o)).filter((x) => !Number.isNaN(x)))
  const picked: number[] = []
  for (const d of [1, -1, 2, -2, 3, -3, 4, -4]) {
    if (picked.length >= 3) break
    const cand = n + d
    if (cand < 0 || used.has(cand) || picked.includes(cand)) continue
    picked.push(cand)
    used.add(cand)
  }
  if (picked.length < 3) return {}
  return { hardOptions: [correct, ...picked.map(String)], hardAnswerIndex: 0 }
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
    ...triviaHardOptions(t),
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

/** ألقابٌ تتقدّم الاسم الشخصي بدل أن تكون جزءاً منه */
const PERSON_TITLES = new Set(['الأمير', 'الأميرة', 'الملك', 'الملكة'])

/** يفصل الاسم إلى «شخصي» (مع لقبه إن وُجد) و«عائلي/نسب» — انظر personNameHardOptions */
function splitPersonName(name: string): { given: string; family: string } {
  const tokens = name.split(' ')
  let i = 0
  while (i < tokens.length - 1 && PERSON_TITLES.has(tokens[i])) i++
  return { given: tokens.slice(0, i + 1).join(' '), family: tokens.slice(i + 1).join(' ') }
}

/**
 * النمط الصعب لسؤال الصورة: الاسم الشخصي نفسه مع نسبٍ/عائلةٍ من أشخاصٍ
 * حقيقيين آخرين — تركيبةٌ مختلَقة (ريانة + هوساوي بدل برناوي) من
 * جزأين حقيقيين، لا اسمٌ مزيَّف بالكامل ولا حقيقةٌ خاطئة تُقال عن أحد.
 */
function personNameHardOptions(p: Person, pool: readonly Person[]): { hardOptions: string[]; hardAnswerIndex: number } {
  const { given, family } = splitPersonName(p.nameAr)
  const realNames = new Set(people.map((x) => x.nameAr))
  const familyPool = (src: readonly Person[]) =>
    shuffle(Array.from(new Set(
      src.filter((x) => x.id !== p.id).map((x) => splitPersonName(x.nameAr).family).filter((f) => f && f !== family),
    )))

  const picked: string[] = []
  for (const fam of [...familyPool(pool), ...familyPool(people)]) {
    if (picked.length >= 3) break
    const combo = `${given} ${fam}`
    if (combo !== p.nameAr && !realNames.has(combo) && !picked.includes(combo)) picked.push(combo)
  }
  // شبكة أمان أخيرة لو ظلّ العدد ناقصاً (بياناتٌ ضئيلة جداً)
  if (picked.length < 3) {
    for (const name of shuffle(people.filter((x) => x.id !== p.id).map((x) => x.nameAr))) {
      if (picked.length >= 3) break
      if (!picked.includes(name)) picked.push(name)
    }
  }
  return { hardOptions: [p.nameAr, ...picked], hardAnswerIndex: 0 }
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
 * جولة الشخصيات — سؤال مصوّر عن الاسم لمن له صورة، وسؤال نصّي عن المنصب
 * أو الفترة أو المنطقة أو الشهرة لمن لا صورة له. لا يجتمع السؤالان لشخصٍ
 * واحد في البنك: سؤال الصورة يكشف منصبه ضمن شرحه (explanation)، فسؤالٌ
 * نصّيٌّ عنه لاحقاً في الجلسة نفسها كان يصير محلولاً سلفاً بلا معرفةٍ حقيقية.
 */
export function peopleQuestions(): Question[] {
  const withPhoto = people.filter((p) => p.image)
  const byGroup = (g: PersonGroup, pool: readonly Person[]) => pool.filter((p) => p.group === g)
  const byFact = (k: FactKind, pool: readonly Person[]) => pool.filter((p) => p.factKind === k)
  const out: Question[] = []

  for (const p of people) {
    if (p.image) {
      const sameGroupPhoto = byGroup(p.group, withPhoto)
      out.push({
        id: `who_${p.id}`,
        round: 'people',
        prompt: WHO_PROMPT[p.group][p.fem ? 1 : 0],
        image: p.image,
        reveal: 'none',
        difficulty: p.group === 'governors' ? 4 : 3,
        category: GROUP_LABEL[p.group],
        explanation: `${p.nameAr} — ${p.roleAr}`,
        ...peopleOptions(p, [sameGroupPhoto, byFact(p.factKind, withPhoto), withPhoto], (x) => x.nameAr),
        ...personNameHardOptions(p, sameGroupPhoto.length >= 4 ? sameGroupPhoto : withPhoto),
      })
    } else {
      const sameGroup = byGroup(p.group, people)
      out.push({
        id: `fact_${p.id}`,
        round: 'people',
        prompt: factPrompt(p),
        difficulty: p.group === 'governors' ? 4 : 3,
        category: GROUP_LABEL[p.group],
        explanation: factExplanation(p),
        // نفس الفئة أولاً — رياضي مع رياضيين لا مع رائد فضاء — ثم نفس نوع
        // السؤال، ثم الجميع؛ بلا الفئة أولاً كانت مموّهات «الشهرة» تخلط
        // مجالات مختلفة كلياً (كرة قدم مع فضاء) فتُكشَف الإجابة بلا معرفة.
        ...peopleOptions(p, [sameGroup, byFact(p.factKind, people), people], (x) => x.factAr),
        // النمط الصعب: الفئة نفسها حصراً — بلا التوسّع لنوع السؤال ثم الجميع
        ...hardOptionsFor(p, sameGroup.length >= 4 ? sameGroup : people, (x) => x.factAr),
      })
    }
  }

  return out
}

export const ROUNDS: RoundMeta[] = [
  {
    id: 'songs', title: 'خمّن الأغنية', subtitle: 'ثلاث مراحل… كم تحتاج لتعرفها؟', icon: 'music',
    howTo: [
      'استمع إلى المقطع الأول، وخمّن اسم الأغنية بصوتك.',
      'اضغط «لا أعلم» لسماع المقطع الثاني، ثم اضغطها مرة أخرى لسماع المقطع المشهور.',
      'إذا عرفتها، قل الاسم أولاً واضغط «عرفت الأغنية»، ثم قيّم إجابتك بعد ظهور الاسم.',
      'الإجابة الصحيحة تمنحك 300 نقطة دائماً، في أيّ مرحلةٍ عرفتها.',
      'إعادة المقطع مجانية، والتفكير بلا مؤقّت.',
      '«لا أعلم» في المرحلة الثالثة تكشف الإجابة وتُنهي السؤال بلا نقاط.',
    ],
  },
  {
    id: 'logos', title: 'خمّن الشعار', subtitle: 'وزارات وهيئات وشركات ومشاريع', icon: '◆',
    howTo: [
      'يظهر الرمز وحده بلا اسم مكتوب.',
      'خمّن الجهة في بالك، ثم اضغط «اعرض الإجابة».',
      'يظهر الشعار كاملاً مع الاسم، فاحكم على نفسك: عرفتها أو ما عرفتها.',
      'كل إجابة صحيحة تمنحك 300 نقطة.',
    ],
  },
  {
    id: 'landmarks', title: 'خمّن المعلم', subtitle: 'مواقع اليونسكو والمعالم والعمارة', icon: '▲',
    howTo: [
      'تبدأ الصورة من تفصيل مقصوص ثم تتّسع شيئاً فشيئاً.',
      'جرّب الإجابة في بالك أولاً، ثم اضغط «أظهر الخيارات» إن احتجتها.',
      'الإجابة الصحيحة تمنحك 300 نقطة، لكن 150 فقط إن أظهرتَ الخيارات أولاً (في النمط المتوسط أو الصعب) — طلبها مخاطرةٌ تُنقص نصف النقاط.',
    ],
  },
  {
    id: 'regions', title: 'خمّن المنطقة', subtitle: 'المناطق الثلاث عشرة وعواصمها', icon: '●',
    howTo: [
      'أسئلة عن المناطق الثلاث عشرة وعواصمها.',
      'جرّب الإجابة في بالك أولاً، ثم اضغط «أظهر الخيارات» إن احتجتها.',
      'اختر الإجابة الصحيحة، بلا مؤقّت — خذ راحتك.',
      'الإجابة الصحيحة تمنحك 300 نقطة، لكن 150 فقط إن أظهرتَ الخيارات أولاً (في النمط المتوسط أو الصعب).',
    ],
  },
  {
    id: 'dishes', title: 'خمّن الطبق', subtitle: 'الأطباق الرسمية للمناطق', icon: '◗',
    howTo: [
      'لكل منطقة طبق رسمي واحد معتمد.',
      'جرّب الإجابة في بالك أولاً، ثم اضغط «أظهر الخيارات» إن احتجتها.',
      'اختر الإجابة الصحيحة، بلا مؤقّت — خذ راحتك.',
      'الإجابة الصحيحة تمنحك 300 نقطة، لكن 150 فقط إن أظهرتَ الخيارات أولاً (في النمط المتوسط أو الصعب).',
    ],
  },
  {
    id: 'people', title: 'خمّن الشخصية', subtitle: 'ملوك ووزراء وأمراء ومشاهير', icon: '◉',
    howTo: [
      'تظهر صورة شخصية والسؤال عن اسمها، أو يأتي الاسم والسؤال عن منصبه أو منطقته أو فترة حكمه أو ما اشتُهر به.',
      'الخيارات من الفئة نفسها: ملك مع ملوك، ووزير مع وزراء.',
      'جرّب الإجابة في بالك أولاً، ثم اضغط «أظهر الخيارات» إن احتجتها.',
      'اختر الإجابة الصحيحة، بلا مؤقّت — خذ راحتك.',
      'الإجابة الصحيحة تمنحك 300 نقطة، لكن 150 فقط إن أظهرتَ الخيارات أولاً (في النمط المتوسط أو الصعب).',
      'أسماء الوزراء وأمراء المناطق محدّثة حسب آخر تشكيل.',
    ],
  },
  {
    id: 'trivia', title: 'أسئلة معرفية', subtitle: 'جغرافيا وتاريخ وثقافة', icon: '✦',
    howTo: [
      'أسئلة من جغرافيا وتاريخ وثقافة ومعالم ومحميات ورؤية 2030 وغيرها.',
      'جرّب الإجابة في بالك أولاً، ثم اضغط «أظهر الخيارات» إن احتجتها.',
      'اختر الإجابة الصحيحة، بلا مؤقّت — خذ راحتك.',
      'الإجابة الصحيحة تمنحك 300 نقطة، لكن 150 فقط إن أظهرتَ الخيارات أولاً (في النمط المتوسط أو الصعب).',
      'بعد كل إجابة يظهر شرح مختصر.',
    ],
  },
]

export function poolFor(round: string): Question[] {
  switch (round) {
    case 'songs': return songQuestions()
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
    { id: 'round:songs', label: 'الأغاني', group: 'جولات', count: songQuestions().length },
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

  if (picked.has('round:songs')) out.push(...songQuestions())
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

  return out.map((q) => ({ ...q, selectionSource:
    q.round === 'trivia' ? `cat:${q.category}`
      : q.round === 'people' && !picked.has('round:people') ? `people:${q.category}`
      : `round:${q.round}`,
  }))
}

/**
 * عدد أسئلة المصادر المختارة دون بناء بنك الأسئلة كاملاً — فلوحة
 * الإعداد تحتاج رقماً بعد كل نقرة، وبناء الأسئلة (مع خياراتها) لكل
 * الفئات في كل نقرة كان يجعل الاختيار متأخّراً ملموساً. نفس أولويّة
 * poolFromSources: round:people يُبطل فئات الشخصيات المحدَّدة.
 */
export function availableFromSources(sources: readonly PoolSource[], ids: readonly string[]): number {
  const picked = new Set(ids)
  const peopleRoundPicked = picked.has('round:people')
  let total = 0
  for (const s of sources) {
    if (s.group === 'فئات الشخصيات') {
      if (!peopleRoundPicked && picked.has(s.id)) total += s.count
    } else if (picked.has(s.id)) total += s.count
  }
  return total
}

/** الجهات المؤهَّلة لجولة «خمّن الشعار» بصيغة البطاقات */
export function logoCards(): Entity[] {
  return entities.filter((e) => e.lockup || e.logo)
}

/**
 * يستبدل خيارات الأسئلة بنسختها الأعسر (hardOptions) في نمط اللعب
 * الصعب — يُستدعى مرّةً على بنك الأسئلة قبل بدء الجولة، فتبقى بقية
 * الشيفرة (Play.tsx، AnswerGrid، تبويب الجمهور) غافلةً عن وجود نمطين
 * أصلاً؛ الأسئلة بلا مموّهاتٍ أعسر (الأغنية، أو ما لم يُصعَّب) تمرّ كما هي.
 */
export function applyDifficulty(pool: readonly Question[], mode: PlayMode): Question[] {
  if (mode !== 'hard') return pool.slice()
  return pool.map((q) =>
    q.kind === 'song' || !q.hardOptions || q.hardAnswerIndex === undefined
      ? q
      : { ...q, options: q.hardOptions, answerIndex: q.hardAnswerIndex },
  )
}
