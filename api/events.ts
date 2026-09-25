import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * إحصاءات اللعبة — دالّةٌ واحدة على فيرسل:
 *   POST  يسجّل حدثاً مجهول الهوية من اللعبة (زيارة، بدء جولة، نهايتها)،
 *         أو اقتراحاً يكتبه اللاعب (feedback).
 *   GET   يعيد الإحصاءات المجمّعة والاقتراحات للوحة الإدارة، بكلمة المرور وحدها.
 *
 * التخزين في Upstash Redis عبر واجهته REST (بلا مكتبة إضافية)، ومفاتيحه
 * يحقنها تكامل فيرسل تلقائياً: KV_REST_API_URL / KV_REST_API_TOKEN
 * (أو UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). كلمة المرور في
 * ADMIN_PASSWORD — لا تُكتب في الشيفرة ولا تصل الحزمة التي يحمّلها الزائر.
 *
 * الملف مستقلٌّ بلا استيرادٍ محلّي عمداً: فيرسل يحوّل كل ملفٍّ على حدة.
 */

type Cmd = (string | number)[]
type Exec = (cmds: Cmd[]) => Promise<unknown[]>

const P = 'sk:'
const DAY_TTL = 60 * 60 * 24 * 400
/** مجموعات الأجهزة اليومية أثقل من العدّادات، واللوحة لا تعرض أكثر من 30 يوماً */
const DEVICE_DAY_TTL = 60 * 60 * 24 * 40
const DAYS_SHOWN = 30
const MAX_BODY = 32_000
const MAX_ANSWERS = 500
const MAX_FAILS = 10
const LOCK_SECONDS = 15 * 60
const MIN_SEEN_FOR_RANKING = 3
/** الاقتراحات: طول النص، وأقصى عددٍ يُحفظ (الأحدث)، وحدّ الإرسال لكل جهاز وعنوان في الساعة */
const FEEDBACK_MIN = 3
const FEEDBACK_MAX = 1000
const FEEDBACK_KEEP = 500
const FEEDBACK_SHOWN = 200
const FEEDBACK_PER_HOUR = 5

const ROUNDS = new Set(['songs', 'logos', 'logos-cards', 'landmarks', 'regions', 'dishes', 'people', 'trivia', 'custom'])
const MODES = new Set(['easy', 'medium', 'hard'])
const VISITOR = /^[A-Za-z0-9_-]{8,64}$/
const QID = /^[A-Za-z0-9_:.-]{1,80}$/

async function upstash(cmds: Cmd[]): Promise<unknown[]> {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('storage-not-configured')
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  })
  if (!res.ok) throw new Error(`storage-${res.status}`)
  const out = (await res.json()) as { result?: unknown; error?: string }[]
  return out.map((r) => {
    if (r.error) throw new Error(r.error)
    return r.result
  })
}

let exec: Exec = upstash

/** يستبدل التخزين الحقيقي بآخر في الذاكرة — للاختبارات وخادم التطوير المحلي فقط */
export function setStorageForTests(fn: Exec) {
  exec = fn
}

/** تاريخ اليوم بتوقيت الرياض (UTC+3، بلا توقيتٍ صيفي) */
export function riyadhDay(now: number, daysAgo = 0): string {
  return new Date(now + 3 * 3600_000 - daysAgo * 86_400_000).toISOString().slice(0, 10)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  })
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const isRound = (x: unknown): x is string => typeof x === 'string' && ROUNDS.has(x)

