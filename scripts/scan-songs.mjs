import { scanSongs } from './song-library.mjs'
const songs = await scanSongs()
console.log(`أغاني: ${songs.length} · جاهزة: ${songs.filter((s) => s.status === 'ready').length}`)
console.log('اختر المقاطع المشهورة من صفحة /__songs/review أثناء تشغيل اللعبة محلياً.')
