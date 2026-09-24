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
