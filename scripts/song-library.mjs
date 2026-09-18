import { readFile, writeFile, readdir, mkdir, stat, realpath } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import ffmpeg from 'ffmpeg-static'

export const root = fileURLToPath(new URL('../', import.meta.url))
export const catalogPath = path.join(root, 'src/data/songs.json')
const sourceRoot = path.join(root, 'Songs')

export async function readSongs(file = catalogPath) {
  return JSON.parse(await readFile(file, 'utf8'))
}

async function writeSongs(songs, file = catalogPath) {
  await writeFile(file, JSON.stringify(songs, null, 2) + '\n')
}

export async function sourcePath(song, directory = sourceRoot) {
  if (typeof song.sourceFile !== 'string' || path.basename(song.sourceFile) !== song.sourceFile) throw new Error('اسم ملف الأغنية غير صالح')
  const resolved = await realpath(path.join(directory, song.sourceFile))
  const parent = await realpath(directory)
  const canonical = (value) => process.platform === 'win32' ? value.toLowerCase() : value
  if (canonical(path.dirname(resolved)) !== canonical(parent)) throw new Error('ملف الأغنية خارج مجلد الأغاني')
  return resolved
}

function run(args, probe = false) {
  return new Promise((resolve, reject) => {
    execFile(ffmpeg, ['-hide_banner', '-nostdin', ...args], { windowsHide: true, timeout: 120000, maxBuffer: 2 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error && !probe) reject(new Error('تعذّر تجهيز الصوت: ' + stderr.slice(-500)))
      else resolve(stderr)
    })
  })
}

export async function durationOf(file) {
  const report = await run(['-i', file], true)
  const match = report.match(/Duration:\s*(\d+):(\d+):([\d.]+)/)
  if (!match || !/Audio:/.test(report)) throw new Error('تعذّر قراءة مدة الملف الصوتي')
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

export async function scanSongs() {
  const songs = await readSongs()
  const files = (await readdir(sourceRoot)).filter((name) => /\.mp3$/i.test(name)).sort()
  for (const file of files) {
    let song = songs.find((s) => s.sourceFile === file)
    if (!song) {
      song = {
        id: 's' + createHash('sha256').update(file).digest('hex').slice(0, 10),
        titleAr: file.replace(/\.mp3$/i, ''), artistAr: '', sourceFile: file,
        status: 'draft', duration: null, famousStart: null, famousEnd: null, clips: null,
      }
      songs.push(song)
    }
    song.duration = await durationOf(await sourcePath(song))
  }
  await writeSongs(songs)
  return songs
}

export function validateSelection(input, duration) {
  const { titleAr, artistAr, famousStart, famousEnd } = input
  if (typeof titleAr !== 'string' || !titleAr.trim() || titleAr.length > 160) throw new Error('اكتب اسم الأغنية، بحد أقصى 160 حرفاً')
  if (typeof artistAr !== 'string' || artistAr.length > 160) throw new Error('اسم الفنان أطول من المسموح')
  if (!Number.isFinite(famousStart) || !Number.isFinite(famousEnd) || famousStart < 0 || famousEnd <= famousStart || famousEnd > duration) {
    throw new Error('اختر بداية ونهاية داخل مدة الأغنية، على أن تكون النهاية بعد البداية')
  }
  if (famousEnd - famousStart < 1 || famousEnd - famousStart > 60) throw new Error('اجعل المقطع المشهور بين ثانية واحدة و60 ثانية')
  if (duration < 8) throw new Error('مدة الأغنية أقل من 8 ثوانٍ')
  for (const [key, fallback] of [['intro3', 3], ['intro8', 8]]) {
    const start = input[key + 'Start'] === undefined ? 0 : input[key + 'Start']
    const end = input[key + 'End'] === undefined ? fallback : input[key + 'End']
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > duration || end - start < 1 || end - start > 60) {
      throw new Error('اختر لكل مقطع بداية ونهاية داخل الأغنية، وبمدة من ثانية واحدة إلى 60 ثانية')
    }
  }
  if (/[\u202a-\u202e\u2066-\u2069\ufb50-\ufdff\ufe70-\ufeff]/u.test(titleAr + artistAr)) throw new Error('أعد كتابة الاسم دون محارف اتجاه مخفية')
}

export async function approveSong(id, input, workspaceRoot = root) {
  const catalog = path.join(workspaceRoot, 'src/data/songs.json')
  const songs = await readSongs(catalog)
  const index = songs.findIndex((s) => s.id === id)
  if (index < 0) throw new Error('الأغنية غير موجودة')
  const original = songs[index]
  if (!/^[a-z0-9_-]+$/.test(id)) throw new Error('معرّف الأغنية غير صالح')
  const source = await sourcePath(original, path.join(workspaceRoot, 'Songs'))
  const duration = await durationOf(source)
  input = {
    intro3Start: original.intro3Start ?? 0, intro3End: original.intro3End ?? 3,
    intro8Start: original.intro8Start ?? 0, intro8End: original.intro8End ?? 8,
    ...input,
  }
  validateSelection(input, duration)
  // أسماء جديدة لكل قصّة تمنع المتصفح من تشغيل نسخة قديمة مخزّنة.
  const version = createHash('sha256').update(await readFile(source)).update(JSON.stringify([input.intro3Start, input.intro3End, input.intro8Start, input.intro8End, input.famousStart, input.famousEnd])).digest('hex').slice(0, 12)
  const folder = path.join(workspaceRoot, 'public/assets/songs')
  await mkdir(folder, { recursive: true })
  const clips = {}
  for (const [key, start, length, n] of [
    ['intro3', input.intro3Start, input.intro3End - input.intro3Start, 1], ['intro8', input.intro8Start, input.intro8End - input.intro8Start, 2],
    ['famous', input.famousStart, input.famousEnd - input.famousStart, 3],
  ]) {
    const name = `${id}-${version}-${n}${n === 2 ? '-8s' : ''}.mp3`
    await run(['-y', '-i', source, '-ss', String(start), '-t', String(length), '-map', '0:a:0', '-vn',
      '-map_metadata', '-1', '-ac', '2', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k', path.join(folder, name)])
    const actual = await durationOf(path.join(folder, name))
    if (Math.abs(actual - length) > 0.15) throw new Error('مدة المقطع الناتج غير صحيحة؛ لم تُعتمد الأغنية')
    clips[key] = `assets/songs/${name}`
  }
  songs[index] = {
    ...original, titleAr: input.titleAr.trim(), artistAr: input.artistAr.trim(), duration,
    famousStart: input.famousStart, famousEnd: input.famousEnd, clips, status: 'ready',
    intro3Start: input.intro3Start, intro3End: input.intro3End,
    intro8Start: input.intro8Start, intro8End: input.intro8End,
  }
  await writeSongs(songs, catalog)
  return songs[index]
}

export async function markDraft(id) {
  const songs = await readSongs()
  const song = songs.find((s) => s.id === id)
  if (!song) throw new Error('الأغنية غير موجودة')
  song.status = 'draft'
  await writeSongs(songs)
  return song
}

export async function audioInfo(id) {
  const song = (await readSongs()).find((s) => s.id === id)
  if (!song) throw new Error('الأغنية غير موجودة')
  const file = await sourcePath(song)
  return { file, size: (await stat(file)).size }
}
