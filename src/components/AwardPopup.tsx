import type { Team } from '../game/types'
import './AwardPopup.css'

interface Props {
  points: number
  teams: [Team, Team]
  onAward: (index: 0 | 1) => void
  onSkip: () => void
}

/** يظهر بعد كل إجابةٍ صحيحة في وضع الفريقين — المستضيف يقرّر من يستحقّها */
export function AwardPopup({ points, teams, onAward, onSkip }: Props) {
  return (
    <div className="award-backdrop" role="presentation">
      <div className="award" role="dialog" aria-modal="true" aria-label="من يستحق النقاط؟">
        <p className="award-points"><span className="ltr">{points}</span> نقطة — لمن؟</p>
        <div className="award-teams">
          <button className="award-team award-a" onClick={() => onAward(0)}>{teams[0].name}</button>
          <button className="award-team award-b" onClick={() => onAward(1)}>{teams[1].name}</button>
        </div>
        <button className="btn-link award-skip" onClick={onSkip}>بلا نقاط</button>
      </div>
    </div>
  )
}
