export function validateSongs(songs, exists) {
  const errors = [], ids = new Set()
  for (const song of songs) {
    const fail = (text) => errors.push(`أغنية ${song.id}: ${text}`)
    if (!/^[a-z0-9_-]+$/.test(song.id) || ids.has(song.id)) fail('معرّف غير صالح أو مكرر')
    ids.add(song.id)
    if (typeof song.titleAr !== 'string' || !song.titleAr.trim()) fail('بلا اسم')
    if (typeof song.artistAr !== 'string') fail('حقل الفنان غير صالح')
    if (!['draft', 'ready'].includes(song.status)) fail('حالة غير صالحة')
    if (typeof song.sourceFile !== 'string' || !/^[^/\\]+\.mp3$/i.test(song.sourceFile)) fail('اسم التسجيل غير صالح')
    if (song.status !== 'ready') continue
    for (const [key, fallback] of [['intro3', 3], ['intro8', 8]]) {
      const start = song[key + 'Start'] === undefined ? 0 : song[key + 'Start']
      const end = song[key + 'End'] === undefined ? fallback : song[key + 'End']
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > song.duration || end - start < 1 || end - start > 60) fail(`توقيت ${key} غير صالح`)
    }
    if (!Number.isFinite(song.duration) || song.duration < 8) fail('مدة التسجيل أقل من 8 ثوانٍ أو غير معروفة')
    if (!Number.isFinite(song.famousStart) || !Number.isFinite(song.famousEnd) || song.famousStart < 0 || song.famousEnd > song.duration || song.famousEnd - song.famousStart < 1 || song.famousEnd - song.famousStart > 60) fail('توقيت المقطع المشهور غير صالح')
    for (const key of ['intro3', 'intro8', 'famous']) {
      const file = song.clips?.[key]
      if (typeof file !== 'string' || !/^assets\/songs\/[a-z0-9_-]+\.mp3$/.test(file)) fail(`مسار ${key} غير صالح`)
      else if (!exists(file)) fail(`المقطع مفقود: ${file}`)
    }
  }
  return errors
}
