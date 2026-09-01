// يقصّ كل شعار إلى «الرمز وحده» ويحفظه ملفاً مستقلاً.
// الأصول تبقى كما هي في assets/logos (تُعرض عند كشف الإجابة)،
// والرموز المقصوصة في assets/logos-symbol (تُعرض أثناء السؤال).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import sharp from 'sharp'

const SIZE = 1024 // فضاء الإحداثيات: مربّع تُحتوى فيه الصورة كاملةً
const OUT = 'public/assets/logos-symbol'
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const entities = JSON.parse(readFileSync('src/data/entities.json', 'utf8'))
const crops = JSON.parse(readFileSync('scripts/crops.json', 'utf8'))
const rejected = JSON.parse(readFileSync('scripts/rejected.json', 'utf8'))
// رموز عدّلها المستخدم بيده — لا يُكتب عليها
const manual = JSON.parse(readFileSync('scripts/manual-symbols.json', 'utf8'))

let made = 0, skipped = 0, failed = 0, manualKept = 0

for (const e of entities) {
  const original = e.lockup
  if (!original || rejected[e.id]) continue
  if (manual[e.id] && !e.id.startsWith('_')) { manualKept++; continue }

  const c = crops[e.id]
  if (!c) { skipped++; continue }

  const src = `public/${original}`
  const dest = `${OUT}/${e.id}.png`

  try {
    // ١) ارسم الشعار داخل مربّع بنسبته الأصلية — نفس فضاء حساب الإحداثيات
    const square = await sharp(src, { density: 600 })
      .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    // ٢) اقتطع المستطيل المطلوب، مع الحرص على البقاء داخل الحدود
    const left = Math.max(0, Math.round(c.x * SIZE))
    const top = Math.max(0, Math.round(c.y * SIZE))
    const width = Math.min(SIZE - left, Math.round(c.w * SIZE))
    const height = Math.min(SIZE - top, Math.round(c.h * SIZE))
    if (width < 8 || height < 8) throw new Error('قصّة صغيرة جداً')

    await sharp(square).extract({ left, top, width, height }).png({ compressionLevel: 9 }).toFile(dest)
    made++
  } catch (err) {
    console.log(`✗ ${e.id.padEnd(13)} ${err.message}`)
    failed++
  }
}

// اربط الملفات: logo = الرمز المقصوص · lockup = الشعار الكامل الأصلي
for (const e of entities) {
  const p = `${OUT}/${e.id}.png`
  if (existsSync(p)) e.logo = `assets/logos-symbol/${e.id}.png`
  else delete e.logo
}
writeFileSync('src/data/entities.json', JSON.stringify(entities, null, 2) + '\n')

console.log(`\nرموز مقصوصة ${made} · بلا قصّ (شعارات نصية) ${skipped} · فشل ${failed}`)
