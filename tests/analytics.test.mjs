import test from 'node:test'
import assert from 'node:assert/strict'
import { GET, POST, riyadhDay, setStorageForTests } from '../api/events.ts'
import { createFakeRedis } from '../scripts/fake-redis.mjs'
import { AUTO_REFRESH_MS, STALE_ON_RETURN_MS, shouldRefreshOnReturn } from '../src/admin/refresh.ts'

const V1 = 'visitor-aaaaaaaa'
const V2 = 'visitor-bbbbbbbb'

function fresh() {
  const redis = createFakeRedis()
  setStorageForTests(redis.exec)
  return redis
}
const post = (body) => POST(new Request('http://x/api/events', {
  method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body),
}))
const get = (password, ip = '1.2.3.4') => GET(new Request('http://x/api/events', {
  headers: { ...(password === undefined ? {} : { 'x-admin-password': password }), 'x-forwarded-for': ip },
}))

test('visits count every page load but unique visitors once each', async () => {
  const redis = fresh()
  for (const v of [V1, V1, V2]) assert.equal((await post({ type: 'visit', visitor: v })).status, 204)
  assert.equal(redis.strings.get('sk:visits'), '3')
  assert.equal(redis.sets.get('sk:dev').size, 2)
})

test('host-revealed answers are counted apart and never touch accuracy', async () => {
  const redis = fresh()
  assert.equal((await post({ type: 'round_end', visitor: V1, round: 'trivia', completed: true, answers: [
    { q: 'geo_001', c: true, r: 'trivia', h: true },
    { q: 'geo_002', c: false, r: 'trivia' },
  ] })).status, 204)
  const h = (k) => Object.fromEntries(redis.hashes.get(k) ?? [])
  assert.deepEqual(h('sk:revealed'), { trivia: '1' })
  assert.deepEqual(h('sk:answered'), { trivia: '1' })
  assert.deepEqual(h('sk:right'), {})
  assert.deepEqual(h('sk:q:seen'), { geo_002: '1' })
  assert.equal((await post({ type: 'round_end', visitor: V1, round: 'trivia', completed: true, answers: [
    { q: 'geo_001', c: true, r: 'trivia', h: 'yes' },
  ] })).status, 400)
})

test('malformed or hostile events are rejected and never written', async () => {
  const redis = fresh()
  const bad = [
    'not json',
    { type: 'visit' },
    { type: 'visit', visitor: 'short' },
    { type: 'visit', visitor: 'has spaces in it!!' },
    { type: 'hack', visitor: V1 },
    { type: 'round_start', visitor: V1, round: 'admin', teams: false, audience: false, count: 5 },
    { type: 'round_start', visitor: V1, round: 'trivia', mode: 'insane', teams: false, audience: false, count: 5 },
    { type: 'round_start', visitor: V1, round: 'trivia', teams: 'yes', audience: false, count: 5 },
    { type: 'round_start', visitor: V1, round: 'trivia', teams: false, audience: false, count: 99999 },
    { type: 'round_end', visitor: V1, round: 'trivia', completed: true, answers: [{ q: 'x; DROP', c: true, r: 'trivia' }] },
    { type: 'round_end', visitor: V1, round: 'trivia', completed: true, answers: [{ q: 'geo_001', c: 1, r: 'trivia' }] },
    { type: 'round_end', visitor: V1, round: 'trivia', completed: true, answers: Array(501).fill({ q: 'geo_001', c: true, r: 'trivia' }) },
  ]
  for (const b of bad) assert.equal((await post(b)).status, 400, JSON.stringify(b).slice(0, 80))
  assert.equal((await post('x'.repeat(40_000))).status, 413)
  assert.equal(redis.strings.size + redis.hashes.size + redis.sets.size, 0)
})

