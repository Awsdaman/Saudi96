import type { CSSProperties } from 'react'
import type { Team } from '../game/types'
import './CelebrationPopup.css'

interface Props {
  teams: [Team, Team]
  onDismiss: () => void
}

const COLORS = ['var(--green-bright)', 'var(--gold)', '#fff', 'var(--correct)']
const SPARKS = 16

/** موقع كل انفجار ألعابٍ نارية على الشاشة، ولون شرره */
const BURSTS = [
  { left: '20%', top: '28%', color: COLORS[0], delay: 0 },
  { left: '78%', top: '22%', color: COLORS[1], delay: 0.35 },
  { left: '50%', top: '38%', color: COLORS[2], delay: 0.7 },
  { left: '32%', top: '62%', color: COLORS[3], delay: 1.05 },
  { left: '68%', top: '58%', color: COLORS[0], delay: 1.4 },
]

/**
 * تظهر عند انتهاء جولةٍ في وضع الفريقين: تُعلن الفائز باحتفالٍ قصير،
 * ثم يُفسح لها المستضيف عند اطمئنانه لمراجعة تفاصيل الجولة (خلفها
 * مباشرةً — Results/LogoResults مُركَّبةٌ فعلاً، هذه طبقةٌ فوقها فقط).
 */
export function CelebrationPopup({ teams, onDismiss }: Props) {
  const [a, b] = teams
  const winnerIndex = a.score === b.score ? null : a.score > b.score ? 0 : 1
  const winner = winnerIndex === null ? null : teams[winnerIndex]

  return (
    <div className="celebrate-backdrop" role="dialog" aria-modal="true" aria-label="نتيجة الجولة">
      <div className="celebrate-fireworks" aria-hidden="true">
        {BURSTS.map((burst, bi) => (
          <div key={bi} className="firework" style={{ left: burst.left, top: burst.top }}>
            {Array.from({ length: SPARKS }, (_, i) => (
              <span
                key={i}
                className="spark"
                style={{
                  '--angle': `${(360 / SPARKS) * i}deg`,
                  '--delay': `${burst.delay}s`,
                  '--spark-color': burst.color,
                } as CSSProperties}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="celebrate-card">
        <p className="celebrate-emoji" aria-hidden="true">🎉</p>
        {winner ? (
          <>
            <p className="celebrate-kicker">الفريق الفائز</p>
            <h1 className={`celebrate-winner ${winnerIndex === 0 ? 'is-a' : 'is-b'}`}>{winner.name}</h1>
            <p className="celebrate-score">
              <span className="ltr">{winner.score.toLocaleString('en-US')}</span> نقطة
            </p>
          </>
        ) : (
          <>
            <h1 className="celebrate-winner">تعادل!</h1>
            <p className="celebrate-score">
              <span className="ltr">{a.score.toLocaleString('en-US')}</span> — <span className="ltr">{b.score.toLocaleString('en-US')}</span>
            </p>
          </>
        )}

        <button className="btn btn-primary celebrate-dismiss" onClick={onDismiss}>شاهد النتيجة</button>
      </div>
    </div>
  )
}
