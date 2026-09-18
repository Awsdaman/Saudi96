import { questionAnswer } from '../game/types'
import type { GameState } from '../game/useGame'
import './Results.css'

interface Props {
  state: GameState
  isRecord: boolean
  onReplay: () => void
  onHome: () => void
}

export function Results({ state, isRecord, onReplay, onHome }: Props) {
  const correct = state.records.filter((r) => r.correct).length
  const total = state.records.filter((r) => !r.unavailable).length
  const unavailable = state.records.length - total
  const pct = total ? Math.round((correct / total) * 100) : 0

  const verdict =
    total === 0 ? 'لا توجد إجابات محتسبة' :
    pct >= 90 ? 'معرفة استثنائية' :
    pct >= 70 ? 'أداء ممتاز' :
    pct >= 50 ? 'أداء جيد' :
    pct >= 30 ? 'تحتاج مراجعة' : 'بداية الطريق'

  return (
    <div className="results">
      <header className="results-head">
        <p className="results-round">{state.title}</p>
        <div className="results-orbit">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle className="orbit-track" cx="50" cy="50" r="46" pathLength="100" />
            <circle
              className="orbit-value"
              cx="50" cy="50" r="46" pathLength="100"
              style={{ strokeDasharray: `${pct} 100` }}
            />
          </svg>
          <h1 className="results-score ltr">{state.score.toLocaleString('en-US')}</h1>
        </div>
        <p className="results-verdict">{verdict}</p>
        {isRecord && <p className="results-record">رقم قياسي جديد</p>}
      </header>

      {/* ثالث مواضع السدو وآخرها */}
      <div className="sadu results-rule" />

      <div className="stats">
        <div className="stat">
          <span className="stat-value">
            <span className="ltr">{correct}</span> / <span className="ltr">{total}</span>
          </span>
          <span className="stat-label">إجابات صحيحة</span>
        </div>
        <div className="stat">
          <span className="stat-value ltr">{pct}%</span>
          <span className="stat-label">نسبة الدقة</span>
        </div>
        <div className="stat">
          <span className="stat-value ltr">{state.bestStreak}</span>
          <span className="stat-label">أطول سلسلة</span>
        </div>
      </div>

      <ol className="review">
        {state.records.map((r, i) => (
          <li key={r.question.id} className={`review-row ${r.correct ? 'is-correct' : 'is-wrong'}`}>
            <span className="review-num ltr">{i + 1}</span>
            <span className="review-body">
              <span className="review-q">{r.question.prompt}</span>
              <span className="review-a">{questionAnswer(r.question)}</span>
              {r.question.kind === 'song' && <span className="review-q">
                {r.question.song.artistAr && <>{r.question.song.artistAr} · </>}
                {r.unavailable ? 'تُجاوزت بلا عقوبة' : r.correct ? <>عرفتها في المرحلة <span className="ltr">{r.songPhase}</span> · <span className="ltr">{r.points}</span> نقطة</> : 'لم تعرفها'}
              </span>}
            </span>
            <span className="review-mark" aria-hidden="true">{r.unavailable ? '—' : r.correct ? '✓' : '✕'}</span>
          </li>
        ))}
      </ol>
      {unavailable > 0 && <p className="results-round">استُبعدت <span className="ltr">{unavailable}</span> أغنية من نسبة الدقة لتعذّر تشغيلها.</p>}

      <div className="results-actions">
        <button className="btn btn-primary" onClick={onReplay}>جولة أخرى</button>
        <button className="btn btn-quiet" onClick={onHome}>القائمة الرئيسية</button>
      </div>
    </div>
  )
}
