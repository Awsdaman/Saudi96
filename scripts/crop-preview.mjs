// صفحة مراجعة: الرمز المقصوص بجانب الشعار الأصلي، لكل جهة.
import { readFileSync, writeFileSync } from 'node:fs'

const entities = JSON.parse(readFileSync('src/data/entities.json', 'utf8')).filter((e) => e.lockup)
const cropped = entities.filter((e) => e.logo)
const whole = entities.filter((e) => !e.logo)

const card = (e) => `<figure>
  <div class=pair>
    <div class=box><img src="/${e.logo ?? e.lockup}"></div>
    <div class=box><img src="/${e.lockup}" class=dim></div>
  </div>
  <figcaption>${e.nameAr}</figcaption>
</figure>`

writeFileSync('public/crop-preview.html', `<!doctype html><html lang=ar dir=rtl><head><meta charset=utf-8><title>مراجعة الرموز</title>
<style>
 @font-face{font-family:'Thmanyah Sans';src:url('/fonts/thmanyahsans-Regular.woff2') format('woff2');font-weight:400;font-display:swap}
 @font-face{font-family:'Thmanyah Sans';src:url('/fonts/thmanyahsans-Medium.woff2') format('woff2');font-weight:500;font-display:swap}
 @font-face{font-family:'Thmanyah Sans';src:url('/fonts/thmanyahsans-Bold.woff2') format('woff2');font-weight:700;font-display:swap}
 @font-face{font-family:'Thmanyah Serif Display';src:url('/fonts/thmanyahserifdisplay-Bold.woff2') format('woff2');font-weight:700;font-display:swap}
 
 body{background:#0B1410;color:#F2F5F0;font-family:'Thmanyah Sans',system-ui,sans-serif;margin:0;padding:18px}
 h2{font-size:1.05rem;margin:22px 0 10px;color:#8FA398;font-weight:600}
 h1{font-size:1.3rem;margin:0 0 4px}
 p.lead{color:#8FA398;font-size:.9rem;margin:0 0 8px}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
 figure{margin:0;background:#132019;border:1px solid #2A4034;padding:7px;border-radius:10px}
 .pair{display:grid;grid-template-columns:1.35fr 1fr;gap:5px}
 .box{position:relative;aspect-ratio:1/1;background:#F7F7F4;border-radius:6px;overflow:hidden;display:grid;place-items:center}
 .box img{width:100%;height:100%;object-fit:contain;padding:8%;box-sizing:border-box}
 .dim{opacity:.55}
 figcaption{font-size:11px;margin-top:6px;color:#cfd8d2;text-align:center;line-height:1.4}
</style></head>
<body>
<h1>مراجعة الرموز بعد القصّ</h1>
<p class=lead>في كل بطاقة: <b>يمين</b> = ما سيظهر أثناء السؤال · <b>يسار</b> (باهت) = الشعار الأصلي الكامل الذي يظهر عند كشف الإجابة.</p>
<h2>رموز مقصوصة — ${cropped.length}</h2>
<div class=grid>${cropped.map(card).join('')}</div>
<h2>شعارات نصية تُعرض كاملةً (ما فيها رمز منفصل) — ${whole.length}</h2>
<div class=grid>${whole.map(card).join('')}</div>
</body></html>`)

console.log(`مراجعة: ${cropped.length} مقصوص · ${whole.length} كامل`)
