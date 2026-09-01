import { readFileSync, writeFileSync } from 'node:fs'

const l = JSON.parse(readFileSync('src/data/landmarks.json', 'utf8')).filter((x) => x.image)
const cards = l.map((x) => `
  <figure>
    <div class="box"><img src="/${x.image}" alt=""></div>
    <figcaption><b>${x.id}</b><br>${x.nameAr}<br><small>${x.category} · ${x.regionAr}</small></figcaption>
  </figure>`).join('')

writeFileSync('public/contact-sheet-landmarks.html', `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>مراجعة صور المعالم</title>
<style>
 @font-face{font-family:'Thmanyah Sans';src:url('/fonts/thmanyahsans-Regular.woff2') format('woff2');font-weight:400;font-display:swap}
 @font-face{font-family:'Thmanyah Sans';src:url('/fonts/thmanyahsans-Medium.woff2') format('woff2');font-weight:500;font-display:swap}
 @font-face{font-family:'Thmanyah Sans';src:url('/fonts/thmanyahsans-Bold.woff2') format('woff2');font-weight:700;font-display:swap}
 @font-face{font-family:'Thmanyah Serif Display';src:url('/fonts/thmanyahserifdisplay-Bold.woff2') format('woff2');font-weight:700;font-display:swap}
 
 body{background:#111;color:#eee;font-family:'Thmanyah Sans',system-ui,sans-serif;margin:0;padding:20px}
 h1{font-size:1.1rem}
 .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
 figure{margin:0;background:#1c1c1c;border:1px solid #333;border-radius:8px;padding:8px}
 .box{height:150px;display:grid;place-items:center;background:#000;border-radius:6px;overflow:hidden}
 .box img{width:100%;height:100%;object-fit:cover}
 figcaption{font-size:11px;line-height:1.4;margin-top:6px;color:#bbb}
 small{color:#777}
</style></head>
<body><h1>مراجعة صور المعالم (${l.length})</h1><div class="grid">${cards}</div></body></html>`)
console.log(`landmark contact sheet: ${l.length}`)
