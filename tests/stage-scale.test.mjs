import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

// شاشات الأسئلة تُكبَّر عبر rem (index.css: html.stage)، فأي مقاسٍ ثابتٌ بالبكسل
// فيها يبقى صغيراً بينما يكبر النص حوله — العمود والأزرار والبطاقات تختلّ نسبتها.
const STAGE_FILES = [
  'src/screens/Play.css', 'src/screens/SongPlay.css', 'src/screens/LogoRound.css',
  'src/components/ScoreBar.css', 'src/components/AnswerGrid.css', 'src/components/Verdict.css',
  'src/components/HowToModal.css', 'src/components/AwardPopup.css', 'src/components/TeamScoreboard.css',
]
const SIZE_PROP = /(?<![\w-])(padding(?:-block|-inline|-inline-start|-inline-end|-top|-bottom)?|margin(?:-block|-inline|-top|-bottom)?|gap|row-gap|column-gap|min-height|max-height|min-width|max-width|width|height|grid-template-columns)\s*:\s*([^;}]+)/g

test('question screens are sized in rem so they scale together with their text', () => {
  for (const file of STAGE_FILES) {
    const css = read(file).split('\n').filter((line) => !line.trim().startsWith('@media')).join('\n')
    for (const [, prop, value] of css.matchAll(SIZE_PROP)) {
      for (const [, n] of value.matchAll(/(\d*\.?\d+)px/g)) {
        assert.ok(+n < 4, `${file}: "${prop}: ${value.trim()}" uses ${n}px — use rem so it grows with html.stage`)
      }
    }
  }
})

test('the stage scale respects both width and height and is switched on only by question screens', () => {
  const index = read('src/index.css')
  const rule = index.match(/html\.stage\s*\{\s*font-size:\s*([^;]+);/)
  assert.ok(rule, 'index.css lost the html.stage rule')
  assert.match(rule[1], /vw/, 'stage scale should follow the width')
  assert.match(rule[1], /vh/, 'stage scale must also follow the height, or short wide windows overflow into the scoreboard')
  assert.match(rule[1], /clamp\(\s*16px/, 'small screens must stay at the normal 16px')
  const app = read('src/App.tsx')
  assert.match(app, /useStageScale\(view === 'logos' \|\| \(state\.phase === 'playing' && !!question\)\)/)
  assert.match(read('src/game/useStageScale.ts'), /useLayoutEffect/, 'must be a layout effect or screens flash at their old size')
})
