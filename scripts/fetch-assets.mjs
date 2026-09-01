import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { extname } from 'node:path'

const UA = 'SaudiKnowledge/0.1 (local personal quiz game)'
const rows = JSON.parse(readFileSync('scripts/logo-candidates.json', 'utf8'))
// صور جرت معاينتها ورُفضت: صور مبانٍ أو أشخاص أو خرائط التقطها البحث التلقائي
const rejected = JSON.parse(readFileSync('scripts/rejected.json', 'utf8'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

async function api(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (res.status === 429 || res.status >= 500) { await sleep(3000 * (i + 1)); continue }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }
  throw new Error('محدود المعدّل')
}

/**
 * تُحلّ أسماء ملفات كومنز عبر الواجهة البرمجية بدل بناء مسار الـ md5 يدوياً.
 * الروابط التي تعيدها الواجهة تُخدَم فعلاً (200)، بينما المسار المبني يدوياً
 * يُقابَل بـ 429 — ويكيميديا تعامل التنزيل المُحال من الواجهة معاملةً مختلفة.
 */
async function resolveCommons(files) {
  const out = {}
  for (const group of chunk(files, 40)) {
    const titles = group.map((f) => `File:${f}`).join('|')
    const u = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=960&format=json&titles=${encodeURIComponent(titles)}`
    let j
    try { j = await api(u) } catch { continue }
    const norm = {}
    for (const n of j.query?.normalized ?? []) norm[n.from] = n.to
    const byTitle = {}
    for (const p of Object.values(j.query?.pages ?? {})) {
      const ii = p.imageinfo?.[0]
      if (ii) byTitle[p.title] = ii
    }
    for (const f of group) {
      let t = `File:${f}`
      for (let i = 0; i < 3; i++) t = norm[t] ?? t
      if (byTitle[t]) out[f] = byTitle[t]
    }
    await sleep(700)
  }
  return out
}

const wanted = rows.filter((r) => (r.logo || r.fallback) && !rejected[r.id])
const commonsFiles = [...new Set(wanted.filter((r) => r.logo).map((r) => r.logo))]
const resolved = await resolveCommons(commonsFiles)
console.log(`حُلّ من كومنز: ${Object.keys(resolved).length} من ${commonsFiles.length}\n`)

const manifest = []
let downloaded = 0, cached = 0, failed = 0

for (const r of wanted) {
  let url = null
  if (r.logo) {
    const ii = resolved[r.logo]
    // دائماً النسخة المصغَّرة من الواجهة: هي التي تُخدَم فعلاً،
    // بينما الرابط الأصلي يُقابَل بـ 429. وكل الشعارات تُحوَّل إلى PNG لاحقاً
    // (scripts/to-png.mjs) فلا نخسر شيئاً بترك ملف SVG الأصلي.
    if (ii) url = ii.thumburl ?? ii.url
  } else {
    url = r.fallback
  }
  if (!url) { console.log(`✗ ${r.id.padEnd(13)} تعذّر حلّ الرابط`); failed++; continue }

  const source = r.logo ? 'wikidata:P154' : r.fallbackFrom
  let ext = extname(new URL(url).pathname).toLowerCase()
  if (!['.svg', '.png', '.jpg', '.jpeg', '.webp'].includes(ext)) ext = '.png'
  const file = `${r.id}${ext}`
  const dest = `public/assets/logos/${file}`

  const record = (bytes, u) => manifest.push({
    id: r.id, nameAr: r.nameAr, type: r.type, file: `assets/logos/${file}`,
    bytes, source, sourceUrl: u, wikiTitle: r.title, qid: r.qid ?? null,
  })

  // الشعارات تُحوَّل إلى PNG بعد التنزيل (scripts/to-png.mjs)، فيتغيّر الامتداد.
  // نبحث عن أي ملف بهذا المعرّف مهما كان امتداده، وإلا أعدنا تنزيل ما هو موجود.
  const already = readdirSync('public/assets/logos').find((f) => f.replace(/\.[^.]+$/, '') === r.id)
  if (already) {
    const p = `assets/logos/${already}`
    manifest.push({
      id: r.id, nameAr: r.nameAr, type: r.type, file: p,
      bytes: statSync(`public/${p}`).size, source, sourceUrl: url, wikiTitle: r.title, qid: r.qid ?? null,
    })
    cached++
    continue
  }
  if (existsSync(dest)) { record(statSync(dest).size, url); cached++; continue }

  try {
    // تنزيل بتراجع تصاعدي: الشبكة قد تكون في فترة عقوبة من طلبات سابقة
    let res
    for (let i = 0; i < 5; i++) {
      res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (res.status !== 429) break
      await sleep(5000 * (i + 1))
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 200) throw new Error('ملف صغير جداً')
    writeFileSync(dest, buf)
    record(buf.length, url)
    console.log(`✓ ${r.id.padEnd(13)} ${(buf.length / 1024).toFixed(0).padStart(5)} ك.ب  ${source}`)
    downloaded++
  } catch (err) {
    console.log(`✗ ${r.id.padEnd(13)} ${err.message}`)
    failed++
  }
  await sleep(2500)
}

writeFileSync('src/data/assets.json', JSON.stringify(manifest, null, 2) + '\n')
console.log(`\nجديد ${downloaded} · موجود ${cached} · فشل ${failed} · في السجل ${manifest.length}`)
