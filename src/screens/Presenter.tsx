import { useEffect, useState } from 'react'
import { listenAsPresenter, type PresenterState } from '../game/presenter'
import './Presenter.css'

export function Presenter() {
  const [s, setS] = useState<PresenterState>({ kind: 'idle' })

  useEffect(() => listenAsPresenter(setS), [])

  if (s.kind === 'idle') {
    return (
      <div className="pres pres-idle">
        <h1 className="pres-brand">شاشة المقدّم</h1>
        <p className="pres-hint">
          هذه النافذة تعرض الإجابة الصحيحة لك وحدك.
          <br />
          ابقِها على شاشتك، واعرض النافذة الأخرى على اللاعبين.
        </p>
        <p className="pres-wait">بانتظار بدء الجولة…</p>
      </div>
    )
  }

  return (
    <div className="pres">
      <header className="pres-bar">
        <span className="pres-round">{s.roundTitle}</span>
        <span className="pres-prog">
          سؤال <span className="ltr">{(s.index ?? 0) + 1}</span> من <span className="ltr">{s.total ?? 0}</span>
        </span>
        {typeof s.score === 'number' && (
          <span className="pres-score">
            <span className="ltr">{s.score.toLocaleString('en-US')}</span> نقطة
          </span>
        )}
      </header>

      {s.prompt && <p className="pres-q">{s.prompt}</p>}

      <div className="pres-answer-wrap">
        <span className="pres-label">الإجابة</span>
        <p className="pres-answer">{s.answer}</p>
      </div>

      {s.image && (
        <div className="pres-img">
          <img src={s.image} alt="" />
        </div>
      )}

      {s.options && s.options.length > 0 && (
        <ol className="pres-options">
          {s.options.map((o, i) => (
            <li key={o} className={i === s.answerIndex ? 'is-correct' : ''}>
              <span className="pres-num ltr">{i + 1}</span>
              {o}
            </li>
          ))}
        </ol>
      )}

      {s.explanation && <p className="pres-explain">{s.explanation}</p>}

      {s.revealed && <p className="pres-state">كُشفت الإجابة للاعبين</p>}
    </div>
  )
}
