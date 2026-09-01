// يفحص عناوين ويكيبيديا العربية: هل توجد الصفحة؟ وهل لها صورة؟
import { readFileSync } from 'node:fs'
const UA = 'SaudiKnowledge/0.1 (local personal quiz game)'
const LANG = process.argv[3] || 'ar'
const titles = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

async function api(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (res.status === 429 || res.status >= 500) { await sleep(5000 * (i + 1)); continue }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return JSON.parse(await res.text())
  }
  throw new Error('rate limited')
}

const ids = Object.keys(titles)
for (const group of chunk(ids, 10)) {
  const u = `https://${LANG}.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=640&pilicense=any&redirects=1&format=json&titles=${encodeURIComponent(group.map((i) => titles[i]).join('|'))}`
  let j
  try { j = await api(u) } catch (e) { console.log('!! batch failed', e.message); continue }
  const norm = {}
  for (const n of j.query?.normalized ?? []) norm[n.from] = n.to
  for (const r of j.query?.redirects ?? []) norm[r.from] = r.to
  const info = {}
  for (const p of Object.values(j.query?.pages ?? {})) info[p.title] = { missing: 'missing' in p, thumb: p.thumbnail?.source }
  for (const id of group) {
    let t = titles[id]
    for (let k = 0; k < 3; k++) t = norm[t] ?? t
    const i = info[t]
    const st = !i ? '???' : i.missing ? 'NOPAGE' : i.thumb ? 'PHOTO' : 'nophoto'
    console.log(`${st.padEnd(8)} ${id.padEnd(22)} ${titles[id]}${t !== titles[id] ? '  ->  ' + t : ''}`)
  }
  await sleep(1200)
}
