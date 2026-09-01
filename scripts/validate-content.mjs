import { readFileSync, existsSync } from 'node:fs'

const read = (p) => JSON.parse(readFileSync(p, 'utf8'))
const entities = read('src/data/entities.json')
const landmarks = read('src/data/landmarks.json')
const regions = read('src/data/regions.json')
const dishes = read('src/data/dishes.json')
const trivia = read('src/data/trivia.json')
const people = read('src/data/people.json')

const GROUPS = ['ministers', 'kings', 'governors', 'astronauts', 'athletes', 'artists', 'business', 'historic']
const FACTS = ['role', 'reign', 'region', 'fame']

const problems = []
const warn = []
const fail = (m) => problems.push(m)

// ── أسئلة حقيبة البحث ──
const ids = new Set()
for (const q of trivia) {
  if (ids.has(q.id)) fail(`سؤال بمعرّف مكرر: ${q.id}`)
  ids.add(q.id)
  if (!Array.isArray(q.options) || q.options.length !== 4) fail(`${q.id}: يجب أن تكون الخيارات أربعة`)
  if (q.answerIndex < 0 || q.answerIndex >= (q.options?.length ?? 0)) fail(`${q.id}: answerIndex خارج النطاق`)
  if (new Set(q.options).size !== q.options.length) fail(`${q.id}: خيارات مكررة`)
  if (![1, 2, 3, 4].includes(q.difficulty)) fail(`${q.id}: صعوبة غير صالحة (${q.difficulty})`)
  if (!q.explanation) warn.push(`${q.id}: بلا شرح`)
}

// ── الجهات ──
const entIds = new Set()
for (const e of entities) {
  if (entIds.has(e.id)) fail(`جهة بمعرّف مكرر: ${e.id}`)
  entIds.add(e.id)
  if (!['A', 'B'].includes(e.tier)) fail(`${e.id}: فئة غير صالحة`)
  for (const key of ['logo', 'lockup']) {
    if (e[key] && !existsSync(`public/${e[key]}`)) fail(`${e.id}: الملف مفقود ${e[key]}`)
  }
  if (!e.tierVerified) warn.push(`${e.id}: التصنيف (أ/ب) لم يُتحقق منه بمعاينة الشعار`)
}

// كل نوع يحتاج أربع جهات على الأقل ليُبنى منه سؤال بمموّهات من النوع نفسه
const withLogo = entities.filter((e) => e.logo || e.lockup)
const byType = {}
for (const e of withLogo) (byType[e.type] ??= []).push(e.id)
for (const [type, list] of Object.entries(byType)) {
  if (list.length < 4) warn.push(`النوع "${type}" فيه ${list.length} جهة بشعار — المموّهات ستُسحب من أنواع أخرى`)
}

// ── المعالم والمناطق والأطباق ──
for (const l of landmarks) {
  if (l.image && !existsSync(`public/${l.image}`)) fail(`معلم ${l.id}: الصورة مفقودة ${l.image}`)
  if (!l.noteAr) fail(`معلم ${l.id}: بلا وصف — السؤال النصي يعتمد عليه`)
}
for (const r of regions) if (r.image && !existsSync(`public/${r.image}`)) fail(`منطقة ${r.id}: الصورة مفقودة`)
for (const d of dishes) if (d.image && !existsSync(`public/${d.image}`)) fail(`طبق ${d.id}: الصورة مفقودة`)

if (regions.length !== 13) fail(`عدد المناطق ${regions.length} بدل 13`)
if (dishes.length !== 13) fail(`عدد الأطباق ${dishes.length} بدل 13`)
if (new Set(dishes.map((d) => d.regionAr)).size !== 13) fail('الأطباق لا تغطي المناطق الثلاث عشرة تغطية واحد لواحد')

const regionNames = new Set(regions.map((r) => r.shortAr))
for (const d of dishes) if (!regionNames.has(d.regionAr)) fail(`طبق ${d.id}: منطقة غير معروفة "${d.regionAr}"`)
for (const l of landmarks) if (!regionNames.has(l.regionAr)) fail(`معلم ${l.id}: منطقة غير معروفة "${l.regionAr}"`)

