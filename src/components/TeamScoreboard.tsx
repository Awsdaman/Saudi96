import type { Team } from '../game/types'
import './TeamScoreboard.css'

interface Props {
  teams: [Team, Team]
  onAdjust: (index: 0 | 1, delta: number) => void
  /** رابط شاشة الجمهور — يظهر بجانب الشريط كي يفتحها المستضيف بنفسه
   *  في أي وقت (فتح النافذة تلقائياً قد يحظره المتصفح بلا إشعارٍ واضح). */
  audienceHref?: string
}

/** خطوة الزرّين: نقاط اللعبة من مضاعفات 50 (300، 150، 50) */
export const MANUAL_STEP = 50

/** شريطٌ عائم فوق كل الشاشات — النقاط يدويّة، يقرّرها من يستضيف الجلسة */
export function TeamScoreboard({ teams, onAdjust, audienceHref }: Props) {
  return (
    <div className="teamscore" role="group" aria-label="نقاط الفريقين">
      {audienceHref && (
        <a
          className="teamscore-audience"
          href={audienceHref}
          target="_blank"
          rel="noopener"
          title="فتح شاشة العرض في نافذة جديدة"
        >
          🖥 شاشة العرض
        </a>
      )}
      {teams.map((team, i) => (
        <div key={i} className={`teamscore-team teamscore-${i === 0 ? 'a' : 'b'}`}>
          <span className="teamscore-name">{team.name}</span>
          <div className="teamscore-controls">
            <button
              className="teamscore-btn"
              onClick={() => onAdjust(i as 0 | 1, -MANUAL_STEP)}
              aria-label={`إنقاص ${MANUAL_STEP} نقطة من ${team.name}`}
            >
              −
            </button>
            <span className="teamscore-value ltr">{team.score}</span>
            <button
              className="teamscore-btn"
              onClick={() => onAdjust(i as 0 | 1, MANUAL_STEP)}
              aria-label={`${MANUAL_STEP} نقطة لـ${team.name}`}
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
