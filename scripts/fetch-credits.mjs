
// يجلب رخصة كل صورة ومؤلّفها من ويكيميديا ويكتبها في src/data/credits.json.
//
// الصور مأخوذة من كومنز وويكيبيديا، وأكثرها تحت CC-BY-SA التي تشترط
// نسبة العمل إلى صاحبه. ما دامت اللعبة تُفتح من القرص فالأمر بيننا،
// أما وقد صارت صفحةً عامة فالنسبة واجبة — ولم يكن في المخزون منها شيء.
//
// طلبٌ واحد لكل خمسين ملفاً: واجهة ميدياويكي تقبل titles مفصولة بـ«|»،
// فينزل العدد من ٢٧٠ طلباً إلى ستة. الطلبُ المفرد لكل ملف يستنزف الحصّة
// ويعود بـ429 فتبدو الملفات مفقودة وهي محجوبة (انظر README).
import fs from 'fs'
import path from 'path'

const MANIFESTS = ['assets.json', 'landmark-assets.json', 'people-assets.json']
const UA = 'SaudiKnowledge/1.0 (educational quiz; credits fetcher)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const strip = (v) => (v ? String(v).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : null)

/**
 * اسم الملف والويكي الذي يستضيفه، مستخرَجان من الرابط.
 * /wikipedia/commons/ يعني كومنز، و/wikipedia/ar/ يعني ملفاً مرفوعاً على
 * ويكيبيديا العربية نفسها — وهذه غالباً شعارات غير حرّة تُستعمل
 * بالاستشهاد العادل، لا صور تحت رخصة مشاع.
 */
function parseUrl(url) {
  if (!url) return null
  const m = url.split('?')[0].match(/\/wikipedia\/([a-z-]+)\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/)
  if (!m) return null
  const [, wiki, name] = m
  return {
    // ليس اسم الأصل عندنا: ذاك يبقى في file، وهذا اسمه على الويكي
    wikiFile: decodeURIComponent(name),
    host: wiki === 'commons' ? 'commons.wikimedia.org' : `${wiki}.wikipedia.org`,
    local: wiki !== 'commons',
  }
}

/** دفعةٌ واحدة: حتى خمسين ملفاً من ويكي واحد */
async function batch(host, files, attempt = 0) {
  const api = `https://${host}/w/api.php?action=query&format=json&prop=imageinfo` +
    `&iiprop=extmetadata|url&titles=${encodeURIComponent(files.map((f) => 'File:' + f).join('|'))}`
  const res = await fetch(api, { headers: { 'User-Agent': UA } })
  const body = await res.text()
  if (!res.ok || !body.startsWith('{')) {
    if (attempt >= 4) { console.warn(`\n  تعذّرت دفعة ${host} (${res.status}) بعد ${attempt} محاولات`); return {} }
    const wait = 20000 * (attempt + 1)
    console.warn(`\n  ${host}: ${res.status} — انتظار ${wait / 1000}ث ثم إعادة`)
    await sleep(wait)
    return batch(host, files, attempt + 1)
  }
  const j = JSON.parse(body)
  // العناوين تُطبَّع أحياناً (شرطة سفلية مقابل مسافة) فيُبنى جسرٌ بينها
  const norm = new Map((j?.query?.normalized ?? []).map((n) => [n.to, n.from]))
  const byFile = {}
  for (const p of Object.values(j?.query?.pages ?? {})) {
    const original = norm.get(p.title) ?? p.title
    const key = original.replace(/^File:/, '')
    const e = p?.imageinfo?.[0]?.extmetadata
    byFile[key] = e
      ? {
          license: strip(e.LicenseShortName?.value),
          licenseUrl: e.LicenseUrl?.value ?? null,
          author: strip(e.Artist?.value),
          credit: strip(e.Credit?.value),
          page: p.imageinfo[0].descriptionurl ?? null,
        }
      : { license: null, note: p.missing !== undefined ? 'الملف غير موجود على هذا الويكي' : 'لا بيانات رخصة' }
  }
  return byFile
}

// تُجمع الملفات حسب الويكي المستضيف
const rows = []
const seen = new Set()
for (const mf of MANIFESTS) {
  for (const o of JSON.parse(fs.readFileSync(path.join('src/data', mf), 'utf8'))) {
    if (!o.file || seen.has(o.file)) continue
    seen.add(o.file)
    rows.push({ file: o.file, nameAr: o.nameAr, sourceUrl: o.sourceUrl ?? null, ...(parseUrl(o.sourceUrl) ?? {}) })
  }
}

const byHost = new Map()
for (const r of rows) {
  if (!r.host) continue
  if (!byHost.has(r.host)) byHost.set(r.host, [])
  byHost.get(r.host).push(r)
}

for (const [host, list] of byHost) {
  for (let i = 0; i < list.length; i += 50) {
    const chunk = list.slice(i, i + 50)
    const got = await batch(host, chunk.map((c) => c.wikiFile))
    for (const c of chunk) Object.assign(c, got[c.wikiFile] ?? { license: null, note: 'لا ردّ' })
    process.stdout.write('.')
    await sleep(1500)
  }
}

// يُكتب المعروض وحده: الملف يُحزَم مع اللعبة، وsourceUrl لا تعرضه
// الصفحة ويزيدها وحده نحو ٥٠ كيلوبايت — وأصله باقٍ في *-assets.json
const out = rows.map((r) => ({
  file: r.file,
  nameAr: r.nameAr,
  license: r.license ?? null,
  licenseUrl: r.licenseUrl ?? null,
  author: r.author ?? null,
  page: r.page ?? null,
}))
fs.writeFileSync('src/data/credits.json', JSON.stringify(out) + '\n')

const withLic = out.filter((o) => o.license)
console.log('\nمكتوب: src/data/credits.json ·', out.length, 'صورة')
console.log('برخصة معروفة:', withLic.length, '· بلا رخصة:', out.length - withLic.length)
const tally = {}
for (const o of withLic) tally[o.license] = (tally[o.license] ?? 0) + 1
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log('  ', v, k)
