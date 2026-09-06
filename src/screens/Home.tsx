import type { CSSProperties } from 'react'
import { useState } from 'react'
import { HowToModal } from '../components/HowToModal'
import { RoundIcon } from '../components/RoundIcon'
import { ROUNDS, poolFor } from '../game/content'
import { DEFAULT_ICON_TILE, iconTileUrl, ROUND_THEME, tapestryUrl } from '../game/roundTheme'
import { loadBest, loadLength, saveLength } from '../game/storage'
import type { RoundId } from '../game/types'
import './Home.css'

interface Props {
  onStart: (id: RoundId, count: number) => void
  onCustom: () => void
  onCredits: () => void
}

interface Row {
  key: RoundId | 'custom'
  title: string
  subtitle: string
  count: number | null
  best: number
}

const CHOICES = [5, 10, 15, 20]

export function Home({ onStart, onCustom, onCredits }: Props) {
  // معاينة السيف الكبير: الجولة تحت المؤشر، أو المختارة إن لم يكن شيء تحته
  const [previewId, setPreviewId] = useState<RoundId | null>(null)
  const [selectedId, setSelectedId] = useState<RoundId | null>(null)
  const [count, setCount] = useState(0)
  const [howTo, setHowTo] = useState(false)

  const shownId = previewId ?? selectedId
  const heroSrc = (shownId && iconTileUrl(shownId)) || DEFAULT_ICON_TILE
  const heroTheme = shownId ? ROUND_THEME[shownId] : undefined
  const heroStyle = heroTheme ? ({ '--rc': heroTheme.color } as CSSProperties) : undefined

  const meta = selectedId ? ROUNDS.find((r) => r.id === selectedId)! : null
  const poolSize = selectedId ? poolFor(selectedId).length : 0
  const options = CHOICES.filter((n) => n < poolSize)

  // اختيار جولةٍ من الشبكة يفتح لوحة الإعداد بجانبها فوراً — بلا صفحةٍ
  // جديدة؛ عدد الأسئلة يبدأ من آخر ما اختاره اللاعب لهذه الجولة تحديداً
  function selectRound(id: RoundId) {
    setSelectedId(id)
    const size = poolFor(id).length
    const opts = CHOICES.filter((n) => n < size)
    const saved = loadLength(id)
    if (saved && (saved === size || opts.includes(saved))) setCount(saved)
    else setCount(opts.includes(10) ? 10 : (opts[0] ?? size))
  }

  function confirm() {
    if (!selectedId) return
    saveLength(selectedId, count)
    onStart(selectedId, Math.min(count, poolSize))
  }

  const rows: Row[] = ROUNDS.map((r) => ({
    key: r.id,
    title: r.title,
    subtitle: r.subtitle,
    count: poolFor(r.id).length,
    best: loadBest(r.id),
  }))

  // الصفّ الأخير: يبني اللاعب جولته بنفسه من تصنيفات البنك
  rows.push({
    key: 'custom',
    title: 'لعبتي',
    subtitle: 'اختر التصنيفات وابنِ جولتك',
    count: null,
    best: loadBest('custom'),
  })

  const renderRow = (r: Row) => {
    const empty = r.count === 0
    // كل جولةٍ حقيقية تستعير لوناً ونسيجاً من قيم هوية اليوم الوطني؛
    // «لعبتي» تبقى بلا هوية مستعارة فلا مقياس CSS يُضبط لها.
    const theme = r.key === 'custom' ? undefined : ROUND_THEME[r.key as RoundId]
    const carpet = theme ? tapestryUrl(r.key as RoundId) : null
    const style = theme
      ? ({ '--rc': theme.color, ...(carpet ? { '--rc-carpet': `url(${carpet})` } : {}) } as CSSProperties)
      : undefined
    const isSelected = r.key === selectedId
    const preview = () => !empty && r.key !== 'custom' && setPreviewId(r.key as RoundId)
    const clearPreview = () => setPreviewId(null)
    return (
      <button
        key={r.key}
        className={`topic-card ${empty ? 'is-empty' : ''} ${isSelected ? 'is-selected' : ''}`}
        style={style}
        onClick={() => (empty ? undefined : r.key === 'custom' ? onCustom() : selectRound(r.key as RoundId))}
        onMouseEnter={preview}
        onMouseLeave={clearPreview}
        onFocus={preview}
        onBlur={clearPreview}
        disabled={empty}
      >
        {isSelected && <span className="topic-check" aria-hidden="true">✓</span>}
        <span className="topic-card-top">
          <span className="topic-icon"><RoundIcon round={r.key} /></span>
          <span className="topic-count">
            {empty ? (
              <span className="topic-warn">قريباً</span>
            ) : r.count === null ? (
              'مخصّصة'
            ) : (
              <><span className="ltr">{r.count}</span> سؤال</>
            )}
          </span>
        </span>
        <span className="topic-title">{r.title}</span>
        <span className="topic-desc">{r.subtitle}</span>
        {r.best > 0 && (
          <span className="topic-best">أفضل <span className="ltr">{r.best.toLocaleString('en-US')}</span></span>
        )}
      </button>
    )
  }

  return (
    <div className="home">
      <header className="home-head">
        <h1 className="home-title">هل تعرف السعودية؟</h1>
        <p className="home-lede">جولة خفيفة من الأسئلة عن المملكة وثقافتها. اختر تصنيفاً وابدأ.</p>
      </header>

      <div className="home-body">
        <aside className="setup-panel">
          <div className="setup-hero" style={heroStyle} aria-hidden="true">
            {/* إعادة تصيير الصورة بمفتاحٍ جديد تُشغِّل حركة الدخول عند كل تبديل */}
            <img key={heroSrc} className="setup-hero-img" src={heroSrc} alt="" />
          </div>

          {meta ? (
            <>
              <h2 className="setup-title">{meta.title}</h2>
              <p className="setup-sub">{meta.subtitle}</p>

              <div className="setup-block">
                <h3 className="setup-h3">طول الجولة</h3>
                <div className="setup-chips">
                  {options.map((n) => (
                    <button
                      key={n}
                      className={`setup-chip ${count === n ? 'is-on' : ''}`}
                      onClick={() => setCount(n)}
                      aria-pressed={count === n}
                    >
                      <span className="chip-dot" aria-hidden="true" />
                      <span className="chip-label"><span className="ltr">{n}</span> سؤال</span>
                    </button>
                  ))}
                  <button
                    className={`setup-chip ${count === poolSize ? 'is-on' : ''}`}
                    onClick={() => setCount(poolSize)}
                    aria-pressed={count === poolSize}
                  >
                    <span className="chip-dot" aria-hidden="true" />
                    <span className="chip-label">الكل (<span className="ltr">{poolSize}</span>)</span>
                  </button>
                </div>
              </div>

              <button className="btn btn-primary setup-start" onClick={confirm}>ابدأ الجولة</button>
              <div className="setup-foot">
                <button className="btn-link" onClick={() => setSelectedId(null)}>تغيير الموضوع</button>
                <button className="btn-link" onClick={() => setHowTo(true)}>كيف تلعب؟</button>
              </div>
            </>
          ) : (
            <>
              <h2 className="setup-title">جهّز جولتك</h2>
              <p className="setup-sub">اختر تصنيفاً من القائمة، ثم حدّد عدد الأسئلة وابدأ.</p>
            </>
          )}
        </aside>

        <nav className="topic-grid">{rows.map(renderRow)}</nav>
      </div>

      {/* الصور من ويكيميديا وأكثرها تشترط نسبها إلى أصحابها،
          فيلزم أن يكون إلى القائمة سبيلٌ من حيث تُعرض */}
      <button className="home-credits" onClick={onCredits}>
        مصادر الصور
      </button>

      {howTo && meta && <HowToModal title={meta.title} steps={meta.howTo} onClose={() => setHowTo(false)} />}
    </div>
  )
}
