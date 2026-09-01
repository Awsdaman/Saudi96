import { useEffect, useState } from 'react'
import { RoundIcon } from '../components/RoundIcon'
import { onPresenterConnection, presenterIsOpen } from '../game/presenter'
import { loadLength, saveLength } from '../game/storage'
import type { RoundMeta } from '../game/types'
import './RoundIntro.css'

interface Props {
  meta: RoundMeta
  /** حجم بنك الأسئلة المتاح لهذه الجولة */
  poolSize: number
  onStart: (count: number) => void
  onBack: () => void
}

const CHOICES = [5, 10, 15, 20]

export function RoundIntro({ meta, poolSize, onStart, onBack }: Props) {
  // تُعرض الخيارات التي يسمح بها حجم البنك فقط
  const options = CHOICES.filter((n) => n < poolSize)
  const [count, setCount] = useState(() => {
    const saved = loadLength(meta.id)
    if (saved && (saved === poolSize || options.includes(saved))) return saved
    return options.includes(10) ? 10 : (options[0] ?? poolSize)
  })
  const [presenterOpen, setPresenterOpen] = useState(presenterIsOpen())

  useEffect(() => onPresenterConnection(setPresenterOpen), [])

  function start() {
    saveLength(meta.id, count)
    onStart(Math.min(count, poolSize))
  }

  return (
    <div className="intro">
      <header className="intro-head">
        <span className="intro-icon"><RoundIcon round={meta.id} /></span>
        <h1 className="intro-title">{meta.title}</h1>
        <p className="intro-sub">{meta.subtitle}</p>
      </header>

      <section className="intro-card">
        <h2 className="intro-h2">كيف تلعب</h2>
        <ol className="intro-steps">
          {meta.howTo.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </section>

      <section className="intro-card">
        <h2 className="intro-h2">كم سؤال؟</h2>
        <div className="intro-chips">
          {options.map((n) => (
            <button
              key={n}
              className={`intro-chip ${count === n ? 'is-on' : ''}`}
              onClick={() => setCount(n)}
              aria-pressed={count === n}
            >
              <span className="ltr">{n}</span>
            </button>
          ))}
          <button
            className={`intro-chip ${count === poolSize ? 'is-on' : ''}`}
            onClick={() => setCount(poolSize)}
            aria-pressed={count === poolSize}
          >
            الكل (<span className="ltr">{poolSize}</span>)
          </button>
        </div>
      </section>

      <section className="intro-card">
        <h2 className="intro-h2">تقدّم اللعبة لمجموعة؟</h2>
        <p className="intro-note">
          افتح شاشة المقدّم في نافذة ثانية — تعرض لك الإجابة الصحيحة وحدك.
          ضعها على شاشتك واعرض هذه النافذة على اللاعبين.
        </p>
        {/* رابط لا زر: نقرة الرابط بـ target=_blank لا يحجبها مانع النوافذ المنبثقة.
            و rel="opener" ضروري لأن المتصفحات تقطع window.opener افتراضياً،
            وبقطعه تفشل المصافحة التي تلتقط بها النافذة الأم مقبض شاشة المقدّم. */}
        <a
          className={`btn btn-ghost ${presenterOpen ? 'is-live' : ''}`}
          href="#presenter"
          target="_blank"
          rel="opener"
        >
          {presenterOpen ? 'شاشة المقدّم متصلة ✓' : 'افتح شاشة المقدّم'}
        </a>
      </section>

      <div className="intro-actions">
        <button className="btn btn-primary" onClick={start}>ابدأ</button>
        <button className="btn btn-quiet" onClick={onBack}>رجوع</button>
      </div>
    </div>
  )
}
