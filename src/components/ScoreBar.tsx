import './ScoreBar.css'

interface Props {
  index: number
  total: number
  score: number
  streak: number
  timeLeft: number
  totalTime: number
}

export function ScoreBar({ index, total, score, streak, timeLeft, totalTime }: Props) {
  const pct = totalTime > 0 ? Math.max(0, Math.min(1, timeLeft / totalTime)) : 0
  const low = pct < 0.25

  return (
    <div className="scorebar">
      <div className="scorebar-row">
        <span className="chip">
          سؤال <span className="ltr">{index + 1}</span> من <span className="ltr">{total}</span>
        </span>

        <span className="chip chip-score">
          <span className="ltr">{score.toLocaleString('en-US')}</span> نقطة
        </span>

        {streak >= 2 && (
          <span className="chip chip-streak">
            سلسلة <span className="ltr">{streak}</span>
          </span>
        )}

        <span className={`chip chip-time ${low ? 'is-low' : ''}`}>
          <span className="ltr">{Math.ceil(timeLeft)}</span> ث
        </span>
      </div>

      <div className="timer-track">
        <div
          className={`timer-fill ${low ? 'is-low' : ''}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  )
}
