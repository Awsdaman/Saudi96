import { useEffect, useRef, useState } from 'react'
import { AnswerGrid } from '../components/AnswerGrid'
import { HowToModal } from '../components/HowToModal'
import { ROUNDS } from '../game/content'
import { RevealImage } from '../components/RevealImage'
import { ScoreBar } from '../components/ScoreBar'
import type { GameState } from '../game/useGame'
import type { Question } from '../game/types'
import './Play.css'

interface Props {
  state: GameState
  question: Question
  reveal: number
  onAnswer: (i: number) => void
  onNext: () => void
  onQuit: () => void
}

export function Play({ state, question, reveal, onAnswer, onNext, onQuit }: Props) {
  const done = state.selected !== null
  const last = state.records[state.records.length - 1]
  const timedOut = state.selected === -1
  const meta = ROUNDS.find((r) => r.id === state.roundId)
  const [howTo, setHowTo] = useState(false)

  // المستمع يُركّب مرة واحدة ويقرأ من ref، وإلا التقط إغلاقاً قديماً
  // فتضيع ضغطة Enter التي تلي الإجابة مباشرةً قبل إعادة التصيير.
  const latest = useRef({ done, count: question.options.length, onAnswer, onNext, onQuit })
  useEffect(() => {
    latest.current = { done, count: question.options.length, onAnswer, onNext, onQuit }
  })

  // اختصارات لوحة المفاتيح: ١-٤ للإجابة، Enter للسؤال التالي، Esc للخروج
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cur = latest.current
      if (e.key === 'Escape') return cur.onQuit()
      if (!cur.done) {
        const n = Number(e.key)
        if (n >= 1 && n <= cur.count) cur.onAnswer(n - 1)
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        cur.onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="play">
      <ScoreBar
        index={state.index}
        total={state.questions.length}
        score={state.score}
        streak={state.streak}
        timeLeft={state.timeLeft}
        totalTime={state.totalTime}
      />

      {question.image && (
        <RevealImage
          src={question.image}
          progress={reveal}
          kind={question.reveal ?? 'none'}
          revealed={done}
          plate={question.round === 'logos' ? 'light' : 'dark'}
          frame={question.round === 'people' ? 'portrait' : 'wide'}
        />
      )}

      <h2 className="prompt">{question.prompt}</h2>

      <AnswerGrid
        options={question.options}
        answerIndex={question.answerIndex}
        selected={state.selected}
        onPick={onAnswer}
      />

      {done && (
        <div className={`verdict ${last?.correct ? 'is-correct' : 'is-wrong'}`}>
          <div className="verdict-head">
            <strong>
              {last?.correct ? 'إجابة صحيحة' : timedOut ? 'نفد الوقت' : 'إجابة خاطئة'}
            </strong>
            {last && last.points > 0 && (
              <span className="verdict-points">
                <span className="ltr">+{last.points.toLocaleString('en-US')}</span>
              </span>
            )}
          </div>

          {question.explanation && <p className="verdict-text">{question.explanation}</p>}

          {/* بلا autoFocus: لو كان الزر مركَّزاً لأطلق Enter الحدثين معاً — المستمع والنقر — فتُتخطّى نتيجة */}
          <button className="btn btn-primary" onClick={onNext}>
            {state.index + 1 >= state.questions.length ? 'النتيجة' : 'التالي'}
          </button>
        </div>
      )}

      <div className="play-foot">
        <button className="btn btn-quiet" onClick={onQuit}>إنهاء الجولة</button>
        {meta && (
          <button className="btn btn-quiet" onClick={() => setHowTo(true)}>كيف تلعب؟</button>
        )}
      </div>

      {howTo && meta && (
        <HowToModal title={meta.title} steps={meta.howTo} onClose={() => setHowTo(false)} />
      )}
    </div>
  )
}