test('round events aggregate plays, modes, and per-category accuracy by the question own round', async () => {
  const redis = fresh()
  await post({ type: 'round_start', visitor: V1, round: 'custom', mode: 'hard', teams: true, audience: true, count: 4 })
  await post({ type: 'round_start', visitor: V1, round: 'songs', teams: false, audience: false, count: 6 })
  await post({
    type: 'round_end', visitor: V1, round: 'custom', completed: true,
    answers: [
      { q: 'geo_001', c: true, r: 'trivia' },
      { q: 'geo_001', c: false, r: 'trivia' },
      { q: 'lmk_haram', c: false, r: 'landmarks' },
      { q: 'who_x', c: true, r: 'people' },
    ],
  })
  await post({ type: 'round_end', visitor: V1, round: 'songs', completed: false, answers: [{ q: 'song_s1', c: true, r: 'songs' }] })

  const h = (k) => Object.fromEntries(redis.hashes.get(k) ?? [])
  assert.deepEqual(h('sk:started'), { custom: '1', songs: '1' })
  assert.deepEqual(h('sk:completed'), { custom: '1' })
  assert.deepEqual(h('sk:modes'), { hard: '1' })
  assert.deepEqual(h('sk:play'), { teams: '1', audience: '1', solo: '1' })
  assert.deepEqual(h('sk:length'), { sum: '10', n: '2' })
  assert.deepEqual(h('sk:answered'), { trivia: '1', landmarks: '1', people: '1', songs: '1' })
  assert.deepEqual(h('sk:right'), { trivia: '1', people: '1', songs: '1' })
  assert.deepEqual(h('sk:q:wrong'), { lmk_haram: '1' })
})

test('stats need the configured password and lock out brute force', async () => {
  fresh()
  const saved = process.env.ADMIN_PASSWORD
  delete process.env.ADMIN_PASSWORD
  assert.equal((await get('anything')).status, 503)
  process.env.ADMIN_PASSWORD = 'correct horse'
  try {
    assert.equal((await get(undefined)).status, 401)
    assert.equal((await get('wrong')).status, 401)
    assert.equal((await get('correct horse')).status, 200)
    for (let i = 0; i < 9; i++) await get('wrong', '9.9.9.9')
    assert.equal((await get('wrong', '9.9.9.9')).status, 401, 'the 10th failure is still just a failure')
    assert.equal((await get('correct horse', '9.9.9.9')).status, 429)
    assert.equal((await get('correct horse', '5.5.5.5')).status, 200)
  } finally {
    if (saved === undefined) delete process.env.ADMIN_PASSWORD
    else process.env.ADMIN_PASSWORD = saved
  }
})

test('stats report totals, 30 days ending today, rounds, and hardest questions', async () => {
  const redis = fresh()
  process.env.ADMIN_PASSWORD = 'pw'
  let commands = 0
  const inner = redis.exec
  setStorageForTests(async (cmds) => { commands += cmds.length; return inner(cmds) })
  // بيانات النظام التقديري السابق (قبل العدّ الدقيق) تبقى محسوبة
  redis.sets.set('sk:visitors', new Set(['old-1', 'old-2', 'old-3']))
  redis.sets.set(`sk:visitors:${riyadhDay(Date.now())}`, new Set(['old-1']))
  try {
    await post({ type: 'visit', visitor: V1 })
    await post({ type: 'visit', visitor: V2 })
    await post({ type: 'round_start', visitor: V1, round: 'trivia', mode: 'easy', teams: false, audience: false, count: 10 })
    for (let i = 0; i < 4; i++) {
      await post({ type: 'round_end', visitor: V1, round: 'trivia', completed: true, answers: [
        { q: 'hard_q', c: i === 0, r: 'trivia' }, { q: 'easy_q', c: true, r: 'trivia' }, { q: 'rare_q', c: false, r: 'trivia' },
      ].slice(0, i < 2 ? 3 : 2) })
    }
    commands = 0
    const res = await get('pw')
    // لوحةٌ واحدة تُحدَّث لا تستنزف الحصّة: أقلّ من 80 أمراً للتحديث كلّه
    assert.ok(commands < 80, `a dashboard refresh costs ${commands} commands`)
    assert.equal(res.headers.get('cache-control'), 'no-store')
    const s = await res.json()
    assert.deepEqual(s.totals, { visitors: 5, visits: 2, roundsStarted: 1, roundsCompleted: 4 })
    assert.equal(s.days.length, 30)
    assert.equal(s.days.at(-1).date, riyadhDay(Date.now()))
    assert.deepEqual(s.days.at(-1), { date: riyadhDay(Date.now()), visitors: 3, visits: 2, rounds: 1 })
    assert.deepEqual(s.days.at(-2), { date: riyadhDay(Date.now(), 1), visitors: 0, visits: 0, rounds: 0 })
    assert.deepEqual(s.modes, { easy: 1 })
    assert.equal(s.avgLength, 10)
    // rare_q seen only twice — under the ranking threshold
    assert.deepEqual(s.questions.map((q) => q.id), ['hard_q', 'easy_q'])
    assert.deepEqual(s.questions[0], { id: 'hard_q', seen: 4, wrong: 3 })
    assert.equal(s.questionsTracked, 3)
  } finally {
    delete process.env.ADMIN_PASSWORD
  }
})