/** يحوّل الحدث إلى أوامر تخزين — أو null إن خالف شكله المتوقّع في أي حقل */
function commandsFor(ev: unknown, now: number): Cmd[] | null {
  if (!isObj(ev) || typeof ev.visitor !== 'string' || !VISITOR.test(ev.visitor)) return null
  const day = riyadhDay(now)

  if (ev.type === 'visit') {
    // عدٌّ دقيق بمجموعة (SADD/SCARD) لا بتقدير HyperLogLog. مفاتيح
    // sk:visitors القديمة (تقديرية) تبقى تُقرأ في GET للأيام التي سبقت التبديل.
    return [
      ['SADD', `${P}dev`, ev.visitor],
      ['SADD', `${P}dev:${day}`, ev.visitor],
      ['EXPIRE', `${P}dev:${day}`, DEVICE_DAY_TTL],
      ['INCR', `${P}visits`],
      ['INCR', `${P}visits:${day}`],
      ['EXPIRE', `${P}visits:${day}`, DAY_TTL],
    ]
  }

  if (ev.type === 'round_start') {
    const { round, mode, teams, audience, count } = ev
    if (!isRound(round) || typeof teams !== 'boolean' || typeof audience !== 'boolean') return null
    if (mode !== undefined && !(typeof mode === 'string' && MODES.has(mode))) return null
    if (!Number.isInteger(count) || (count as number) < 1 || (count as number) > 1000) return null
    const cmds: Cmd[] = [
      ['HINCRBY', `${P}started`, round, 1],
      ['INCR', `${P}rounds:${day}`],
      ['EXPIRE', `${P}rounds:${day}`, DAY_TTL],
      ['HINCRBY', `${P}play`, teams ? 'teams' : 'solo', 1],
      ['HINCRBY', `${P}length`, 'sum', count as number],
      ['HINCRBY', `${P}length`, 'n', 1],
    ]
    if (mode) cmds.push(['HINCRBY', `${P}modes`, mode, 1])
    if (audience) cmds.push(['HINCRBY', `${P}play`, 'audience', 1])
    return cmds
  }

  if (ev.type === 'round_end') {
    const { round, completed, answers } = ev
    if (!isRound(round) || typeof completed !== 'boolean' || !Array.isArray(answers) || answers.length > MAX_ANSWERS) return null
    const answered = new Map<string, number>()
    const right = new Map<string, number>()
    const revealed = new Map<string, number>()
    const seen = new Map<string, boolean>()
    const counted = new Set<string>()
    for (const a of answers) {
      if (!isObj(a) || typeof a.q !== 'string' || !QID.test(a.q) || typeof a.c !== 'boolean' || !isRound(a.r)) return null
      if (a.h !== undefined && a.h !== true) return null
      // السؤال نفسه مرّتين في الحدث الواحد يُحسب مرّة
      if (counted.has(a.q)) continue
      counted.add(a.q)
      // كشفها المستضيف بلا إجابةٍ من اللاعبين: تُعدّ وحدها، خارج الدقّة كلّها
      if (a.h) {
        revealed.set(a.r, (revealed.get(a.r) ?? 0) + 1)
        continue
      }
      seen.set(a.q, a.c)
      answered.set(a.r, (answered.get(a.r) ?? 0) + 1)
      if (a.c) right.set(a.r, (right.get(a.r) ?? 0) + 1)
    }
    const cmds: Cmd[] = []
    if (completed) cmds.push(['HINCRBY', `${P}completed`, round, 1])
    for (const [r, n] of answered) cmds.push(['HINCRBY', `${P}answered`, r, n])
    for (const [r, n] of right) cmds.push(['HINCRBY', `${P}right`, r, n])
    for (const [r, n] of revealed) cmds.push(['HINCRBY', `${P}revealed`, r, n])
    for (const [q, c] of seen) {
      cmds.push(['HINCRBY', `${P}q:seen`, q, 1])
      if (!c) cmds.push(['HINCRBY', `${P}q:wrong`, q, 1])
    }
    return cmds.length ? cmds : null
  }

  return null
}

