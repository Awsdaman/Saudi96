import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ROUNDS, logoCards, poolFor } from '../game/content'
import { questionAnswer } from '../game/types'
import { AUTO_REFRESH_MS, shouldRefreshOnReturn } from './refresh'
import './AdminDashboard.css'

/**
 * لوحة الإدارة — تُعرض بدل اللعبة حين يُفتح الموقع من عنوان الإدارة
 * (انظر isAdminHost). البيانات كلّها من api/events.ts، ولا تصل إلا
 * بكلمة المرور؛ هذه الواجهة نفسها ليست سرّاً ولا تحمي شيئاً بذاتها.
 */

interface Stats {
  generatedAt: string
  totals: { visitors: number; visits: number; roundsStarted: number; roundsCompleted: number }
  days: { date: string; visitors: number; visits: number; rounds: number }[]
  rounds: { id: string; started: number; completed: number; answered: number; right: number; revealed?: number }[]
  modes: Record<string, number>
  play: Record<string, number>
  avgLength: number
  questions: { id: string; seen: number; wrong: number }[]
  questionsTracked: number
  /** الأحدث أولاً — قد يغيب عن ردٍّ من نسخة خادمٍ أقدم */
  feedback?: { text: string; at: string }[]
  feedbackTotal?: number
}

type Result = { ok: true; stats: Stats } | { ok: false; status: number; message: string }

const PW_KEY = 'saudiknowledge.adminPw'

const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)

function errorText(status: number, code?: string): string {
  if (status === 401) return 'كلمة المرور غير صحيحة.'
  if (status === 429) return 'محاولاتٌ خاطئة كثيرة من هذا الجهاز — انتظر ربع ساعة ثم أعد المحاولة.'
  if (code === 'admin-not-configured') return 'لم تُضبط كلمة مرور الإدارة بعد: أضف ADMIN_PASSWORD في إعدادات المشروع على فيرسل ثم أعد النشر.'
  if (code === 'storage') return 'قاعدة البيانات غير متصلة: اربط Upstash Redis بالمشروع من تبويب Storage في فيرسل ثم أعد النشر.'
  return 'تعذّر الاتصال بالخادم. تحقّق من الاتصال وأعد المحاولة.'
}

async function fetchStats(password: string): Promise<Result> {
  try {
    const res = await fetch('/api/events', { headers: { 'x-admin-password': password }, cache: 'no-store' })
    if (res.ok) return { ok: true, stats: (await res.json()) as Stats }
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    return { ok: false, status: res.status, message: errorText(res.status, body.error) }
  } catch {
    return { ok: false, status: 0, message: errorText(0) }
  }
}

function readSaved(): string | null {
  try { return sessionStorage.getItem(PW_KEY) } catch { return null }
}
function savePw(pw: string | null) {
  try {
    if (pw) sessionStorage.setItem(PW_KEY, pw)
    else sessionStorage.removeItem(PW_KEY)
  } catch {
    // بلا تخزين جلسة: تُطلب كلمة المرور بعد كل تحديثٍ للصفحة، وهذا مقبول
  }
}

