import test from 'node:test'
import assert from 'node:assert/strict'
import { gameReducer, initialState } from '../src/game/gameReducer.ts'
import { buildRound, buildMixedRound, scoreSong } from '../src/game/engine.ts'
import { validateSongs } from '../scripts/validate-songs.mjs'
import { validateSelection } from '../scripts/song-library.mjs'

const song = (id) => ({
  kind: 'song', id, round: 'songs', prompt: 'ما اسم هذه الأغنية؟',
  song: { id, titleAr: 'أغنية اختبار', artistAr: '', sourceFile: 'test.mp3', status: 'ready', duration: 90,
    famousStart: 30, famousEnd: 45, clips: { intro3: 'assets/songs/test-1.mp3', intro8: 'assets/songs/test-2.mp3', famous: 'assets/songs/test-3.mp3' } },
})
const choice = { id: 'choice', round: 'trivia', prompt: 'اختبار', options: ['صحيح', 'خطأ'], answerIndex: 0, difficulty: 2 }
const start = (pool = [song('one')], roundId = 'songs') => gameReducer(initialState, { type: 'start', roundId, title: 'اختبار', pool, count: pool.length })
const act = (state, type, extra = {}) => gameReducer(state, { type, questionId: state.questions[state.index].id, songPhase: state.songPhase, ...extra })
const hear = (state) => act(state, 'song-heard')
const solve = (state, correct = true) => act(act(hear(state), 'song-reveal'), 'song-judge', { correct })

test('short mixed rounds cannot crowd songs out with a much larger question bank', () => {
  const pool = [song('one'), song('two'), ...Array.from({ length: 300 }, (_, i) => ({ ...choice, id: `q${i}` }))]
  for (let i = 0; i < 30; i++) {
    const round = buildMixedRound(pool, 5)
    assert.equal(round.length, 5)
    assert.equal(round.filter((q) => q.kind === 'song').length, 2)
    assert.equal(new Set(round.map((q) => q.id)).size, 5)
  }
})

test('mixed selection balances individual selected sources and handles short or exhausted pools', () => {
  const pool = Array.from({ length: 3 }, (_, group) => Array.from({ length: 20 }, (_, i) => ({
    ...choice, id: `${group}-${i}`, selectionSource: `cat:${group}`,
  }))).flat()
  const round = buildMixedRound(pool, 9)
  for (let group = 0; group < 3; group++) assert.equal(round.filter((q) => q.selectionSource === `cat:${group}`).length, 3)
  assert.equal(buildMixedRound(pool, 1).length, 1)
  assert.equal(buildMixedRound(pool, 100).length, 60)
  assert.deepEqual(buildMixedRound([], 10), [])
})

test('three phases stay on the same question and only the final give-up scores a miss', () => {
  let s = start()
  for (let phase = 1; phase <= 3; phase++) {
    assert.equal(s.songPhase, phase)
    assert.equal(s.index, 0)
    assert.equal(s.records.length, 0)
    s = act(hear(s), 'song-clue')
  }
  assert.equal(s.records.length, 1)
  assert.equal(s.resolved, true)
  assert.equal(s.songRevealed, true)
  assert.equal(s.score, 0)
  assert.equal(act(s, 'next').phase, 'results')
})

test('song points drop by phase (300 / 150 / 50) and ignore the streak', () => {
  const expected = { 1: 300, 2: 150, 3: 50 }
  for (let phase = 1; phase <= 3; phase++) {
    assert.equal(scoreSong(phase), expected[phase])
    let s = { ...start(), streak: 3 }
    while (s.songPhase < phase) s = act(hear(s), 'song-clue')
    assert.equal(s.streak, 3)
    s = solve(s)
    assert.equal(s.score, expected[phase])
    assert.equal(s.records[0].points, expected[phase])
    assert.equal(s.streak, 4)
    assert.equal(s.records[0].songPhase, phase)
  }
})

test('reveal locks the song; repeated judgments and phase events do not award twice', () => {
  let s = start()
  assert.equal(act(s, 'song-judge', { correct: true }), s)
  assert.equal(act(s, 'song-reveal'), s)
  assert.equal(act(s, 'next'), s)
  s = act(hear(s), 'song-reveal')
  assert.equal(act(s, 'song-clue'), s)
  s = act(s, 'song-judge', { correct: true })
  assert.equal(act(s, 'song-judge', { correct: true }), s)
  assert.equal(act(s, 'song-clue'), s)
  assert.equal(s.records.length, 1)
})

