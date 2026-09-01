import { readFileSync, writeFileSync } from 'node:fs'

const assets = JSON.parse(readFileSync('src/data/assets.json', 'utf8'))
const cards = assets.map((a) => `
  <figure>
    <div class="box"><img src="/${a.file}" alt=""></div>
    <figcaption><b>${a.id}</b><br>${a.nameAr}<br><small>${a.source}</small></figcaption>
  </figure>`).join('')

writeFileSync('public/contact-sheet.html', `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>مراجعة الشعارات</title>
<style>
 @font-face{font-family:'Thmanyah Sans';src:url('/fonts/thmanyahsans-Regular.woff2') format('woff2');font-weight:400;font-display:swap}
 @font-face{font-family:'Thmanyah Sans';src:url('/fonts/thmanyahsans-Medium.woff2') format('woff2');font-weight:500;font-display:swap}
 @font-face{font-family:'Thmanyah Sans';src:url('/fonts/thmanyahsans-Bold.woff2') format('woff2');font-weight:700;font-display:swap}
 @font-face{font-family:'Thmanyah Serif Display';src:url('/fonts/thmanyahserifdisplay-Bold.woff2') format('woff2');font-weight:700;font-display:swap}
 
 body{background:#111;color:#eee;font-family:'Thmanyah Sans',system-ui,sans-serif;margin:0;padding:20px}
 h1{font-size:1.1rem}
 .grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
 figure{margin:0;background:#1c1c1c;border:1px solid #333;border-radius:8px;padding:8px}
 .box{height:90px;display:grid;place-items:center;background:#fff;border-radius:6px;overflow:hidden}
 .box img{max-width:100%;max-height:100%;object-fit:contain}
 figcaption{font-size:10px;line-height:1.4;margin-top:6px;color:#bbb}
 small{color:#777}
</style></head>
<body><h1>مراجعة الشعارات المُنزَّلة (${assets.length})</h1><div class="grid">${cards}</div></body></html>`)
console.log(`contact sheet: ${assets.length} صورة`)
