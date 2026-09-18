import { readFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { readSongs, scanSongs, approveSong, markDraft, audioInfo } from './song-library.mjs'

// أداة تحرير محلية فقط؛ لا تُضمّن في الموقع المنشور أو نسخة القرص.
export function songReviewPlugin() {
  let busy = false
  return {
    name: 'local-song-review',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith('/__songs/')) return next()
        const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)) }
        const remote = req.socket.remoteAddress
        const local = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1'
        const host = req.headers.host ?? ''
        if (!local || !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) return json(403, { error: 'المراجعة متاحة من هذا الجهاز فقط' })
        try {
          if (req.method === 'GET' && url.pathname === '/__songs/review') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
            res.end(await readFile(new URL('./song-review.html', import.meta.url)))
          } else if (req.method === 'GET' && url.pathname === '/__songs/catalog') {
            json(200, await readSongs())
          } else if (req.method === 'GET' && url.pathname.startsWith('/__songs/audio/')) {
            const { file, size } = await audioInfo(url.pathname.slice('/__songs/audio/'.length))
            const range = req.headers.range
            let start = 0, end = size - 1
            if (range) {
              const match = /^bytes=(\d+)-(\d*)$/.exec(range)
              if (!match) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end() }
              start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
              if (start > end || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end() }
            }
            res.writeHead(range ? 206 : 200, {
              'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1,
              ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
            })
            const stream = createReadStream(file, { start, end })
            stream.on('error', () => res.destroy())
            res.on('close', () => stream.destroy())
            stream.pipe(res)
          } else if (req.method === 'POST') {
            if (req.headers.origin !== `http://${host}` || !req.headers['content-type']?.startsWith('application/json')) return json(403, { error: 'افتح صفحة المراجعة من اللعبة المحلية' })
            if (busy) return json(409, { error: 'جارٍ تجهيز أغنية أخرى؛ انتظر قليلاً' })
            let body = ''
            for await (const chunk of req) {
              body += chunk.toString()
              if (body.length > 8192) return json(413, { error: 'الطلب أكبر من المسموح' })
            }
            const input = JSON.parse(body || '{}')
            if (busy) return json(409, { error: 'جارٍ تجهيز أغنية أخرى؛ انتظر قليلاً' })
            busy = true
            try {
              if (url.pathname === '/__songs/scan') json(200, await scanSongs())
              else if (url.pathname === '/__songs/approve') json(200, await approveSong(input.id, input))
              else if (url.pathname === '/__songs/draft') json(200, await markDraft(input.id))
              else json(404, { error: 'الصفحة غير موجودة' })
            } finally { busy = false }
          } else json(404, { error: 'الصفحة غير موجودة' })
        } catch (error) {
          if (!res.headersSent) json(400, { error: error instanceof Error ? error.message : 'تعذّرت العملية؛ حاول مرة أخرى' })
          else res.destroy()
        }
      })
    },
  }
}
