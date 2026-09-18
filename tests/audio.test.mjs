import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import ffmpeg from 'ffmpeg-static'
import { approveSong, durationOf } from '../scripts/song-library.mjs'

test('audio pipeline creates bounded, anonymous clips and only approves after all succeed', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'saudi-song-test-'))
  await mkdir(path.join(root, 'Songs'))
  await mkdir(path.join(root, 'src/data'), { recursive: true })
  const source = path.join(root, 'Songs/test.mp3')
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=20',
    '-f', 'lavfi', '-i', 'sine=frequency=880:duration=20', '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1[a]',
    '-map', '[a]', '-metadata', 'title=SECRET_TITLE', '-metadata', 'artist=SECRET_ARTIST', '-c:a', 'libmp3lame', source], { windowsHide: true })
  const before = await readFile(source)
  const song = { id: 'qa', titleAr: 'اختبار', artistAr: '', sourceFile: 'test.mp3', status: 'draft', duration: 40, famousStart: null, famousEnd: null, clips: null }
  const catalog = path.join(root, 'src/data/songs.json')
  await writeFile(catalog, JSON.stringify([song]))
  await assert.rejects(approveSong('qa', { titleAr: 'اختبار', artistAr: '', famousStart: 30, famousEnd: 99 }, root))
  assert.equal(JSON.parse(await readFile(catalog, 'utf8'))[0].status, 'draft')
  const result = await approveSong('qa', { titleAr: 'اختبار', artistAr: '', famousStart: 22, famousEnd: 37 }, root)
  assert.equal(result.status, 'ready')
  assert.deepEqual(await readFile(source), before)
  for (const [key, expected] of [['intro3', 3], ['intro8', 8], ['famous', 15]]) {
    const file = path.join(root, 'public', result.clips[key])
    assert.ok(Math.abs(await durationOf(file) - expected) < 0.15)
    const bytes = await readFile(file)
    assert.ok(!bytes.includes(Buffer.from('SECRET_TITLE')) && !bytes.includes(Buffer.from('SECRET_ARTIST')))
    // عدد عبور الصفر يميّز مقدمة 440 هرتز عن المقطع المشهور 880 هرتز.
    const pcm = execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', file, '-t', '1', '-ac', '1', '-ar', '8000', '-f', 's16le', 'pipe:1'], { windowsHide: true })
    let crossings = 0
    for (let i = 2; i < pcm.length; i += 2) if (pcm.readInt16LE(i - 2) < 0 && pcm.readInt16LE(i) >= 0) crossings++
    assert.ok(Math.abs(crossings - (key === 'famous' ? 880 : 440)) < 12)
  }
  const custom = await approveSong('qa', { titleAr: 'اختبار', artistAr: '', famousStart: 22, famousEnd: 37,
    intro3Start: 22, intro3End: 26, intro8Start: 27, intro8End: 33 }, root)
  assert.equal(custom.intro3Start, 22)
  assert.equal(custom.intro8End, 33)
  assert.notEqual(custom.clips.intro3, result.clips.intro3)
  for (const [key, expected] of [['intro3', 4], ['intro8', 6]]) {
    const file = path.join(root, 'public', custom.clips[key])
    assert.ok(Math.abs(await durationOf(file) - expected) < 0.15)
    const pcm = execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', file, '-t', '1', '-ac', '1', '-ar', '8000', '-f', 's16le', 'pipe:1'], { windowsHide: true })
    let crossings = 0
    for (let i = 2; i < pcm.length; i += 2) if (pcm.readInt16LE(i - 2) < 0 && pcm.readInt16LE(i) >= 0) crossings++
    assert.ok(Math.abs(crossings - 880) < 12, 'custom introduction starts in the selected part of the song')
  }
  await assert.rejects(approveSong('qa', { titleAr: 'اختبار', artistAr: '', famousStart: 22, famousEnd: 37,
    intro3Start: 39, intro3End: 45 }, root))
  assert.deepEqual(JSON.parse(await readFile(catalog, 'utf8'))[0], custom)
  const preserved = await approveSong('qa', { titleAr: 'اختبار', artistAr: '', famousStart: 22, famousEnd: 37 }, root)
  assert.equal(preserved.intro3Start, 22)
  assert.equal(preserved.intro8End, 33)
})
