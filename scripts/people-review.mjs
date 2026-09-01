// يولّد صفحة معاينة لصور الأشخاص، مرتّبة حسب الفئة، للمراجعة بالعين قبل الاعتماد.
import { readFileSync, writeFileSync } from 'node:fs'

const people = JSON.parse(readFileSync('src/data/people.json', 'utf8'))
const LABEL = {
  ministers: 'الوزراء', kings: 'الملوك', governors: 'أمراء المناطق',
  astronauts: 'رواد الفضاء', athletes: 'الرياضيون', artists: 'الفنانون',
  business: 'قادة الأعمال', historic: 'شخصيات تاريخية',
}
// وسائط اختيارية: مسار الخرج ثم الفئات المطلوبة — لمعاينة الجديد وحده
const OUT = process.argv[2] || 'public/people-review.html'
const ORDER = process.argv.length > 3 ? process.argv.slice(3) : Object.keys(LABEL)

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])

let body = ''
for (const g of ORDER) {
  const rows = people.filter((p) => p.group === g)
  if (!rows.length) continue
  const shot = rows.filter((p) => p.image).length
  body += `<h2>${LABEL[g]} <small>(${shot}/${rows.length} بصورة)</small></h2><div class=g>`
  for (const p of rows) {
    const box = p.image
      ? `<img src='/${p.image}'>`
      : `<div class=none>بلا صورة</div>`
    body += `<figure><div class=box>${box}</div><figcaption><b>${esc(p.nameAr)}</b><br><small>${esc(p.roleAr)}</small></figcaption></figure>`
  }
  body += '</div>'
}

const html = `<!doctype html><html lang=ar dir=rtl><head><meta charset=utf-8><title>مراجعة صور الشخصيات</title><style>
@font-face{font-family:'Thmanyah Sans';src:url('/fonts/thmanyahsans-Regular.woff2') format('woff2');font-weight:400;font-display:swap}
body{background:#0B1410;color:#F2F5F0;font-family:'Thmanyah Sans',system-ui;margin:0;padding:16px}
h1{font-size:1.2rem;margin:0 0 4px}
h2{font-size:.95rem;margin:22px 0 8px;color:#9FE0B8;border-bottom:1px solid #2A4034;padding-bottom:5px}
h2 small{color:#8FA398;font-weight:400}
.g{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}
figure{margin:0;background:#132019;border:1px solid #2A4034;padding:6px;border-radius:9px}
.box{position:relative;aspect-ratio:3/4;background:#000;border-radius:6px;overflow:hidden}
.box img{width:100%;height:100%;object-fit:cover;object-position:top center}
.none{display:flex;align-items:center;justify-content:center;height:100%;color:#5C7266;font-size:11px}
figcaption{font-size:10px;margin-top:6px;color:#cfd8d2;text-align:center;line-height:1.5}
small{color:#8FA398}</style></head>
<body><h1>مراجعة صور الشخصيات</h1>
${body}</body></html>`

writeFileSync(OUT, html)
console.log('كُتبت ' + OUT)
