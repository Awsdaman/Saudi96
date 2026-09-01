// ينسخ الشعارات الكاملة PNG إلى مجلد عمل خارج اللعبة، ليقصّها المستخدم بيده.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs'

const OUT = 'crop-me'
const DONE = `${OUT}/done`
for (const d of [OUT, DONE]) if (!existsSync(d)) mkdirSync(d, { recursive: true })

const entities = JSON.parse(readFileSync('src/data/entities.json', 'utf8'))
const rejected = JSON.parse(readFileSync('scripts/rejected.json', 'utf8'))

let copied = 0
const rows = []

for (const e of entities) {
  if (!e.lockup || rejected[e.id]) continue
  const src = `public/${e.lockup}`
  if (!existsSync(src)) continue

  // الاسم: المعرّف ثم شرطتان ثم الاسم العربي — الاستيراد يقرأ المعرّف قبل الشرطتين
  const safeName = e.nameAr.replace(/[\\/:*?"<>|]/g, '').trim()
  const dest = `${OUT}/${e.id}__${safeName}.png`
  copyFileSync(src, dest)
  rows.push(`${e.id}  —  ${e.nameAr}${e.logo ? '' : '   (ما فيه رمز مقصوص حالياً)'}`)
  copied++
}

writeFileSync(`${OUT}/اقرأني.txt`, `مجلد قصّ الشعارات
=================

الملفات هنا هي الشعارات الكاملة بصيغة PNG.

كيف تشتغل:
 ١) افتح أي ملف ببرنامج صور (الرسام، فوتوشوب، أي شيء).
 ٢) اقصّ الرمز وحده واحذف الكلام المكتوب.
 ٣) احفظ الناتج داخل مجلد "done" بنفس اسم الملف تماماً.
 ٤) شغّل في سطر الأوامر:  npm run import-crops

كل ملف تحفظه في done يحلّ محل الرمز الحالي في اللعبة.
الملفات هنا نسخ — الأصول محفوظة في public/assets/logos-source ولا تتأثر.

نصيحة: اترك خلفية شفافة إن قدرت، وخلِّ حول الرمز هامشاً بسيطاً.

الجهات (${rows.length}):
${rows.map((r) => '  · ' + r).join('\n')}
`)

console.log(`نُسخ ${copied} شعاراً إلى ${OUT}/`)
console.log(`اقصّها واحفظ الناتج في ${DONE}/ ثم: npm run import-crops`)
