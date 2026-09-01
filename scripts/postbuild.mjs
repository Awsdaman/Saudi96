import { readFileSync, writeFileSync } from 'node:fs'

// وحدات ES لا تعمل عبر file://، والحزمة صارت IIFE — فتُزال سمات الوحدات.
// مهم: وحدات ES مؤجَّلة تلقائياً، أما السكربت العادي فلا؛ وبما أن الوسم في <head>
// فلا بد من defer وإلا نُفِّذ قبل وجود <div id="root"> وتعطّلت الصفحة.
const p = 'dist/index.html'
const before = readFileSync(p, 'utf8')

const after = before
  .replace(/\s*type="module"/g, '')
  .replace(/\s*crossorigin/g, '')
  .replace(/<script(?![^>]*\bdefer\b)([^>]*\bsrc=)/g, '<script defer$1')

writeFileSync(p, after)

const tag = after.match(/<script[^>]*>/)?.[0] ?? ''
console.log(tag)
if (!/\bdefer\b/.test(tag)) {
  console.error('خطأ: الوسم بلا defer — ستُنفَّذ الحزمة قبل بناء الصفحة')
  process.exit(1)
}
console.log('جاهز للفتح من القرص مباشرة')
