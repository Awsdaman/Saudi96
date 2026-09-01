import { readFileSync, writeFileSync } from 'node:fs'

const UA = 'SaudiKnowledge/0.1 (local personal quiz game)'
const rows = JSON.parse(readFileSync('scripts/logo-candidates.json', 'utf8'))
const titles = JSON.parse(readFileSync('scripts/wiki-titles.json', 'utf8'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

async function api(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (res.status === 429) { await sleep(2000 * (i + 1)); continue }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }
  throw new Error('429')
}

/** صورة الصدارة لمقالة — غالباً هي الشعار في مقالات الجهات */
async function leadImages(wiki, titleList) {
  const out = {}
  for (const group of chunk(titleList, 30)) {
    const u = `https://${wiki}/w/api.php?action=query&prop=pageimages&piprop=original&pilicense=any&redirects=1&format=json&titles=${encodeURIComponent(group.join('|'))}`
    const j = await api(u)
    const norm = {}
    for (const n of j.query?.normalized ?? []) norm[n.from] = n.to
    for (const r of j.query?.redirects ?? []) norm[r.from] = r.to
    const byTitle = {}
    for (const p of Object.values(j.query?.pages ?? {})) {
      if (p.original?.source) byTitle[p.title] = p.original.source
    }
    for (const t of group) {
      let t0 = t
      for (let i = 0; i < 3; i++) t0 = norm[t0] ?? t0
      if (byTitle[t0]) out[t] = byTitle[t0]
    }
    await sleep(700)
  }
  return out
}

// الجهات التي لم يعطها ويكي بيانات شعاراً
const needy = rows.filter((r) => !r.logo)
console.log(`تحتاج مصدراً بديلاً: ${needy.length}`)

// ١) ويكيبيديا العربية
const arLead = await leadImages('ar.wikipedia.org', needy.map((r) => titles[r.id]))
let got = 0
for (const r of needy) {
  const src = arLead[titles[r.id]]
  if (src) { r.fallback = src; r.fallbackFrom = 'ar.wikipedia'; got++ }
}
console.log(`من ويكيبيديا العربية: ${got}`)

// ٢) ويكيبيديا الإنجليزية لمن بقي (تستضيف شعارات كثيرة محلياً)
const stillNeedy = needy.filter((r) => !r.fallback)
const enTitles = {
  mof: 'Ministry of Finance (Saudi Arabia)', mod: 'Ministry of Defense (Saudi Arabia)',
  moi: 'Ministry of Interior (Saudi Arabia)', mong: 'Ministry of National Guard (Saudi Arabia)',
  mot: 'Ministry of Transport and Logistic Services', 'moe-edu': 'Ministry of Education (Saudi Arabia)',
  mewa: 'Ministry of Environment, Water and Agriculture', moenergy: 'Ministry of Energy (Saudi Arabia)',
  haj: 'Ministry of Hajj and Umrah', moj: 'Ministry of Justice (Saudi Arabia)',
  mcit: 'Ministry of Communications and Information Technology (Saudi Arabia)',
  mep: 'Ministry of Economy and Planning (Saudi Arabia)', momrah: 'Ministry of Municipal and Rural Affairs and Housing',
  hrsd: 'Ministry of Human Resources and Social Development', moia: 'Ministry of Islamic Affairs (Saudi Arabia)',
  moc: 'Ministry of Culture (Saudi Arabia)', mim: 'Ministry of Industry and Mineral Resources',
  mt: 'Ministry of Tourism (Saudi Arabia)', film: 'Saudi Film Commission', music: 'Music Commission (Saudi Arabia)',
  culinary: 'Culinary Arts Commission', fashion: 'Fashion Commission', museums: 'Museums Commission',
  literature: 'Literature, Publishing and Translation Commission', theater: 'Theater and Performing Arts Commission',
  visualarts: 'Visual Arts Commission', architecture: 'Architecture and Design Commission', libraries: 'Libraries Commission',
  zatca: 'Zakat, Tax and Customs Authority', sfda: 'Saudi Food and Drug Authority',
  gaca: 'General Authority of Civil Aviation', monshaat: 'Monsha%27at', cma: 'Capital Market Authority (Saudi Arabia)',
  mawani: 'Saudi Ports Authority', splonline: 'Saudi Post', rcu: 'Royal Commission for AlUla',
  saip: 'Saudi Authority for Intellectual Property', gosi: 'General Organization for Social Insurance',
  hrdf: 'Human Resources Development Fund', tadawul: 'Saudi Exchange', neom: 'Neom', qiddiya: 'Qiddiya',
  redsea: 'Red Sea Global', roshn: 'Roshn', diriyah: 'Diriyah Company', maaden: 'Ma%27aden',
  saudia: 'Saudia', tawakkalna: 'Tawakkalna', alittihad: 'Ittihad Club', alahli: 'Al-Ahli Saudi FC',
}
const enList = stillNeedy.filter((r) => enTitles[r.id]).map((r) => decodeURIComponent(enTitles[r.id]))
const enLead = await leadImages('en.wikipedia.org', enList)
let got2 = 0
for (const r of stillNeedy) {
  const t = enTitles[r.id] && decodeURIComponent(enTitles[r.id])
  if (t && enLead[t]) { r.fallback = enLead[t]; r.fallbackFrom = 'en.wikipedia'; got2++ }
}
console.log(`من ويكيبيديا الإنجليزية: ${got2}`)

writeFileSync('scripts/logo-candidates.json', JSON.stringify(rows, null, 2))
const have = rows.filter((r) => r.logo || r.fallback)
console.log(`\nالإجمالي القابل للتحميل: ${have.length} من ${rows.length}`)
console.log('بلا مصدر:', rows.filter((r) => !r.logo && !r.fallback).map((r) => r.id).join(', ') || 'لا شيء')
