import { TimerRing } from './TimerRing'
import { useCountUp } from '../game/useCountUp'
import './ScoreBar.css'

interface Props {
  index: number
  total: number
  score: number
  streak: number
  timeLeft: number
  totalTime: number
  /** يظهر على المسرح وحده: الغرفة تحتاج أن تعرف أيّ جولة تُلعب */
  roundTitle?: string
  paused?: boolean
}

export function ScoreBar({
  index, total, score, streak, timeLeft, totalTime, roundTitle, paused,
}: Props) {
  const shown = useCountUp(score)
  const done = index + 1

  return (
    <div className="scorebar">
      <div className="scorebar-row">
        <TimerRing left={timeLeft} totalTime={totalTime} />

        {roundTitle && <span className="sb-round">{roundTitle}</span>}

        <span className="chip sb-prog">
          سؤال <span className="ltr">{done}</span> من <span className="ltr">{total}</span>
        </span>

        {/* السلسلة والوقت الرقمي يخصّان اللاعب الفرد؛ على الجدار
            يزاحمان السؤال ولا يضيفان للغرفة شيئاً */}
        {streak >= 2 && (
          <span className="chip chip-streak stage-hide">
            سلسلة <span className="ltr">{streak}</span>
          </span>
        )}

        {paused && <span className="chip chip-paused">موقوفة</span>}

        <span className="chip chip-score">
          <span className="ltr">{shown.toLocaleString('en-US')}</span> نقطة
        </span>
      </div>

      {/* تقدّم الجولة بنسيج السدو — يُقرأ ملمساً من بعيد،
          بخلاف شريط بارتفاع خمسة بكسلات */}
      <div
        className="round-track"
        role="progressbar"
        aria-label="تقدّم الجولة"
        aria-valuenow={done}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div className="sadu" style={{ width: `${(done / total) * 100}%` }} />
      </div>
    </div>
  )
}