/** مفتاحٌ مُجزَّأ — لا يُخزَّن العنوان أو المعرّف نفسه */
const hashed = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 24)
const clientIp = (request: Request) => (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()

/** نصّ الاقتراح بعد التنظيف — أو null إن كان فارغاً أو قصيراً أو طويلاً */
export function cleanFeedback(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const text = raw
    .replace(/\r\n?/g, '\n')
    // محارف التحكّم (عدا السطر الجديد) لا مكان لها في نصٍّ يُعرض — إزالتها هي المقصود
    // oxlint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (text.length < FEEDBACK_MIN || text.length > FEEDBACK_MAX) return null
  return text
}

/**
 * اقتراحٌ من اللاعب: يُحفظ النص ووقته فقط، بلا معرّف الجهاز ولا العنوان.
 * حدٌّ للإرسال لكل جهازٍ ولكل عنوان يمنع إغراق القائمة، والقائمة نفسها
 * لا تتجاوز أحدث FEEDBACK_KEEP اقتراحاً.
 */
async function postFeedback(ev: Record<string, unknown>, request: Request, now: number): Promise<Response> {
  if (typeof ev.visitor !== 'string' || !VISITOR.test(ev.visitor)) return json({ error: 'invalid' }, 400)
  const text = cleanFeedback(ev.text)
  if (!text) return json({ error: 'invalid' }, 400)
  const keys = [`${P}fbrate:v:${hashed(ev.visitor)}`, `${P}fbrate:ip:${hashed(clientIp(request))}`]
  try {
    const counts = await exec(keys.flatMap((k) => [['INCR', k], ['EXPIRE', k, 3600, 'NX']] as Cmd[]))
    if (Number(counts[0]) > FEEDBACK_PER_HOUR || Number(counts[2]) > FEEDBACK_PER_HOUR) return json({ error: 'rate' }, 429)
    await exec([
      ['LPUSH', `${P}feedback`, JSON.stringify({ text, at: new Date(now).toISOString() })],
      ['LTRIM', `${P}feedback`, 0, FEEDBACK_KEEP - 1],
    ])
  } catch {
    return json({ error: 'storage' }, 503)
  }
  return new Response(null, { status: 204 })
}

function parseFeedback(list: unknown): { text: string; at: string }[] {
  if (!Array.isArray(list)) return []
  return list.flatMap((item) => {
    try {
      const x = JSON.parse(String(item)) as unknown
      return isObj(x) && typeof x.text === 'string' && typeof x.at === 'string' ? [{ text: x.text, at: x.at }] : []
    } catch {
      return []
    }
  })
}

export async function POST(request: Request): Promise<Response> {
  const text = await request.text()
  if (text.length > MAX_BODY) return json({ error: 'too-large' }, 413)
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return json({ error: 'bad-json' }, 400)
  }
  if (isObj(body) && body.type === 'feedback') return postFeedback(body, request, Date.now())
  const cmds = commandsFor(body, Date.now())
  if (!cmds) return json({ error: 'invalid' }, 400)
  try {
    await exec(cmds)
  } catch {
    return json({ error: 'storage' }, 503)
  }
  return new Response(null, { status: 204 })
}

/** مقارنةٌ بزمنٍ ثابت — لا تكشف طول التطابق عبر توقيت الردّ */
function samePassword(given: string, expected: string): boolean {
  const a = createHash('sha256').update(given).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

function toMap(flat: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!Array.isArray(flat)) return out
  for (let i = 0; i + 1 < flat.length; i += 2) out[String(flat[i])] = Number(flat[i + 1]) || 0
  return out
}

