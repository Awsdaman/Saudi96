import { useCountUp } from '../game/useCountUp'
import './ScoreBar.css'

interface Props {
  index: number
  total: number
  score: number
  roundTitle?: string
  itemLabel?: string
}

export function ScoreBar({
  index, total, score, roundTitle, itemLabel = 'سؤال',
}: Props) {
  const shown = useCountUp(score)
  const done = index + 1

  return (
    <div className="scorebar">
      <div className="scorebar-row">
        {roundTitle && <span className="sb-round">{roundTitle}</span>}

        <span className="chip sb-prog">
          {itemLabel} <span className="ltr">{done}</span> من <span className="ltr">{total}</span>
        </span>

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
