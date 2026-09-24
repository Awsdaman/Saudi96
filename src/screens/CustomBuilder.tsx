import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { availableFromSources, poolSources, poolFromSources } from '../game/content'
import { DEFAULT_ICON_TILE } from '../game/roundTheme'
import { SOURCE_THEME } from '../game/sourceTheme'
import type { PlayMode, Question } from '../game/types'
import { loadLength, loadPlayMode, savePlayMode, saveLength } from '../game/storage'
import './CustomBuilder.css'

interface Props {
  onStart: (pool: Question[], count: number, sourceIds: string[], mode: PlayMode) => void
  onBack: () => void
}

const LENGTHS = [10, 15, 20, 30]

export function CustomBuilder({ onStart, onBack }: Props) {
  const sources = useMemo(() => poolSources(), [])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  // معاينة الرقعة الكبيرة: المصدر تحت المؤشر، أو آخر ما اختير إن لم
  // يكن شيء تحت المؤشر — نفس فكرة previewId/selectedId في Home.tsx،
  // لكن هنا اختيارٌ متعدّد فلا «مختار واحد» ثابت يُعاد إليه.
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [length, setLength] = useState(() => loadLength('custom') ?? 15)
  // العدد المخصَّص: اللاعب يكتب رقمه بدل الاختيار من القائمة الجاهزة.
  // نصّ الحقل منفصلٌ عن length نفسه — انظر التعليق نفسه في Home.tsx.
  const [customMode, setCustomMode] = useState(() => !LENGTHS.includes(loadLength('custom') ?? 15))
  const [customText, setCustomText] = useState(() => String(loadLength('custom') ?? 15))
  // نمط اللعب (سهل/متوسط/صعب) نفسه المستخدَم في الرئيسية — انظر التعليق في storage.ts
  const [playMode, setPlayMode] = useState(loadPlayMode)

  function chooseMode(mode: PlayMode) {
    setPlayMode(mode)
    savePlayMode(mode)
  }

  const available = useMemo(() => availableFromSources(sources, [...picked]), [sources, picked])
  const groups = ['جولات', 'فئات الشخصيات', 'تصنيفات معرفية'] as const
  const maxAvailable = Math.max(1, available)

  const lastPicked = [...picked][picked.size - 1] ?? null
  const shownId = previewId ?? lastPicked
  const heroTheme = shownId ? SOURCE_THEME[shownId] : undefined
  const heroSrc = heroTheme?.image ?? DEFAULT_ICON_TILE
  const heroStyle = heroTheme ? ({ '--rc': heroTheme.color } as CSSProperties) : undefined
  const shownSource = shownId ? sources.find((s) => s.id === shownId) : null

  function pickCustom() {
    setCustomMode(true)
    setCustomText(String(length))
  }

  function editCustomLength(raw: string) {
    setCustomText(raw)
    if (raw.trim() === '') return
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    setLength(Math.max(1, Math.min(maxAvailable, Math.trunc(n))))
  }

  // يقرأ القيمة المعروضة فعلياً (raw) لا length من الحالة — انظر
  // التعليق نفسه على commitCustomCount في Home.tsx
  function commitCustomLength(raw: string) {
    const n = Number(raw)
    const clamped = raw.trim() !== '' && Number.isFinite(n)
      ? Math.max(1, Math.min(maxAvailable, Math.trunc(n)))
      : length
    setLength(clamped)
    setCustomText(String(clamped))
  }

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setPicked(new Set(sources.map((s) => s.id)))
  }

  // لا يمكن طلب أسئلة أكثر مما توفّره المصادر المختارة
  const realLength = Math.min(length, available)
  const canStart = available > 0

  return (
    <div className="builder">
      <header className="builder-head">
        <h1 className="builder-title">لعبتي</h1>
        <p className="builder-sub">اختر ما تبغى، ونمزجها لك في جولة واحدة</p>
      </header>

      <div className="builder-body">
        <aside className="builder-hero-panel">
          <div className="builder-hero" style={heroStyle} aria-hidden="true">
            {/* إعادة تصيير الصورة بمفتاحٍ جديد تُشغِّل حركة الدخول عند كل تبديل */}
            <img key={heroSrc} className="builder-hero-img" src={heroSrc} alt="" />
          </div>
          {shownSource ? (
            <>
              <h2 className="builder-hero-title">{shownSource.label}</h2>
              <p className="builder-hero-sub">
                <span className="ltr">{shownSource.count}</span> سؤال متاح
              </p>
            </>
          ) : (
            <>
              <h2 className="builder-hero-title">جهّز جولتك</h2>
              <p className="builder-hero-sub">مرّر فوق أي تصنيف لمعاينته، واختر ما يعجبك</p>
            </>
          )}
        </aside>

        <div className="builder-sources">
          {groups.map((g) => (
            <section key={g} className="builder-group">
              <h2 className="builder-group-title">{g}</h2>
              <div className="source-grid">
                {sources.filter((s) => s.group === g).map((s) => {
                  const theme = SOURCE_THEME[s.id]
                  const style = theme ? ({ '--rc': theme.color } as CSSProperties) : undefined
                  const isOn = picked.has(s.id)
                  return (
                    <button
                      key={s.id}
                      className={`source-card ${isOn ? 'is-on' : ''}`}
                      style={style}
                      onClick={() => toggle(s.id)}
                      onMouseEnter={() => setPreviewId(s.id)}
                      onMouseLeave={() => setPreviewId(null)}
                      onFocus={() => setPreviewId(s.id)}
                      onBlur={() => setPreviewId(null)}
                      aria-pressed={isOn}
                      disabled={s.count === 0}
                    >
                      {isOn && <span className="source-check" aria-hidden="true">✓</span>}
                      <span className="source-label">{s.label}</span>
                      <span className="source-count ltr">{s.count}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <section className="builder-group">
        <h2 className="builder-group-title">عدد الأسئلة</h2>
        <div className="mode-chips mode-chips-row">
          {LENGTHS.map((n) => (
            <button
              key={n}
              className={`mode-chip ${!customMode && length === n ? 'is-on' : ''}`}
              onClick={() => { setCustomMode(false); setLength(n) }}
              aria-pressed={!customMode && length === n}
            >
              <span className="mode-dot" aria-hidden="true" />
              <span className="mode-label"><span className="ltr">{n}</span> سؤال</span>
            </button>
          ))}

          {customMode ? (
            <div className="mode-chip mode-chip-custom is-on">
              <span className="mode-dot" aria-hidden="true" />
              <label className="mode-label" htmlFor="custom-count">عدد الأسئلة</label>
              <input
                id="custom-count"
                type="number"
                className="mode-count-input ltr"
                min={1}
                max={maxAvailable}
                value={customText}
                onChange={(e) => editCustomLength(e.target.value)}
                onBlur={(e) => commitCustomLength(e.target.value)}
                // Enter يؤكّد الرقم بدل الانتظار حتى يُغادر الحقل
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                autoFocus
              />
            </div>
          ) : (
            <button className="mode-chip" onClick={pickCustom}>
              <span className="mode-dot" aria-hidden="true" />
              <span className="mode-label">اختر العدد المناسب لك</span>
            </button>
          )}
        </div>
      </section>

      <section className="builder-group">
        <h2 className="builder-group-title">نمط اللعب</h2>
        <div className="mode-chips">
          <button
            className={`mode-chip ${playMode === 'easy' ? 'is-on' : ''}`}
            onClick={() => chooseMode('easy')}
            aria-pressed={playMode === 'easy'}
          >
            <span className="mode-dot" aria-hidden="true" />
            <span className="mode-label">
              سهل
              <small className="mode-sub">الخيارات ظاهرة دائماً</small>
            </span>
          </button>
          <button
            className={`mode-chip ${playMode === 'medium' ? 'is-on' : ''}`}
            onClick={() => chooseMode('medium')}
            aria-pressed={playMode === 'medium'}
          >
            <span className="mode-dot" aria-hidden="true" />
            <span className="mode-label">
              متوسط
              <small className="mode-sub">الخيارات مخفية حتى تُطلَب — طلبها ينصّف النقاط</small>
            </span>
          </button>
          <button
            className={`mode-chip ${playMode === 'hard' ? 'is-on' : ''}`}
            onClick={() => chooseMode('hard')}
            aria-pressed={playMode === 'hard'}
          >
            <span className="mode-dot" aria-hidden="true" />
            <span className="mode-label">
              صعب
              <small className="mode-sub">خياراتٌ أعسر ومخفية — طلبها ينصّف النقاط</small>
            </span>
          </button>
        </div>
      </section>

      <footer className="builder-foot">
        <p className="builder-status">
          {available === 0 ? (
            'اختر مصدراً واحداً على الأقل'
          ) : (
            <>
              متاح <span className="ltr">{available}</span> سؤال · ستلعب{' '}
              <span className="ltr">{realLength}</span>
            </>
          )}
        </p>
        <div className="builder-actions">
          <button
            className="btn btn-primary"
            disabled={!canStart}
            onClick={() => { saveLength('custom', realLength); onStart(poolFromSources([...picked]), realLength, [...picked], playMode) }}
          >
            ابدأ
          </button>
          <button className="btn btn-quiet" onClick={selectAll}>اختر الكل</button>
          <button className="btn btn-quiet" onClick={onBack}>رجوع</button>
        </div>
      </footer>
    </div>
  )
}
