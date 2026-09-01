import { RoundIcon } from '../components/RoundIcon'
import { ROUNDS, poolFor } from '../game/content'
import { loadBest } from '../game/storage'
import type { RoundId } from '../game/types'
import './Home.css'

interface Props {
  onPick: (id: RoundId) => void
  onCustom: () => void
}

interface Tile {
  key: RoundId | 'custom'
  title: string
  subtitle: string
  count: number | null
  best: number
}

export function Home({ onPick, onCustom }: Props) {
  const tiles: Tile[] = ROUNDS.map((r) => ({
    key: r.id,
    title: r.title,
    subtitle: r.subtitle,
    count: poolFor(r.id).length,
    best: loadBest(r.id),
  }))

  // البطاقة السادسة: يبني اللاعب جولته بنفسه من تصنيفات البنك
  tiles.push({
    key: 'custom',
    title: 'لعبتي',
    subtitle: 'اختر التصنيفات وابنِ جولتك',
    count: null,
    best: loadBest('custom'),
  })

  const renderTile = (t: Tile) => {
    const empty = t.count === 0
    return (
      <button
        key={t.key}
        className={`tile ${empty ? 'is-empty' : ''}`}
        onClick={() => (empty ? undefined : t.key === 'custom' ? onCustom() : onPick(t.key as RoundId))}
        disabled={empty}
      >
        <span className="tile-icon">
          <RoundIcon round={t.key} />
        </span>
        <span className="tile-title">{t.title}</span>
        <span className="tile-sub">{t.subtitle}</span>
        <span className="tile-meta">
          {empty ? (
            <span className="tile-warn">بانتظار جلب الصور</span>
          ) : t.count === null ? (
            t.best > 0 ? (
              <>أفضل نتيجة <span className="ltr">{t.best.toLocaleString('en-US')}</span></>
            ) : (
              'ابدأ من هنا'
            )
          ) : (
            <>
              <span className="ltr">{t.count}</span> سؤال
              {t.best > 0 && (
                <> · أفضل <span className="ltr">{t.best.toLocaleString('en-US')}</span></>
              )}
            </>
          )}
        </span>
      </button>
    )
  }

  return (
    <div className="home">
      <header className="home-head">
        <h1 className="home-title">هل تعرف السعودية؟</h1>
        <p className="home-sub">خمّن الشعارات والمعالم والمناطق والأطباق</p>
      </header>

      <div className="tile-grid">{tiles.map(renderTile)}</div>
    </div>
  )
}
