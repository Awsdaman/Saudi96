import type { CSSProperties } from 'react'
import { useState } from 'react'
import { RoundIcon } from '../components/RoundIcon'
import { ROUNDS, poolFor } from '../game/content'
import { DEFAULT_ICON_TILE, iconTileUrl, ROUND_THEME, tapestryUrl } from '../game/roundTheme'
import { loadBest } from '../game/storage'
import type { RoundId } from '../game/types'
import './Home.css'

interface Props {
  onPick: (id: RoundId) => void
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

export function Home({ onPick, onCustom, onCredits }: Props) {
  // معاينة السيف الكبير: الصف الذي تحت المؤشر أو التركيز، أو الافتراضي إن لم يكن شيء
  const [previewId, setPreviewId] = useState<RoundId | null>(null)
  const heroSrc = (previewId && iconTileUrl(previewId)) || DEFAULT_ICON_TILE
  // إطار المربّع الكبير يستعير لون الجولة المعاينة — بلا معاينةٍ يبقى محايداً
  const previewTheme = previewId ? ROUND_THEME[previewId] : undefined
  const heroStyle = previewTheme
    ? ({ '--rc-night': previewTheme.night, '--rc-stage': previewTheme.stage } as CSSProperties)
    : undefined

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
      ? ({
          '--rc-night': theme.night,
          '--rc-stage': theme.stage,
          ...(carpet ? { '--rc-carpet': `url(${carpet})` } : {}),
        } as CSSProperties)
      : undefined
    const preview = () => !empty && r.key !== 'custom' && setPreviewId(r.key as RoundId)
    const clearPreview = () => setPreviewId(null)
    return (
      <button
        key={r.key}
        className={`topic-card ${empty ? 'is-empty' : ''}`}
        style={style}
        onClick={() => (empty ? undefined : r.key === 'custom' ? onCustom() : onPick(r.key as RoundId))}
        onMouseEnter={preview}
        onMouseLeave={clearPreview}
        onFocus={preview}
        onBlur={clearPreview}
        disabled={empty}
      >
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
      <div className="home-top">
        <header className="home-head">
          <h1 className="home-title">هل تعرف السعودية؟</h1>
        </header>

        <div className="home-hero" style={heroStyle} aria-hidden="true">
          {/* إعادة تصيير الصورة بمفتاحٍ جديد تُشغِّل حركة الدخول عند كل تبديل */}
          <img key={heroSrc} className="home-hero-img" src={heroSrc} alt="" />
        </div>
      </div>

      <nav className="topic-grid">{rows.map(renderRow)}</nav>

      {/* الصور من ويكيميديا وأكثرها تشترط نسبها إلى أصحابها،
          فيلزم أن يكون إلى القائمة سبيلٌ من حيث تُعرض */}
      <button className="home-credits stage-hide" onClick={onCredits}>
        مصادر الصور
      </button>
    </div>
  )
}
