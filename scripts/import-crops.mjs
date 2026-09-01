// يستورد الرموز التي قصّها المستخدم من crop-me/done إلى اللعبة،
// ويسجّلها في manual-symbols.json حتى لا يكتب عليها التوليد الآلي.
import { readFileSync, writeFileSync, existsSync, readdirSync, copyFileSync, statSync } from 'node:fs'
import { extname } from 'node:path'

const DONE = 'crop-me/done'
const SYMBOLS = 'public/assets/logos-symbol'

if (!existsSync(DONE)) {
  console.log('لا يوجد مجلد crop-me/done — شغّل أولاً: npm run export-crops')
  process.exit(0)
}

const entities = JSON.parse(readFileSync('src/data/entities.json', 'utf8'))
const manual = JSON.parse(readFileSync('scripts/manual-symbols.json', 'utf8'))
const byId = Object.fromEntries(entities.map((e) => [e.id, e]))

const files = readdirSync(DONE).filter((f) => ['.png', '.jpg', '.jpeg', '.webp'].includes(extname(f).toLowerCase()))
let imported = 0
const unknown = []

for (const f of files) {
  const id = f.split('__')[0].replace(extname(f), '').trim()
  const e = byId[id]
  if (!e) { unknown.push(f); continue }

  copyFileSync(`${DONE}/${f}`, `${SYMBOLS}/${id}.png`)
  e.logo = `assets/logos-symbol/${id}.png`
  manual[id] = 'مقصوص يدوياً'
  console.log(`✓ ${id.padEnd(13)} ${(statSync(`${DONE}/${f}`).size / 1024).toFixed(0)} ك.ب  ${e.nameAr}`)
  imported++
}

writeFileSync('src/data/entities.json', JSON.stringify(entities, null, 2) + '\n')
writeFileSync('scripts/manual-symbols.json', JSON.stringify(manual, null, 2) + '\n')

console.log(`\nاستُورد ${imported} رمزاً`)
if (unknown.length) console.log(`أسماء غير معروفة (تجاهلتها): ${unknown.join(', ')}`)
if (imported) console.log('راجعها في: npm run dev ثم /crop-preview.html')
