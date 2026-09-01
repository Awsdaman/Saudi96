// يستوعب الشعارات التي نزّلها المستخدم بنفسه:
// يحوّلها إلى PNG، ويسمّيها بصيغة الاستيراد، ويثبّتها شعاراً كاملاً للجهة.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, copyFileSync } from 'node:fs'
import { extname, basename } from 'node:path'
import sharp from 'sharp'

const CROP = 'crop-me'
const LOGOS = 'public/assets/logos'
const SOURCE = 'public/assets/logos-source'
if (!existsSync(SOURCE)) mkdirSync(SOURCE, { recursive: true })

const entities = JSON.parse(readFileSync('src/data/entities.json', 'utf8'))
const rejected = JSON.parse(readFileSync('scripts/rejected.json', 'utf8'))

/** الاسم العربي في الملف ← معرّف الجهة */
const NAME_TO_ID = {
  'الهيئة السعودية للملكية الفكرية': 'saip',
  'الهيئة الملكية لمحافظة العلا': 'rcu',
  'هيئة الأدب والنشر والترجمة': 'literature',
  'هيئة السوق المالية': 'cma',
  'هيئة الغذاء والدواء': 'sfda',
  'هيئة المسرح والفنون الأدائية': 'theater',
  'هيئة فنون العمارة والتصميم': 'architecture',
  'هيئة الموسيقى': 'music',
  'وزارة الموارد البشرية والتنمية الاجتماعية': 'hrsd',
  'وزارة البلديات والإسكان': 'momrah',
  'وزارة البيئة والمياه والزراعة': 'mewa',
  'وزارة الحج والعمرة': 'haj',
  'وزارة الصناعة والثروة المعدنية': 'mim',
}

const MAX = 1200
let done = 0
const unmatched = []
const leftovers = []

for (const f of readdirSync(CROP)) {
  const ext = extname(f).toLowerCase()
  if (!['.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(ext)) continue
  const stem = basename(f, ext)
  if (stem.includes('__')) continue // ملفات المشروع نفسها

  const id = NAME_TO_ID[stem.trim()]
  if (!id) { unmatched.push(f); continue }

  const e = entities.find((x) => x.id === id)
  if (!e) { unmatched.push(`${f} (معرّف مجهول ${id})`); continue }

  const src = `${CROP}/${f}`
  try {
    // احفظ الأصل كما نزّله المستخدم
    const backup = `${SOURCE}/${id}${ext}`
    if (!existsSync(backup)) copyFileSync(src, backup)

    const buf = await sharp(src, { density: 600 })
      .resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer()

    // ١) الشعار الكامل داخل اللعبة
    writeFileSync(`${LOGOS}/${id}.png`, buf)
    e.lockup = `assets/logos/${id}.png`
    // شعار جديد يبطل أي رفض سابق
    if (rejected[id]) delete rejected[id]

    // ٢) نسخة للقصّ بالتسمية التي يفهمها الاستيراد
    const safe = e.nameAr.replace(/[\\/:*?"<>|]/g, '').trim()
    writeFileSync(`${CROP}/${id}__${safe}.png`, buf)
    // الحذف قد يفشل إن كان الملف مفتوحاً في برنامج آخر — والتحويل تمّ أصلاً،
    // فلا يصحّ أن يُفشل ذلك العملية كلها.
    try { unlinkSync(src) } catch { leftovers.push(f) }

    console.log(`✓ ${id.padEnd(13)} ${ext.padEnd(6)} → PNG  ${(buf.length / 1024).toFixed(0)} ك.ب  ${e.nameAr}`)
    done++
  } catch (err) {
    console.log(`✗ ${f} — ${err.message}`)
  }
}

writeFileSync('src/data/entities.json', JSON.stringify(entities, null, 2) + '\n')
writeFileSync('scripts/rejected.json', JSON.stringify(rejected, null, 2) + '\n')

console.log(`\nحُوِّل ${done} شعاراً`)
if (unmatched.length) console.log(`لم أعرف لأي جهة تعود: ${unmatched.join(', ')}`)
if (leftovers.length) console.log(`بقيت أصولها (كانت مفتوحة في برنامج آخر): ${leftovers.join(', ')}`)