export function AdminDashboard() {
  const [password, setPassword] = useState<string | null>(readSaved)
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.title = 'لوحة الإدارة — هل تعرف السعودية؟'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  const lastLoadedAt = useRef(0)
  const load = useCallback(async (pw: string) => {
    setLoading(true)
    const result = await fetchStats(pw)
    setLoading(false)
    if (result.ok) {
      lastLoadedAt.current = Date.now()
      setStats(result.stats)
      setError(null)
      setPassword(pw)
      savePw(pw)
      return
    }
    setError(result.message)
    if (result.status === 401 || result.status === 429) {
      setStats(null)
      setPassword(null)
      savePw(null)
    }
  }, [])

  // كلمة مرورٍ محفوظة من الجلسة نفسها: تُجرَّب مرّةً عند الفتح
  const initialPw = useRef(password)
  useEffect(() => {
    if (initialPw.current) void load(initialPw.current)
  }, [load])

  // كل ساعة والصفحة ظاهرة، وفور العودة إليها إن قدمت أرقامها — انظر refresh.ts
  const hasStats = stats !== null
  useEffect(() => {
    if (!hasStats || !password) return
    const id = window.setInterval(() => { if (!document.hidden) void load(password) }, AUTO_REFRESH_MS)
    const onReturn = () => {
      if (!document.hidden && shouldRefreshOnReturn(lastLoadedAt.current, Date.now())) void load(password)
    }
    document.addEventListener('visibilitychange', onReturn)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onReturn)
    }
  }, [hasStats, password, load])

  function logout() {
    savePw(null)
    setPassword(null)
    setStats(null)
    setError(null)
  }

  if (!stats) {
    return <LoginScreen error={error} loading={loading} onSubmit={(pw) => void load(pw)} />
  }
  return (
    <Dashboard
      stats={stats}
      loading={loading}
      error={error}
      onRefresh={() => password && void load(password)}
      onLogout={logout}
    />
  )
}

function LoginScreen({ error, loading, onSubmit }: { error: string | null; loading: boolean; onSubmit: (pw: string) => void }) {
  const [value, setValue] = useState('')
  function submit(e: FormEvent) {
    e.preventDefault()
    if (value) onSubmit(value)
  }
  return (
    <div className="admin admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <h1 className="admin-title">لوحة الإدارة</h1>
        <p className="admin-muted">هل تعرف السعودية؟ — إحصاءات اللعب</p>
        <label className="admin-field">
          <span>كلمة المرور</span>
          <input
            type="password"
            autoComplete="current-password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            dir="ltr"
          />
        </label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button className="btn btn-primary admin-login-btn" type="submit" disabled={loading}>
          {loading ? 'جارٍ التحقّق…' : 'دخول'}
        </button>
      </form>
    </div>
  )
}

const ROUND_LABEL: Record<string, string> = {
  ...Object.fromEntries(ROUNDS.map((r) => [r.id, r.title])),
  custom: 'لعبتي',
  'logos-cards': 'خمّن الشعار — بطاقات',
}
const MODE_LABEL: Record<string, string> = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }

interface QuestionInfo { prompt: string; answer: string; round: string }

/** نصّ كل سؤالٍ بمعرّفه — من بنك الأسئلة نفسه المضمَّن في اللعبة */
function useQuestionIndex(): Map<string, QuestionInfo> {
  return useMemo(() => {
    const map = new Map<string, QuestionInfo>()
    for (const r of ROUNDS) {
      for (const q of poolFor(r.id)) map.set(q.id, { prompt: q.prompt, answer: questionAnswer(q), round: q.round })
    }
    for (const e of logoCards()) map.set(`card_${e.id}`, { prompt: 'بطاقة شعار', answer: e.nameAr, round: 'logos-cards' })
    return map
  }, [])
}

