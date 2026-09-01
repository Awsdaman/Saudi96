import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { extname } from 'node:path'

const UA = 'SaudiKnowledge/0.1 (local personal quiz game)'
const arTitles = JSON.parse(readFileSync('scripts/landmark-titles.json', 'utf8'))
const enTitles = JSON.parse(readFileSync('scripts/landmark-titles-en.json', 'utf8'))
const landmarks = JSON.parse(readFileSync('src/data/landmarks.json', 'utf8'))
const rejected = existsSync('scripts/rejected-landmarks.json')
  ? JSON.parse(readFileSync('scripts/rejected-landmarks.json', 'utf8'))
  : {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

async function api(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (res.status === 429 || res.status >= 500) { await sleep(4000 * (i + 1)); continue }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }
  throw new Error('محدود المعدّل')
}

/** صور الصدارة بعرض ٩٦٠ بكسل — كافٍ للعبة وأخفّ من الأصل */
async function leadImages(wiki, titleList) {
  const out = {}
  for (const group of chunk(titleList, 25)) {
    const u = `https://${wiki}/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=960&pilicense=any&redirects=1&format=json&titles=${encodeURIComponent(group.join('|'))}`
    const j = await api(u)
    const norm = {}
    for (const n of j.query?.normalized ?? []) norm[n.from] = n.to
    for (const r of j.query?.redirects ?? []) norm[r.from] = r.to
    const byTitle = {}
    for (const p of Object.values(j.query?.pages ?? {})) {
      if (p.thumbnail?.source) byTitle[p.title] = p.thumbnail.source
    }
    for (const t of group) {
      let t0 = t
      for (let i = 0; i < 3; i++) t0 = norm[t0] ?? t0
      if (byTitle[t0]) out[t] = byTitle[t0]
    }
    await sleep(900)
  }
  return out
}

const wanted = landmarks.filter((l) => !rejected[l.id])
const arLead = await leadImages('ar.wikipedia.org', wanted.map((l) => arTitles[l.id]))
const stillNeed = wanted.filter((l) => !arLead[arTitles[l.id]])
const enLead = stillNeed.length ? await leadImages('en.wikipedia.org', stillNeed.map((l) => enTitles[l.id])) : {}

const manifest = []
let downloaded = 0, cached = 0, failed = 0

for (const l of wanted) {
  const url = arLead[arTitles[l.id]] ?? enLead[enTitles[l.id]]
  if (!url) { console.log(`—  ${l.id.padEnd(16)} لا صورة`); failed++; continue }
  const from = arLead[arTitles[l.id]] ? 'ar.wikipedia' : 'en.wikipedia'

  let ext = extname(new URL(url).pathname).toLowerCase()
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) ext = '.jpg'
  const file = `${l.id}${ext}`
  const dest = `public/assets/landmarks/${file}`

  const record = (bytes) => manifest.push({
    id: l.id, nameAr: l.nameAr, category: l.category,
    file: `assets/landmarks/${file}`, bytes, source: from, sourceUrl: url,
  })

  if (existsSync(dest)) { record(statSync(dest).size); cached++; continue }

  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 2000) throw new Error('صغير جداً')
    writeFileSync(dest, buf)
    record(buf.length)
    console.log(`✓ ${l.id.padEnd(16)} ${(buf.length / 1024).toFixed(0).padStart(5)} ك.ب  ${from}`)
    downloaded++
  } catch (err) {
    console.log(`✗ ${l.id.padEnd(16)} ${err.message}`)
    failed++
  }
  await sleep(250)
}

writeFileSync('src/data/landmark-assets.json', JSON.stringify(manifest, null, 2) + '\n')

// اربط الصور بالمعالم
const byId = Object.fromEntries(manifest.map((m) => [m.id, m]))
for (const l of landmarks) l.image = byId[l.id]?.file ?? null
writeFileSync('src/data/landmarks.json', JSON.stringify(landmarks, null, 2) + '\n')

console.log(`\nجديد ${downloaded} · موجود ${cached} · بلا صورة ${failed} · مربوط ${manifest.length} من ${landmarks.length}`)