export async function GET(request: Request): Promise<Response> {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return json({ error: 'admin-not-configured' }, 503)

  // عدّاد المحاولات الفاشلة لكل عنوان — مُجزَّأً، فلا يُخزَّن العنوان نفسه
  const failKey = `${P}fail:${hashed(clientIp(request))}`

  try {
    const [fails] = await exec([['GET', failKey]])
    if (Number(fails) >= MAX_FAILS) return json({ error: 'locked' }, 429)

    if (!samePassword(request.headers.get('x-admin-password') ?? '', expected)) {
      await exec([['INCR', failKey], ['EXPIRE', failKey, LOCK_SECONDS]])
      return json({ error: 'unauthorized' }, 401)
    }

    const now = Date.now()
    const days = Array.from({ length: DAYS_SHOWN }, (_, i) => riyadhDay(now, DAYS_SHOWN - 1 - i))
    // عدّادات الأيام كلّها بأمرَي MGET، لا بأمرٍ لكل يوم — حصّة Upstash
    // المجانية تُحسب بالأوامر. الأجهزة الفريدة تحتاج SCARD لكل يوم، ومعها
    // PFCOUNT للمفاتيح التقديرية القديمة التي سبقت العدّ الدقيق.
    const fixed: Cmd[] = [
      ['SCARD', `${P}dev`], ['PFCOUNT', `${P}visitors`], ['GET', `${P}visits`],
      ['HGETALL', `${P}started`], ['HGETALL', `${P}completed`],
      ['HGETALL', `${P}answered`], ['HGETALL', `${P}right`], ['HGETALL', `${P}revealed`],
      ['HGETALL', `${P}modes`], ['HGETALL', `${P}play`], ['HGETALL', `${P}length`],
      ['HGETALL', `${P}q:seen`], ['HGETALL', `${P}q:wrong`],
      ['MGET', ...days.map((d) => `${P}visits:${d}`)],
      ['MGET', ...days.map((d) => `${P}rounds:${d}`)],
      ['LRANGE', `${P}feedback`, 0, FEEDBACK_SHOWN - 1], ['LLEN', `${P}feedback`],
    ]
    const perDay: Cmd[] = days.flatMap((d) => [['SCARD', `${P}dev:${d}`], ['PFCOUNT', `${P}visitors:${d}`]])
    const r = await exec([...fixed, ...perDay])

    const started = toMap(r[3]), completed = toMap(r[4])
    const answered = toMap(r[5]), right = toMap(r[6]), revealed = toMap(r[7])
    const length = toMap(r[10])
    const seen = toMap(r[11]), wrong = toMap(r[12])
    const dayVisits = Array.isArray(r[13]) ? r[13] : []
    const dayRounds = Array.isArray(r[14]) ? r[14] : []

    const roundIds = new Set([...Object.keys(started), ...Object.keys(answered), ...Object.keys(revealed)])
    const rounds = [...roundIds].map((id) => ({
      id, started: started[id] ?? 0, completed: completed[id] ?? 0,
      answered: answered[id] ?? 0, right: right[id] ?? 0, revealed: revealed[id] ?? 0,
    }))

    const questions = Object.entries(seen)
      .filter(([, n]) => n >= MIN_SEEN_FOR_RANKING)
      .map(([id, n]) => ({ id, seen: n, wrong: wrong[id] ?? 0 }))
      .sort((a, b) => b.wrong / b.seen - a.wrong / a.seen || b.seen - a.seen)
      .slice(0, 25)

    return json({
      generatedAt: new Date(now).toISOString(),
      totals: {
        visitors: (Number(r[0]) || 0) + (Number(r[1]) || 0),
        visits: Number(r[2]) || 0,
        roundsStarted: Object.values(started).reduce((s, n) => s + n, 0),
        roundsCompleted: Object.values(completed).reduce((s, n) => s + n, 0),
      },
      days: days.map((date, i) => ({
        date,
        visitors: (Number(r[fixed.length + i * 2]) || 0) + (Number(r[fixed.length + i * 2 + 1]) || 0),
        visits: Number(dayVisits[i]) || 0,
        rounds: Number(dayRounds[i]) || 0,
      })),
      rounds,
      modes: toMap(r[8]),
      play: toMap(r[9]),
      avgLength: length.n ? length.sum / length.n : 0,
      questions,
      questionsTracked: Object.keys(seen).length,
      feedback: parseFeedback(r[15]),
      feedbackTotal: Number(r[16]) || 0,
    })
  } catch {
    return json({ error: 'storage' }, 503)
  }
}
