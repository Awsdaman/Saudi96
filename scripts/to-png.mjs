// يحوّل الشعارات إلى PNG قابلة للتحرير بأي برنامج صور، ويحفظ الأصول كما نُزّلت.
//   assets/logos-source  ← الأصول كما نُزّلت (svg/png/jpg) — نسخة احتياطية لا تُمسّ
//   assets/logos         ← الشعار الكامل PNG  (يظهر عند كشف الإجابة)
//   assets/logos-symbol  ← الرمز المقصوص PNG  (يظهر أثناء السؤال)
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, unlinkSync } from 'node:fs'
import { extname } from 'node:path'
import sharp from 'sharp'

const LOGOS = 'public/assets/logos'
const SOURCE = 'public/assets/logos-source'
const MAX = 1200 // بُعد أقصى — يكفي للتحرير ويبقي الحجم معقولاً

if (!existsSync(SOURCE)) mkdirSync(SOURCE, { recursive: true })

const entities = JSON.parse(readFileSync('src/data/entities.json', 'utf8'))
const rejected = JSON.parse(readFileSync('scripts/rejected.json', 'utf8'))

let converted = 0, kept = 0, failed = 0

for (const e of entities) {
  if (!e.lockup || rejected[e.id]) continue

  const current = `public/${e.lockup}`
  if (!existsSync(current)) continue
  const ext = extname(current).toLowerCase()

  // ١) احفظ الأصل مرة واحدة
  const backup = `${SOURCE}/${e.id}${ext}`
  if (!existsSync(backup)) copyFileSync(current, backup)

  if (ext === '.png') { kept++; continue }

  // ٢) حوّل إلى PNG بخلفية شفافة
  try {
    const buf = await sharp(current, { density: 600 })
      .resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer()
    writeFileSync(`${LOGOS}/${e.id}.png`, buf)
    unlinkSync(current)
    e.lockup = `assets/logos/${e.id}.png`
    converted++
  } catch (err) {
    console.log(`✗ ${e.id.padEnd(13)} ${err.message}`)
    failed++
  }
}

writeFileSync('src/data/entities.json', JSON.stringify(entities, null, 2) + '\n')

// حدّث السجل ليطابق المسارات الجديدة
const manifest = JSON.parse(readFileSync('src/data/assets.json', 'utf8'))
for (const m of manifest) {
  const e = entities.find((x) => x.id === m.id)
  if (e?.lockup) m.file = e.lockup
}
writeFileSync('src/data/assets.json', JSON.stringify(manifest, null, 2) + '\n')

const stray = readdirSync(LOGOS).filter((f) => extname(f).toLowerCase() !== '.png')
console.log(`حُوِّل ${converted} · كان PNG ${kept} · فشل ${failed}`)
console.log(stray.length ? `ملفات غير PNG متبقية: ${stray.join(', ')}` : 'كل الشعارات صارت PNG')
