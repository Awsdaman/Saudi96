import type { Entity } from '../game/types'
import './Results.css'

interface Props {
  known: number
  total: number
  missed: Entity[]
  isRecord: boolean
  onReplay: () => void
  onHome: () => void
}

export function LogoResults({ known, total, missed, isRecord, onReplay, onHome }: Props) {
  const pct = total ? Math.round((known / total) * 100) : 0
  const verdict =
    pct >= 90 ? 'معرفة استثنائية' :
    pct >= 70 ? 'أداء ممتاز' :
    pct >= 50 ? 'أداء جيد' :
    pct >= 30 ? 'تحتاج مراجعة' : 'بداية الطريق'

  return (
    <div className="results">
      <header className="results-head">
        <p className="results-round">خمّن الشعار</p>
        <h1 className="results-score">
          <span className="ltr">{known}</span>
          <span className="results-of"> / </span>
          <span className="ltr">{total}</span>
        </h1>
        <p className="results-verdict">{verdict}</p>
        {isRecord && <p className="results-record">رقم قياسي جديد</p>}
      </header>

      {missed.length > 0 && (
        <section className="missed">
          <h2 className="missed-title">شعارات تستحق المراجعة</h2>
          <ul className="missed-list">
            {missed.map((e) => (
              <li key={e.id} className="missed-row">
                <span className="missed-thumb">
                  <img src={e.logo ?? e.lockup} alt="" />
                </span>
                <span className="missed-name">{e.nameAr}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="results-actions">
        <button className="btn btn-primary" onClick={onReplay}>جولة أخرى</button>
        <button className="btn btn-quiet" onClick={onHome}>القائمة الرئيسية</button>
      </div>
    </div>
  )
}
