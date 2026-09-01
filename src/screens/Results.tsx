import { ROUNDS } from '../game/content'
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
  const total = state.records.length
  const round = ROUNDS.find((r) => r.id === state.roundId)
  const pct = total ? Math.round((correct / total) * 100) : 0

  const verdict =
    pct >= 90 ? 'معرفة استثنائية' :
    pct >= 70 ? 'أداء ممتاز' :
    pct >= 50 ? 'أداء جيد' :
    pct >= 30 ? 'تحتاج مراجعة' : 'بداية الطريق'

  return (
    <div className="results">
      <header className="results-head">
        <p className="results-round">{round?.title}</p>
        <h1 className="results-score ltr">{state.score.toLocaleString('en-US')}</h1>
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
              <span className="review-a">{r.question.options[r.question.answerIndex]}</span>
            </span>
            <span className="review-mark" aria-hidden="true">{r.correct ? '✓' : '✕'}</span>
          </li>
        ))}
      </ol>

      <div className="results-actions">
        <button className="btn btn-primary" onClick={onReplay}>جولة أخرى</button>
        <button className="btn btn-quiet" onClick={onHome}>القائمة الرئيسية</button>
      </div>
    </div>
  )
}
