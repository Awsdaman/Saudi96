import { readFileSync, writeFileSync } from 'node:fs'

const UA = 'SaudiKnowledge/0.1 (local personal quiz game)'
const titles = JSON.parse(readFileSync('scripts/wiki-titles.json', 'utf8'))
const entities = JSON.parse(readFileSync('src/data/entities.json', 'utf8'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** طلب مع إعادة محاولة تصاعدية عند 429 */
async function api(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (res.status === 429) {
      await sleep(2000 * (i + 1))
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }
  throw new Error('429 بعد عدة محاولات')
}

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))

// ١) عناوين ويكيبيديا العربية ← معرّفات ويكي بيانات (٥٠ عنواناً لكل طلب)
const ids = Object.keys(titles)
const titleToQid = {}
for (const group of chunk(ids, 40)) {
  const t = group.map((id) => titles[id]).join('|')
  const u = `https://ar.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&format=json&titles=${encodeURIComponent(t)}`
  const j = await api(u)
  const norm = {}
  for (const n of j.query?.normalized ?? []) norm[n.from] = n.to
  for (const r of j.query?.redirects ?? []) norm[r.from] = r.to
  const pagesByTitle = {}
  for (const p of Object.values(j.query?.pages ?? {})) {
    if (p.pageprops?.wikibase_item) pagesByTitle[p.title] = p.pageprops.wikibase_item
  }
  for (const id of group) {
    let t0 = titles[id]
    for (let i = 0; i < 3; i++) t0 = norm[t0] ?? t0
    if (pagesByTitle[t0]) titleToQid[id] = pagesByTitle[t0]
  }
  await sleep(600)
}

console.log(`عُثر على معرّفات ويكي بيانات: ${Object.keys(titleToQid).length} من ${ids.length}`)

// ٢) المعرّفات ← الشعار P154 (٥٠ معرّفاً لكل طلب)
const qids = [...new Set(Object.values(titleToQid))]
const claims = {}
for (const group of chunk(qids, 40)) {
  const u = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${group.join('|')}&props=claims|labels&languages=ar&format=json`
  const j = await api(u)
  for (const [qid, ent] of Object.entries(j.entities ?? {})) {
    const pick = (p) => ent.claims?.[p]?.[0]?.mainsnak?.datavalue?.value ?? null
    claims[qid] = { label: ent.labels?.ar?.value ?? '', logo: pick('P154'), image: pick('P18') }
  }
  await sleep(600)
}

const rows = entities.map((e) => {
  const qid = titleToQid[e.id]
  const c = qid ? claims[qid] : null
  return {
    id: e.id, nameAr: e.nameAr, type: e.type, tier: e.tier,
    title: titles[e.id], qid: qid ?? null,
    label: c?.label ?? null, logo: c?.logo ?? null, image: c?.image ?? null,
  }
})

writeFileSync('scripts/logo-candidates.json', JSON.stringify(rows, null, 2))

for (const r of rows) {
  const mark = r.logo ? 'شعار ' : r.image ? 'صورة ' : r.qid ? 'بلا  ' : 'مفقود'
  console.log(`${mark} ${r.id.padEnd(13)} ${(r.label ?? '—').padEnd(38)} ${r.logo ?? ''}`)
}
const n = (f) => rows.filter(f).length
console.log(`\nشعار ${n((r) => r.logo)} · صورة فقط ${n((r) => !r.logo && r.image)} · بلا صورة ${n((r) => r.qid && !r.logo && !r.image)} · صفحة مفقودة ${n((r) => !r.qid)}`)