// ── الأشخاص ──
const personIds = new Set()
for (const p of people) {
  if (personIds.has(p.id)) fail(`شخص بمعرّف مكرر: ${p.id}`)
  personIds.add(p.id)
  if (p.image && !existsSync(`public/${p.image}`)) fail(`شخص ${p.id}: الصورة مفقودة ${p.image}`)
  if (!p.roleAr) fail(`شخص ${p.id}: بلا منصب`)
  if (p.entityId && !entities.some((e) => e.id === p.entityId)) fail(`شخص ${p.id}: جهة غير معروفة ${p.entityId}`)
  if (!GROUPS.includes(p.group)) fail(`شخص ${p.id}: فئة غير صالحة (${p.group})`)
  if (!FACTS.includes(p.factKind)) fail(`شخص ${p.id}: نوع سؤال غير صالح (${p.factKind})`)
  if (!p.factAr) fail(`شخص ${p.id}: بلا نصّ إجابة (factAr)`)
}

// السؤال الثاني يبني خياراته من نوعه نفسه، فيحتاج كل نوع أربعة إجابات مختلفة
for (const k of FACTS) {
  const n = new Set(people.filter((p) => p.factKind === k).map((p) => p.factAr)).size
  if (n && n < 4) fail(`نوع السؤال «${k}»: ${n} إجابات مختلفة فقط — يحتاج أربعاً`)
}
// وكل فئة مصوّرة يُفضَّل أن تبلغ أربعة حتى لا تُستعار المموّهات من فئة أخرى
for (const g of GROUPS) {
  const n = people.filter((p) => p.group === g && p.image).length
  if (n && n < 4) warn.push(`فئة «${g}»: ${n} صور فقط — ستُستعار المموّهات من فئة أخرى`)
}

const withPhoto = people.filter((p) => p.image).length
if (withPhoto < 4) warn.push(`أشخاص بصورة ${withPhoto} — الجولة تحتاج أربعة على الأقل لتوليد مموّهات`)

// ── ثنائية الاتجاه: «1953–1964» تنعكس بصرياً داخل فقرة عربية ──
// الشرطة بين رقمين تُعامل كمحرف يميني، فيقرأها اللاعب 1964–1953.
// الصياغة الصحيحة: «من 1953 إلى 1964».
const RANGE = /\d{3,4}\s*[–—-]\s*\d{3,4}/
for (const [name, rows, keys] of [
  ['أشخاص', people, ['nameAr', 'roleAr', 'factAr']],
  ['أسئلة', trivia, ['prompt', 'explanation']],
]) {
  for (const r of rows) {
    for (const k of keys) {
      if (typeof r[k] === 'string' && RANGE.test(r[k])) fail(`${name} ${r.id}: مدى رقمي ينعكس في العربية (${k}) — استخدم «من … إلى …»`)
    }
    if (Array.isArray(r.options)) {
      for (const o of r.options) if (RANGE.test(o)) fail(`${name} ${r.id}: مدى رقمي ينعكس في خيار «${o}»`)
    }
  }
}

// ── ملفات يتيمة: نُزّلت ثم رُفضت أو تغيّر اسمها، فبقيت على القرص بلا سجل ──
const { readdirSync } = await import('node:fs')
const manifest = existsSync('src/data/assets.json') ? read('src/data/assets.json') : []
const known = new Set(manifest.map((m) => m.file.replace('assets/logos/', '')))
for (const f of readdirSync('public/assets/logos')) {
  if (!known.has(f)) warn.push(`ملف يتيم بلا سجل: assets/logos/${f}`)
}

// ── التقرير ──
console.log(`أسئلة: ${trivia.length} · جهات: ${entities.length} (بشعار ${withLogo.length}) · معالم: ${landmarks.length} (بصورة ${landmarks.filter((l) => l.image).length})`)
console.log(`مناطق: ${regions.length} · أطباق: ${dishes.length} · أشخاص: ${people.length} (بصورة ${withPhoto})`)

if (warn.length) {
  console.log(`\nتنبيهات (${warn.length}):`)
  const shown = warn.slice(0, 6)
  for (const w of shown) console.log(`  · ${w}`)
  if (warn.length > shown.length) console.log(`  · … و${warn.length - shown.length} غيرها`)
}

if (problems.length) {
  console.log(`\nأخطاء (${problems.length}):`)
  for (const p of problems) console.log(`  ✗ ${p}`)
  process.exit(1)
}
console.log('\nاجتاز الفحص')