function Dashboard({ stats, loading, error, onRefresh, onLogout }: {
  stats: Stats; loading: boolean; error: string | null; onRefresh: () => void; onLogout: () => void
}) {
  const questionIndex = useQuestionIndex()
  const { totals } = stats
  const today = stats.days.at(-1)
  // بنظام ٢٤ ساعة: علامة «م/ص» العربية كانت تنقلب داخل الرقم المعزول باتّجاهه
  const updated = new Date(stats.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

  const popularity = [...stats.rounds]
    .filter((r) => r.started > 0)
    .sort((a, b) => b.started - a.started)
    .map((r) => ({
      key: r.id, label: ROUND_LABEL[r.id] ?? r.id, value: r.started, display: fmt(r.started),
      detail: <>أُكملت <Num>{fmt(r.completed)}</Num> · <Num>{pct(r.completed, r.started)}%</Num></>,
    }))

  const accuracy = stats.rounds
    .filter((r) => r.answered > 0 && r.id !== 'custom')
    .map((r) => ({ r, p: pct(r.right, r.answered) }))
    .sort((a, b) => a.p - b.p)
    .map(({ r, p }) => ({
      key: r.id, label: ROUND_LABEL[r.id] ?? r.id, value: p, display: `${p}%`,
      detail: (
        <>
          <Num>{fmt(r.right)}</Num> صحيحة من <Num>{fmt(r.answered)}</Num>
          {!!r.revealed && <> · كشف المستضيف <Num>{fmt(r.revealed)}</Num> (خارج النسبة)</>}
        </>
      ),
    }))

  const modeTotal = Object.values(stats.modes).reduce((s, n) => s + n, 0)
  const modes = ['easy', 'medium', 'hard'].map((m) => ({
    key: m, label: MODE_LABEL[m], value: stats.modes[m] ?? 0,
    display: `${pct(stats.modes[m] ?? 0, modeTotal)}%`, detail: <><Num>{fmt(stats.modes[m] ?? 0)}</Num> جولة</>,
  }))

  return (
    <div className={`admin ${loading ? 'is-refreshing' : ''}`}>
      <header className="admin-head">
        <div>
          <h1 className="admin-title">لوحة الإدارة</h1>
          <p className="admin-muted">آخر تحديث <span className="ltr">{updated}</span> · يتجدّد كلما عدت إلى الصفحة، وكل ساعة إن بقيت مفتوحة، وفوراً بزرّ «تحديث» · التواريخ بتوقيت الرياض</p>
        </div>
        <div className="admin-actions">
          <button className="btn btn-quiet" onClick={onRefresh} disabled={loading}>{loading ? 'جارٍ التحديث…' : 'تحديث'}</button>
          <button className="btn btn-quiet" onClick={onLogout}>خروج</button>
        </div>
      </header>

      {error && <p className="admin-error" role="alert">{error}</p>}

      <section className="admin-kpis" aria-label="الأرقام الرئيسية">
        <div className="admin-card admin-hero">
          <span className="admin-label">أجهزة فريدة فتحت اللعبة</span>
          <span className="admin-hero-value ltr">{fmt(totals.visitors)}</span>
          <span className="admin-muted admin-small">
            كل متصفّحٍ يُعدّ مرّة: مجموعةٌ تلعب على شاشةٍ واحدة تُعدّ جهازاً واحداً، والشخص على جهازين يُعدّ جهازين.
            لقياس اللعب نفسه انظر «جولات بدأت».
          </span>
        </div>
        <StatTile label="أجهزة اليوم" value={fmt(today?.visitors ?? 0)} />
        <StatTile label="إجمالي الزيارات" value={fmt(totals.visits)} />
        <StatTile label="جولات بدأت" value={fmt(totals.roundsStarted)} />
        <StatTile label="نسبة إكمال الجولات" value={`${pct(totals.roundsCompleted, totals.roundsStarted)}%`} />
        <StatTile label="متوسط طول الجولة" value={stats.avgLength ? stats.avgLength.toFixed(1) : '0'} unit="سؤال" />
      </section>

      <FeedbackList items={stats.feedback ?? []} total={stats.feedbackTotal ?? 0} />

      <section className="admin-card">
        <h2 className="admin-h2">الأجهزة الفريدة يومياً</h2>
        <p className="admin-muted admin-small">آخر 30 يوماً — مرّر فوق أي يوم لتفاصيله</p>
        <DailyChart days={stats.days} />
      </section>

      <div className="admin-grid">
        <section className="admin-card">
          <h2 className="admin-h2">أكثر التصنيفات لعباً</h2>
          <p className="admin-muted admin-small">عدد الجولات التي بدأت في كل تصنيف</p>
          <BarList rows={popularity} empty="لم تُلعب أي جولة بعد." />
        </section>
        <section className="admin-card">
          <h2 className="admin-h2">نسبة الإجابات الصحيحة</h2>
          <p className="admin-muted admin-small">لكل تصنيف (حتى داخل «لعبتي») — الأصعب أولاً. إجاباتٌ كشفها المستضيف بنفسه لا تُحسب.</p>
          <BarList rows={accuracy} max={100} empty="لا إجابات مسجّلة بعد." />
        </section>
      </div>

      <section className="admin-card">
        <h2 className="admin-h2">طريقة اللعب</h2>
        <div className="admin-play">
          <div>
            <p className="admin-muted admin-small">نمط اللعب المختار (بلا جولات الأغاني)</p>
            <BarList rows={modes} max={Math.max(1, ...modes.map((m) => m.value))} empty="—" />
          </div>
          <div className="admin-play-tiles">
            <StatTile label="جولات بفريقين" value={fmt(stats.play.teams ?? 0)} />
            <StatTile label="جولات بلا فرق" value={fmt(stats.play.solo ?? 0)} />
            <StatTile label="مع شاشة عرضٍ للجمهور" value={fmt(stats.play.audience ?? 0)} />
            <StatTile label="إجاباتٌ كشفها المستضيف" value={fmt(stats.rounds.reduce((s, r) => s + (r.revealed ?? 0), 0))} />
          </div>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-h2">الأسئلة الأكثر خطأً</h2>
        <p className="admin-muted admin-small">
          تظهر بعد أن يُجاب السؤال <span className="ltr">3</span> مرّات على الأقل · يُتابَع <span className="ltr">{fmt(stats.questionsTracked)}</span> سؤالاً حتى الآن
        </p>
        {stats.questions.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>السؤال</th><th>التصنيف</th><th>أخطأ / أجاب</th><th>نسبة الخطأ</th></tr>
              </thead>
              <tbody>
                {stats.questions.map((q) => {
                  const info = questionIndex.get(q.id)
                  return (
                    <tr key={q.id}>
                      <td>
                        <span className="admin-q">{info?.prompt ?? q.id}</span>
                        {info && <span className="admin-muted admin-small">الإجابة: {info.answer}</span>}
                      </td>
                      <td>{ROUND_LABEL[info?.round ?? ''] ?? '—'}</td>
                      <td className="admin-num"><span className="ltr">{fmt(q.wrong)} / {fmt(q.seen)}</span></td>
                      <td className="admin-num"><span className="ltr">{pct(q.wrong, q.seen)}%</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">لا يوجد بعد سؤالٌ أُجيب ثلاث مرّات.</p>
        )}
      </section>
    </div>
  )
}

/** اقتراحات اللاعبين من زرّ «اقتراح أو إضافة للعبة» — الأحدث أولاً */
function FeedbackList({ items, total }: { items: { text: string; at: string }[]; total: number }) {
  const when = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    // بتوقيت الرياض ونظام ٢٤ ساعة، كبقية تواريخ اللوحة
    return d.toLocaleString('en-GB', {
      timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
  }
  return (
    <section className="admin-card">
      <h2 className="admin-h2">اقتراحات اللاعبين</h2>
      <p className="admin-muted admin-small">
        من زرّ «اقتراح أو إضافة للعبة» في الصفحة الرئيسية · <span className="ltr">{fmt(total)}</span> اقتراحاً
        {total > items.length && <> · تُعرض أحدث <span className="ltr">{fmt(items.length)}</span></>}
      </p>
      {items.length ? (
        <ul className="admin-feedback">
          {items.map((f, i) => (
            <li key={`${f.at}-${i}`} className="admin-feedback-item">
              <p className="admin-feedback-text">{f.text}</p>
              <span className="admin-muted admin-small ltr">{when(f.at)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="admin-empty">لم يصل أي اقتراح بعد.</p>
      )}
    </section>
  )
}

function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="admin-card admin-tile">
      <span className="admin-label">{label}</span>
      <span className="admin-tile-value"><span className="ltr">{value}</span>{unit && <small> {unit}</small>}</span>
    </div>
  )
}

interface BarRow { key: string; label: string; value: number; display: string; detail?: ReactNode }

/** رقمٌ معزولٌ باتّجاهه — وإلا انقلبت «81%» إلى «%81» داخل سطرٍ عربي */
const Num = ({ children }: { children: ReactNode }) => <span className="ltr">{children}</span>

function BarList({ rows, max, empty }: { rows: BarRow[]; max?: number; empty: string }) {
  if (!rows.length) return <p className="admin-empty">{empty}</p>
  const top = max ?? Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="admin-bars">
      {rows.map((r) => (
        <li key={r.key} className="admin-bar-row">
          <span className="admin-bar-head">
            <span className="admin-bar-label">{r.label}</span>
            {r.detail && <span className="admin-bar-detail">{r.detail}</span>}
          </span>
          <span className="admin-bar-track">
            {/* المساحة المحجوزة للرقم تُطرح أولاً، فلا يفيض عن البطاقة عند أطول شريط */}
            <span className="admin-bar-fill" style={{ width: `calc((100% - 4.5rem) * ${r.value / top})` }} />
            <span className="admin-bar-value ltr">{r.display}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** خطوة محورٍ «نظيفة» (1، 2، 5 × 10ⁿ، و2.5 من العشرات فصاعداً) تقسم المدى على أربع */
function niceStep(raw: number): number {
  if (raw <= 1) return 1
  const p = 10 ** Math.floor(Math.log10(raw))
  const steps = p >= 10 ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10]
  return (steps.find((m) => m * p >= raw) ?? 10) * p
}

const shortDate = (iso: string) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`
const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

function DailyChart({ days }: { days: Stats['days'] }) {
  const [active, setActive] = useState<number | null>(null)
  const peak = Math.max(0, ...days.map((d) => d.visitors))
  const step = niceStep(peak / 4)
  const max = step * 4
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step)
  const n = days.length
  const labelled = new Set([0, Math.floor((n - 1) / 2), n - 1])
  const tip = active === null ? null : days[active]
  // التلميح لا يخرج من حافّة الرسم عند الأعمدة الطرفية
  const tipAlign = active === null ? '' : active < 4 ? 'is-start' : active > n - 5 ? 'is-end' : ''

  return (
    <figure className="admin-chart">
      <div className="admin-chart-body" dir="ltr">
        <div className="admin-yaxis" aria-hidden="true">
          {ticks.map((t) => <span key={t} style={{ bottom: `${(t / max) * 100}%` }}>{fmt(t)}</span>)}
        </div>
        <div className="admin-plot" onMouseLeave={() => setActive(null)}>
          {ticks.map((t) => <span key={t} className="admin-gridline" style={{ bottom: `${(t / max) * 100}%` }} />)}
          {days.map((d, i) => (
            <button
              key={d.date}
              type="button"
              className={`admin-col ${active !== null && active !== i ? 'is-dim' : ''}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${longDate(d.date)}: ${d.visitors} جهاز، ${d.visits} زيارة، ${d.rounds} جولة`}
            >
              {d.visitors > 0 && <span className="admin-col-bar" style={{ height: `${(d.visitors / max) * 100}%` }} />}
            </button>
          ))}
          {tip && active !== null && (
            <div className={`admin-tip ${tipAlign}`} style={{ left: `${((active + 0.5) / n) * 100}%` }} dir="rtl" role="status">
              <strong>{longDate(tip.date)}</strong>
              <span><span className="ltr">{fmt(tip.visitors)}</span> جهاز فريد</span>
              <span><span className="ltr">{fmt(tip.visits)}</span> زيارة</span>
              <span><span className="ltr">{fmt(tip.rounds)}</span> جولة</span>
            </div>
          )}
        </div>
        <div className="admin-xaxis" aria-hidden="true">
          {days.map((d, i) => <span key={d.date}>{labelled.has(i) ? shortDate(d.date) : ''}</span>)}
        </div>
      </div>
      <details className="admin-details">
        <summary>عرض كجدول</summary>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>اليوم</th><th>أجهزة فريدة</th><th>زيارات</th><th>جولات</th></tr></thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.date}>
                  <td>{longDate(d.date)}</td>
                  <td className="admin-num"><span className="ltr">{fmt(d.visitors)}</span></td>
                  <td className="admin-num"><span className="ltr">{fmt(d.visits)}</span></td>
                  <td className="admin-num"><span className="ltr">{fmt(d.rounds)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