test('stale clue and next events cannot skip a phase or the next question', () => {
  let s = start([song('one'), song('two')])
  const id = s.questions[0].id
  s = act(hear(s), 'song-clue')
  const staleClue = { type: 'song-clue', questionId: id, songPhase: 1 }
  assert.equal(gameReducer(hear(s), staleClue).songPhase, 2)
  s = act(solve(s), 'next')
  assert.equal(s.songPhase, 1)
  assert.equal(s.songHeard, false)
  assert.equal(gameReducer(s, { type: 'next', questionId: id }), s)
})

test('wrong self-check resets the streak; unavailable audio preserves it', () => {
  const s = { ...start(), streak: 4, score: 900, bestStreak: 4 }
  assert.equal(solve(s, false).streak, 0)
  const skipped = act(s, 'song-unavailable')
  assert.equal(skipped.streak, 4)
  assert.equal(skipped.score, 900)
  assert.equal(skipped.records[0].unavailable, true)
})

test('host judgments: a spoken miss picks no option, a one-screen reveal is flagged, both resolve the question', () => {
  const choiceQ = (id) => ({ ...choice, id, options: ['صحيح', 'خطأ', 'ثالث'] })
  let s = start([choiceQ('a'), choiceQ('b'), choiceQ('c')], 'trivia')
  s = act(s, 'answer', { choice: -1 })
  assert.equal(s.resolved, true)
  assert.equal(s.selected, -1)
  assert.equal(s.records[0].correct, false)
  assert.equal(s.score, 0)
  s = act(act(s, 'next'), 'answer', { choice: s.questions[1].answerIndex, revealed: true })
  assert.equal(s.records[1].revealed, true)
  assert.equal(s.records[1].points, 300)
  s = act(act(s, 'next'), 'answer', { choice: -2 })
  assert.equal(s.resolved, false, 'anything below -1 is still rejected')
})

test('mixed rounds support both formats, keep their identity, and preserve choices', () => {
  let s = start([choice, song('one')], 'custom')
  for (let i = 0; i < 2; i++) {
    const q = s.questions[s.index]
    s = q.kind === 'song' ? solve(s) : act(s, 'answer', { choice: q.answerIndex })
    s = act(s, 'next')
  }
  assert.equal(s.phase, 'results')
  assert.equal(s.roundId, 'custom')
  assert.equal(s.records.length, 2)
  assert.equal(s.streak, 2)
  assert.ok(s.records.every((r) => r.correct))
  const pool = [song('a'), song('b'), choice]
  const built = buildRound(pool, 99)
  assert.equal(new Set(built.map((q) => q.id)).size, 3)
  const trivia = built.find((q) => q.kind !== 'song')
  assert.equal(trivia.options[trivia.answerIndex], 'صحيح')
})

test('catalog rejects missing clips, invalid timestamps, duplicate IDs, and path traversal', () => {
  const s = song('one').song
  assert.deepEqual(validateSongs([s], () => true), [])
  assert.equal(validateSongs([s], () => false).length, 3)
  assert.ok(validateSongs([s, s], () => true).length)
  assert.ok(validateSongs([{ ...s, famousStart: null }], () => true).length)
  assert.ok(validateSongs([{ ...s, famousEnd: 999 }], () => true).length)
  assert.ok(validateSongs([{ ...s, clips: { ...s.clips, famous: '../secret.mp3' } }], () => true).length)
  assert.deepEqual(validateSongs([{ ...s, status: 'draft', famousStart: null, famousEnd: null, clips: null }], () => false), [])
})

test('editor validation accepts fractional boundaries and rejects malformed approvals', () => {
  const valid = { titleAr: 'الأماكن', artistAr: '', famousStart: 20.25, famousEnd: 35.25 }
  assert.doesNotThrow(() => validateSelection(valid, 90))
  for (const patch of [{ intro3Start: -1 }, { intro3Start: null }, { intro3End: 0 }, { intro8End: 95 }, { intro8Start: '2' }, { famousStart: -1 }, { famousStart: '20' }, { famousEnd: 95 }, { famousEnd: 20 }, { titleAr: '' }, { titleAr: '\u202eاسم' }]) {
    assert.throws(() => validateSelection({ ...valid, ...patch }, 90))
  }
})
