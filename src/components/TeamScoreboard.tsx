import type { Team } from '../game/types'
import './TeamScoreboard.css'

interface Props {
  teams: [Team, Team]
  onAdjust: (index: 0 | 1, delta: 1 | -1) => void
}

/** شريطٌ عائم فوق كل الشاشات — النقاط يدويّة، يقرّرها من يستضيف الجلسة */
export function TeamScoreboard({ teams, onAdjust }: Props) {
  return (
    <div className="teamscore" role="group" aria-label="نقاط الفريقين">
      {teams.map((team, i) => (
        <div key={i} className={`teamscore-team teamscore-${i === 0 ? 'a' : 'b'}`}>
          <span className="teamscore-name">{team.name}</span>
          <div className="teamscore-controls">
            <button
              className="teamscore-btn"
              onClick={() => onAdjust(i as 0 | 1, -1)}
              aria-label={`إنقاص نقطة من ${team.name}`}
            >
              −
            </button>
            <span className="teamscore-value ltr">{team.score}</span>
            <button
              className="teamscore-btn"
              onClick={() => onAdjust(i as 0 | 1, 1)}
              aria-label={`نقطة لـ${team.name}`}
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
