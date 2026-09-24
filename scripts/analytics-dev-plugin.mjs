import { createFakeRedis } from './fake-redis.mjs'

/**
 * خادم التطوير وحده (npm run dev): يوجّه /api/events إلى الدالّة نفسها
 * التي تعمل على فيرسل، لكن بتخزينٍ في الذاكرة يُنسى بإيقاف الخادم —
 * فتُجرَّب اللعبة ولوحة الإدارة كاملتين بلا قاعدة بيانات حقيقية.
 * كلمة مرور لوحة الإدارة محلياً: dev (ما لم يُضبط ADMIN_PASSWORD).
 */
export function analyticsDevPlugin() {
  return {
    name: 'analytics-dev',
    apply: 'serve',
    configureServer(server) {
      const redis = createFakeRedis()
      process.env.ADMIN_PASSWORD ??= 'dev'

      server.middlewares.use('/api/events', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/events.ts')
          mod.setStorageForTests(redis.exec)
          const handler = mod[req.method ?? 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            res.end()
            return
          }
          const chunks = []
          for await (const c of req) chunks.push(c)
          const headers = new Headers()
          for (const name of ['content-type', 'x-admin-password', 'x-forwarded-for']) {
            const v = req.headers[name]
            if (typeof v === 'string') headers.set(name, v)
          }
          const request = new Request(new URL(req.originalUrl ?? '/api/events', 'http://localhost'), {
            method: req.method,
            headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
          })
          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          res.statusCode = 500
          res.end(String(error))
        }
      })
    },
  }
}
