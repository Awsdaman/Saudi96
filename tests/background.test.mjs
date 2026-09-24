import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const root = join(import.meta.dirname, '..')
const read = (p) => readFileSync(join(root, p), 'utf8')
const cssFiles = ['src/index.css', ...['components', 'screens'].flatMap((d) =>
  readdirSync(join(root, 'src', d)).filter((f) => f.endsWith('.css')).map((f) => `src/${d}/${f}`))]
const ASSETS = ['bg-scene.jpg', 'bg-band-l.webp', 'bg-band-r.webp']

test('the background is defined once, in index.css — no screen carries its own copy', () => {
  for (const f of cssFiles) {
    const css = read(f)
    if (f === 'src/index.css') continue
    assert.doesNotMatch(css, /assets\/identity\/(play-bg|bg-)/, `${f} redefines the shared background`)
    assert.doesNotMatch(css, /min\(1400px/, `${f} still caps the artwork at 1400px`)
  }
  const index = read('src/index.css')
  for (const a of ASSETS) {
    // url() literal, not a custom property: Vite only rewrites plain url() for file:// and subpath builds
    assert.match(index, new RegExp(`url\\('/assets/identity/${a.replace('.', '\\.')}'\\)`), `index.css must reference ${a}`)
    assert.ok(existsSync(join(root, 'public/assets/identity', a)), `${a} is missing — run: node scripts/make-background.mjs`)
  }
  assert.match(index, /body::before\s*\{[^}]*position:\s*fixed/)
})

test('every full-width screen keeps its content clear of the sadu frame', () => {
  const guarded = ['Home', 'Play', 'Results', 'CustomBuilder', 'LogoRound', 'AudienceView', 'TeamSetup', 'Credits']
  for (const name of guarded) assert.match(read(`src/screens/${name}.css`), /--frame-gutter/, `${name}.css ignores --frame-gutter`)
  assert.match(read('src/admin/AdminDashboard.css'), /--frame-gutter/, 'the admin dashboard would sit on the frame')
  assert.match(read('src/components/TeamScoreboard.css'), /--frame-w/, 'the scoreboard would sit on the frame')
})

test('generated tiles are sane: matching widths, alpha fade, scene wide enough to cover any screen', async () => {
  const dir = join(root, 'public/assets/identity')
  const l = await sharp(join(dir, 'bg-band-l.webp')).metadata()
  const r = await sharp(join(dir, 'bg-band-r.webp')).metadata()
  const scene = await sharp(join(dir, 'bg-scene.jpg')).metadata()
  assert.equal(l.width, r.width)
  assert.ok(l.hasAlpha && r.hasAlpha, 'bands need an alpha fade at their inner edge')
  assert.ok(scene.width >= 3000, `scene is only ${scene.width}px wide — it would blur on 4K`)
  assert.ok(scene.width / scene.height > 1.6 && scene.width / scene.height < 1.9)
})

test('band tiles repeat without a visible seam', async () => {
  for (const side of ['l', 'r']) {
    const { data, info } = await sharp(join(root, `public/assets/identity/bg-band-${side}.webp`)).raw().toBuffer({ resolveWithObject: true })
    const rowDiff = (a, b) => {
      let s = 0
      for (let x = 0; x < info.width; x++) for (let c = 0; c < 3; c++) s += Math.abs(data[(a * info.width + x) * info.channels + c] - data[(b * info.width + x) * info.channels + c])
      return s / (info.width * 3)
    }
    const seam = rowDiff(info.height - 1, 0)           // last row -> first row (the wrap)
    let typical = 0
    for (let y = 100; y < 400; y++) typical += rowDiff(y, y + 1)
    typical /= 300
    assert.ok(seam < typical * 3 + 4, `band-${side}: wrap jump ${seam.toFixed(1)} vs typical row step ${typical.toFixed(1)}`)
  }
})
