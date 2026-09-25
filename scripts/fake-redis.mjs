/**
 * بديلٌ في الذاكرة لـ Upstash Redis — يحاكي شكل ردود واجهة pipeline
 * (أعداد لـ INCR، نصوص لـ GET، مصفوفة مسطّحة لـ HGETALL) للأوامر التي
 * يستعملها api/events.ts وحدها. للاختبارات وخادم التطوير، لا للإنتاج.
 */
export function createFakeRedis() {
  const strings = new Map()
  const hashes = new Map()
  const sets = new Map()
  const lists = new Map()

  const hash = (k) => hashes.get(k) ?? hashes.set(k, new Map()).get(k)
  const set = (k) => sets.get(k) ?? sets.set(k, new Set()).get(k)
  const incr = (k, by) => {
    const v = Number(strings.get(k) ?? 0) + by
    strings.set(k, String(v))
    return v
  }

  function run(op, a) {
    switch (op) {
      case 'INCR': return incr(a[0], 1)
      case 'INCRBY': return incr(a[0], Number(a[1]))
      case 'GET': return strings.get(a[0]) ?? null
      case 'MGET': return a.map((k) => strings.get(k) ?? null)
      case 'SADD': {
        const s = set(a[0])
        const before = s.size
        for (const x of a.slice(1)) s.add(x)
        return s.size - before
      }
      case 'SCARD': return sets.get(a[0])?.size ?? 0
      // صارمٌ عمداً: خيارات EXPIRE (NX/XX/GT/LT) من Redis 7 وحده — مرفوضةٌ هنا
      // كي لا تمرّ الاختبارات بشيفرةٍ قد تفشل على إصدارٍ أقدم
      case 'EXPIRE':
        if (a.length !== 2) throw new Error('fake-redis: EXPIRE options are Redis 7 only')
        return 1
      case 'SET': {
        const [k, v, ...opts] = a
        const nx = opts.includes('NX')
        if (nx && strings.has(k)) return null
        strings.set(k, v)
        return 'OK'
      }
      case 'HINCRBY': {
        const h = hash(a[0])
        const v = Number(h.get(a[1]) ?? 0) + Number(a[2])
        h.set(a[1], String(v))
        return v
      }
      case 'HGETALL': {
        const h = hashes.get(a[0])
        return h ? [...h].flat() : []
      }
      case 'PFADD': {
        const s = set(a[0])
        const before = s.size
        for (const x of a.slice(1)) s.add(x)
        return s.size > before ? 1 : 0
      }
      case 'PFCOUNT': return sets.get(a[0])?.size ?? 0
      case 'LPUSH': {
        const l = lists.get(a[0]) ?? lists.set(a[0], []).get(a[0])
        for (const x of a.slice(1)) l.unshift(x)
        return l.length
      }
      case 'LTRIM': {
        const l = lists.get(a[0])
        if (l) lists.set(a[0], l.slice(Number(a[1]), Number(a[2]) + 1))
        return 'OK'
      }
      case 'LRANGE': return (lists.get(a[0]) ?? []).slice(Number(a[1]), Number(a[2]) + 1)
      case 'LLEN': return lists.get(a[0])?.length ?? 0
      default: throw new Error(`fake-redis: unsupported ${op}`)
    }
  }

  return {
    exec: async (cmds) => cmds.map(([op, ...args]) => run(String(op).toUpperCase(), args.map(String))),
    strings, hashes, sets, lists,
  }
}
