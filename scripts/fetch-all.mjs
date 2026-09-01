// ينتظر رفع الحدّ من ويكيميديا ثم يجلب ما تبقّى من شعارات وصور المعالم.
// يُشغَّل بـ: npm run fetch
import { execSync } from 'node:child_process'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const UA = { 'User-Agent': 'SaudiKnowledge/0.1 (local personal quiz game)' }
const probe = 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Saudi_aramco_logo.svg'

const WAIT_MINUTES = 90

async function cdnReady() {
  try {
    const res = await fetch(probe, { headers: UA })
    return res.ok
  } catch {
    return false
  }
}

let ready = await cdnReady()
for (let i = 1; !ready && i <= WAIT_MINUTES; i++) {
  console.log(`[${new Date().toLocaleTimeString('en-GB')}] شبكة ويكيميديا ما زالت تحدّ الطلبات — محاولة ${i}/${WAIT_MINUTES}`)
  await sleep(60000)
  ready = await cdnReady()
}

if (!ready) {
  console.log('لم يُرفع الحدّ خلال المهلة. أعد التشغيل لاحقاً: npm run fetch')
  process.exit(1)
}

console.log('الشبكة متاحة — يبدأ الجلب\n')
for (const step of ['fetch-assets', 'link-logos', 'fetch-landmarks', 'fetch-people', 'contact-sheet', 'people-review', 'validate-content']) {
  console.log(`\n── ${step} ──`)
  try {
    execSync(`node scripts/${step}.mjs`, { stdio: 'inherit' })
  } catch {
    console.log(`(${step} انتهى بأخطاء — راجع أعلاه)`)
  }
}
