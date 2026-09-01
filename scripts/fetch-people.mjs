// يجلب صور الوزراء من ويكيبيديا العربية ويربطها ببيانات الأشخاص.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { extname } from 'node:path'

const UA = 'SaudiKnowledge/0.1 (local personal quiz game)'
const OUT = 'public/assets/people'
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const titles = JSON.parse(readFileSync('scripts/people-titles.json', 'utf8'))
const commons = existsSync('scripts/people-commons.json')
  ? JSON.parse(readFileSync('scripts/people-commons.json', 'utf8'))
  : {}
const people = JSON.parse(readFileSync('src/data/people.json', 'utf8'))
const rejected = existsSync('scripts/rejected-people.json')
  ? JSON.parse(readFileSync('scripts/rejected-people.json', 'utf8'))
  : {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

async function api(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (res.status === 429 || res.status >= 500) { await sleep(4000 * (i + 1)); continue }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    try { return JSON.parse(text) } catch { await sleep(4000 * (i + 1)) }
  }
  throw new Error('محدود المعدّل')
}

const ids = [...new Set([...Object.keys(titles), ...Object.keys(commons)])].filter((id) => !rejected[id])
const found = {}

const wikiIds = ids.filter((id) => titles[id])
for (const group of chunk(wikiIds, 12)) {
  const u = `https://ar.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=640&pilicense=any&redirects=1&format=json&titles=${encodeURIComponent(group.map((i) => titles[i]).join('|'))}`
  let j
  try { j = await api(u) } catch (e) { console.log('! تعذّر الحلّ:', e.message); continue }
  const norm = {}
  for (const n of j.query?.normalized ?? []) norm[n.from] = n.to
  for (const r of j.query?.redirects ?? []) norm[r.from] = r.to
  const byTitle = {}
  for (const p of Object.values(j.query?.pages ?? {})) if (p.thumbnail) byTitle[p.title] = p.thumbnail.source
  for (const id of group) {
    let t = titles[id]
    for (let k = 0; k < 3; k++) t = norm[t] ?? t
    if (byTitle[t]) found[id] = byTitle[t]
  }
  await sleep(1500)
}

// من لا مقالة له بصورة: نأخذ الملف مباشرة من ويكيميديا كومنز.
// ii.thumburl هو المسار المخدوم؛ ii.url يردّ 429 غالباً.
const commonsIds = ids.filter((id) => commons[id])
for (const group of chunk(commonsIds, 10)) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=640&format=json&titles=${encodeURIComponent(group.map((i) => commons[i]).join('|'))}`
  let j
  try { j = await api(u) } catch (e) { console.log('! كومنز:', e.message); continue }
  const byTitle = {}
  for (const p of Object.values(j.query?.pages ?? {})) {
    const ii = p.imageinfo?.[0]
    if (ii?.thumburl) byTitle[p.title] = ii.thumburl
  }
  for (const id of group) if (byTitle[commons[id]]) found[id] = byTitle[commons[id]]
  await sleep(1500)
}

let got = 0, failed = 0
const manifest = []

for (const id of ids) {
  const url = found[id]
  if (!url) { console.log(`—  ${id.padEnd(18)} لا صورة`); failed++; continue }
  let ext = extname(new URL(url).pathname).toLowerCase()
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) ext = '.jpg'
  const file = `assets/people/${id}${ext}`
  const person = people.find((p) => p.id === id)

  if (existsSync(`public/${file}`)) {
    person.image = file
    manifest.push({ id, nameAr: person.nameAr, file, source: 'ar.wikipedia', sourceUrl: url })
    got++
    continue
  }

  try {
    let res
    for (let i = 0; i < 4; i++) {
      res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (res.status !== 429 && res.status < 500) break
      await sleep(6000 * (i + 1))
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 2000) throw new Error('صغير جداً')
    writeFileSync(`public/${file}`, buf)
    person.image = file
    manifest.push({ id, nameAr: person.nameAr, file, source: 'ar.wikipedia', sourceUrl: url })
    console.log(`✓ ${id.padEnd(18)} ${(buf.length / 1024).toFixed(0).padStart(4)} ك.ب  ${person.nameAr}`)
    got++
  } catch (err) {
    console.log(`✗ ${id.padEnd(18)} ${err.message}`)
    failed++
  }
  await sleep(600)
}

// امسح صور المرفوضين
for (const p of people) if (rejected[p.id]) p.image = null

writeFileSync('src/data/people.json', JSON.stringify(people, null, 2) + '\n')
writeFileSync('src/data/people-assets.json', JSON.stringify(manifest, null, 2) + '\n')
console.log(`\nبصورة ${got} · بلا صورة ${failed} · المجموع ${people.length}`)
