// يطبع أول سطر من مقالة ويكيبيديا للتحقق من هوية الشخص ومنصبه
import { readFileSync } from 'node:fs'
const UA = 'SaudiKnowledge/0.1 (local personal quiz game)'
const lang = process.argv[3] || 'ar'
const titles = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
for (const [id, title] of Object.entries(titles)) {
  const u = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(title)}`
  let txt = ''
  try {
    const j = await (await fetch(u, { headers: { 'User-Agent': UA } })).json()
    const p = Object.values(j.query?.pages ?? {})[0]
    txt = ('missing' in (p ?? {})) ? '**NOPAGE**' : (p.extract || '(no extract)').replace(/\s+/g, ' ').slice(0, 230)
  } catch (e) { txt = '!! ' + e.message }
  console.log(`\n[${id}] ${title}\n  ${txt}`)
  await sleep(900)
}