test('dashboard refresh timing: fresh on return, cheap when left open', () => {
  const t0 = Date.parse('2026-09-24T12:00:00Z')
  assert.equal(shouldRefreshOnReturn(t0, t0 + 60_000), false, 'glancing away for a minute costs nothing')
  assert.equal(shouldRefreshOnReturn(t0, t0 + STALE_ON_RETURN_MS + 1), true)
  assert.equal(shouldRefreshOnReturn(0, t0), true, 'never loaded counts as stale')
  // أسوأ حال: مفتوحة ظاهرةً ٢٤ ساعة كل يوم شهراً كاملاً، بأقلّ من 80 أمراً للتحديث
  const perMonth = (30 * 24 * 3600_000 / AUTO_REFRESH_MS) * 80
  assert.ok(perMonth <= 0.15 * 500_000, `left open it would use ${perMonth} of 500k free commands a month`)
})

test('the Riyadh day rolls over at 21:00 UTC', () => {
  assert.equal(riyadhDay(Date.parse('2026-09-24T20:59:00Z')), '2026-09-24')
  assert.equal(riyadhDay(Date.parse('2026-09-24T21:00:00Z')), '2026-09-25')
})

test('player feedback is cleaned, capped, rate-limited, and stored without who sent it', async () => {
  const redis = fresh()
  const fb = (text, visitor = V1, ip = '1.2.3.4') => POST(new Request('http://x/api/events', {
    method: 'POST', headers: { 'x-forwarded-for': ip }, body: JSON.stringify({ type: 'feedback', visitor, text }),
  }))
  assert.equal((await fb('  أضيفوا تصنيف الأمثال الشعبية\r\n\r\n\r\n\r\nشكراً\u0007  ')).status, 204)
  const stored = redis.lists.get('sk:feedback').map((x) => JSON.parse(x))
  assert.equal(stored.length, 1)
  assert.equal(stored[0].text, 'أضيفوا تصنيف الأمثال الشعبية\n\nشكراً')
  assert.deepEqual(Object.keys(stored[0]).sort(), ['at', 'text'], 'no visitor id or address is kept')
  assert.ok(!JSON.stringify([...redis.strings.keys()]).includes(V1), 'rate-limit keys are hashed')

  for (const bad of ['', '  ', 'ab', 'x'.repeat(1001), 42, null]) assert.equal((await fb(bad)).status, 400)
  assert.equal((await fb('ok text', 'short')).status, 400)

  // 5 في الساعة لكل جهاز، ولكل عنوان حتى لو تبدّل المعرّف
  for (let i = 0; i < 4; i++) assert.equal((await fb(`idea ${i}`)).status, 204)
  assert.equal((await fb('one too many')).status, 429)
  assert.equal((await fb('new device, same address', V2)).status, 429)
  assert.equal((await fb('another place', V2, '8.8.8.8')).status, 204)
  assert.equal(redis.lists.get('sk:feedback').length, 6)
})

test('the admin dashboard lists feedback newest first, and only with the password', async () => {
  const redis = fresh()
  process.env.ADMIN_PASSWORD = 'pw'
  try {
    for (const [i, text] of ['first idea', 'second idea'].entries()) {
      await POST(new Request('http://x/api/events', {
        method: 'POST', headers: { 'x-forwarded-for': `7.7.7.${i}` }, body: JSON.stringify({ type: 'feedback', visitor: V1 + i, text }),
      }))
    }
    redis.lists.get('sk:feedback').push('not json')
    assert.equal((await get('nope')).status, 401)
    const s = await (await get('pw')).json()
    assert.deepEqual(s.feedback.map((f) => f.text), ['second idea', 'first idea'])
    assert.equal(s.feedbackTotal, 3)
  } finally {
    delete process.env.ADMIN_PASSWORD
  }
})

test('the admin page lives at /swa, and /admin no longer serves it', async () => {
  const { readFile } = await import('node:fs/promises')
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  const sources = [...config.rewrites, ...config.headers].map((r) => r.source)
  assert.deepEqual(sources, ['/swa', '/swa'])
  const headers = Object.fromEntries(config.headers[0].headers.map((h) => [h.key, h.value]))
  assert.equal(headers['X-Robots-Tag'], 'noindex, nofollow')
  assert.equal(headers['Cache-Control'], 'no-store')
  const hostSync = await readFile(new URL('../src/game/hostSync.ts', import.meta.url), 'utf8')
  assert.match(hostSync, /ADMIN_PATH = '\/swa'/)
  assert.doesNotMatch(hostSync, /=== '\/admin'/)
})
