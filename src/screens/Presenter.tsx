import { useEffect, useState } from 'react'
import { listenAsPresenter, sendCommand, type PresenterState } from '../game/presenter'
import './Presenter.css'

export function Presenter() {
  const [s, setS] = useState<PresenterState>({ kind: 'idle' })

  useEffect(() => listenAsPresenter(setS), [])

  const live = s.kind !== 'idle'

  // اختصارات المقدّم على حاسبه: مسافة للكشف، سهم أو Enter للتالي، P للإيقاف.
  // كانت الضوابط كلها في النافذة المعروضة على الجدار، فيضطرّ المقدّم
  // إلى تحريك المؤشّر أمام الجمهور ليتقدّم سؤالاً.
  useEffect(() => {
    if (!live) return
    function onKey(e: KeyboardEvent) {
      const k = e.key
      if (k === ' ') {
        e.preventDefault()
        sendCommand({ cmd: 'reveal' })
      } else if (k === 'Enter' || k === 'ArrowLeft' || k === 'ArrowRight') {
        e.preventDefault()
        sendCommand({ cmd: 'next' })
      } else if (k === 'p' || k === 'P') {
        sendCommand({ cmd: 'pause' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [live])

  if (!live) {
    return (
      <div className="pres pres-idle">
        <h1 className="pres-brand">شاشة المقدّم</h1>
        <p className="pres-hint">
          هذه النافذة تعرض الإجابة الصحيحة لك وحدك، ومنها تُدير الجولة.
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

      {/* لوحة القيادة — القناة ثنائية الاتجاه أصلاً، ولم يكن أحد يرسل فيها */}
      <div className="pres-ctl">
        <button
          className="pres-btn"
          onClick={() => sendCommand({ cmd: 'reveal' })}
          disabled={s.revealed}
        >
          كشف الإجابة <kbd>مسافة</kbd>
        </button>
        <button className="pres-btn is-primary" onClick={() => sendCommand({ cmd: 'next' })}>
          التالي <kbd>↵</kbd>
        </button>
        <button className="pres-btn" onClick={() => sendCommand({ cmd: 'skip' })}>
          تخطّي
        </button>
        <button
          className={`pres-btn ${s.paused ? 'is-on' : ''}`}
          onClick={() => sendCommand({ cmd: 'pause' })}
          aria-pressed={!!s.paused}
        >
          {s.paused ? 'متابعة' : 'إيقاف'} <kbd>P</kbd>
        </button>
      </div>

      {s.image && (
        <div className="pres-img">
          <img src={s.image} alt={s.answer ?? ''} />
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

      <p className="pres-state" role="status" aria-live="polite">
        {s.paused ? 'الجولة موقوفة' : s.revealed ? 'كُشفت الإجابة للاعبين' : 'اللاعبون يجيبون…'}
      </p>
    </div>
  )
}
