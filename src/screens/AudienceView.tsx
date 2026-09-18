import { useEffect, useState } from 'react'
import type { AudienceMessage, AudienceQuestion } from '../game/hostSync'
import { AUDIENCE_CHANNEL } from '../game/hostSync'
import type { Team } from '../game/types'
import './AudienceView.css'

type Screen = { kind: 'idle' } | { kind: 'question'; data: AudienceQuestion } | { kind: 'results'; score: number }

/**
 * تبويب الجمهور — يُفتح على شاشة العرض، ولا يعرف الإجابة الصحيحة إلا
 * حين يفصح عنها تبويب المستضيف عبر البث (انظر hostSync.ts). لا حالة
 * لعبٍ محلية هنا؛ كل ما يُعرض قادمٌ من القناة.
 */
export function AudienceView() {
  const [screen, setScreen] = useState<Screen>({ kind: 'idle' })
  const [teams, setTeams] = useState<[Team, Team] | null>(null)

  useEffect(() => {
    const channel = new BroadcastChannel(AUDIENCE_CHANNEL)
    channel.onmessage = (e: MessageEvent<AudienceMessage>) => {
      const msg = e.data
      if (msg.type === 'idle') setScreen({ kind: 'idle' })
      else if (msg.type === 'question') setScreen({ kind: 'question', data: msg.data })
      else if (msg.type === 'results') setScreen({ kind: 'results', score: msg.score })
      else if (msg.type === 'teams') setTeams(msg.teams)
    }
    return () => channel.close()
  }, [])

  return (
    <div className="audience">
      {teams && (
        <div className="audience-scores" role="group" aria-label="نقاط الفريقين">
          {teams.map((t, i) => (
            <div key={i} className={`audience-team audience-${i === 0 ? 'a' : 'b'}`}>
              <span className="audience-team-name">{t.name}</span>
              <span className="audience-team-score ltr">{t.score}</span>
            </div>
          ))}
        </div>
      )}

      <div className="audience-body">
        {screen.kind === 'idle' && <p className="audience-waiting">بانتظار السؤال التالي…</p>}
        {screen.kind === 'results' && <p className="audience-waiting">انتهت الجولة!</p>}
        {screen.kind === 'question' && <AudienceQuestionView data={screen.data} />}
      </div>
    </div>
  )
}

function AudienceQuestionView({ data }: { data: AudienceQuestion }) {
  const revealed = data.answerIndex !== undefined || data.correctText !== undefined
  return (
    <div className="audience-question">
      <div className="audience-head">
        <span className="audience-chip">{data.roundTitle}</span>
        <span className="audience-chip">{data.itemLabel} <span className="ltr">{data.index + 1}</span> من <span className="ltr">{data.total}</span></span>
      </div>
      <h1 className="audience-prompt">{data.prompt}</h1>
      {data.image && (
        <div className="audience-image-wrap">
          <img className="audience-image" src={data.image} alt="" />
        </div>
      )}
      {data.options ? (
        <div className="audience-options">
          {data.options.map((opt, i) => (
            <div key={opt} className={`audience-option ${revealed && i === data.answerIndex ? 'is-correct' : ''}`}>
              {opt}
            </div>
          ))}
        </div>
      ) : revealed && data.correctText ? (
        <p className="audience-answer">{data.correctText}</p>
      ) : null}
    </div>
  )
}
