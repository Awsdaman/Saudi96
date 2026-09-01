import { readFileSync, writeFileSync } from 'node:fs'

const assets = JSON.parse(readFileSync('src/data/assets.json', 'utf8'))
// حارس: شعارات جرت معاينتها ورُفضت. بدونه يستطيع تشغيلٌ قديم للجلب
// أن يعيدها إلى السجل فتظهر مراجعُ مكسورة لملفات محذوفة.
const rejected = JSON.parse(readFileSync('scripts/rejected.json', 'utf8'))
const entities = JSON.parse(readFileSync('src/data/entities.json', 'utf8'))
const byId = Object.fromEntries(assets.map((a) => [a.id, a]))

let linked = 0
for (const e of entities) {
  const a = rejected[e.id] ? null : byId[e.id]
  if (!a) {
    // السجل هو المصدر الوحيد للحقيقة — أي شعار حُذف أو رُفض يُمسح أثره هنا
    delete e.lockup
    continue
  }
  // ما نُزّل هو الشعار الكامل مع الاسم المكتوب، لا الرمز وحده.
  // لذا يوضع في lockup — فتستخدمه اللعبة بآلية الضبابية التي تُخفي الاسم،
  // لا بآلية الظل التي تكشفه. الرمز المجرّد يحتاج ملفات الهوية الرسمية.
  e.lockup = a.file
  linked++
}

writeFileSync('src/data/entities.json', JSON.stringify(entities, null, 2) + '\n')
console.log(`رُبِط ${linked} شعاراً بالجهات`)
console.log(`جهات بلا شعار: ${entities.filter((e) => !e.lockup && !e.logo).length}`)
