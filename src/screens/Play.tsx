import { useEffect, useRef, useState } from 'react'
import { AnswerGrid } from '../components/AnswerGrid'
import { HowToModal } from '../components/HowToModal'
import { ROUNDS } from '../game/content'
import { RevealImage } from '../components/RevealImage'
import { ScoreBar } from '../components/ScoreBar'
import { Verdict } from '../components/Verdict'
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

  const answerText = question.options[question.answerIndex]
  const isLast = state.index + 1 >= state.questions.length

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
    <div className={`play ${question.image ? 'has-image' : ''}`}>
      <div className="ask">
        <ScoreBar
          index={state.index}
          total={state.questions.length}
          score={state.score}
          streak={state.streak}
          timeLeft={state.timeLeft}
          totalTime={state.totalTime}
          roundTitle={state.title}
          paused={state.paused}
        />

        <h2 className="prompt">{question.prompt}</h2>

        <AnswerGrid
          options={question.options}
          answerIndex={question.answerIndex}
          selected={state.selected}
          onPick={onAnswer}
        />

        <Verdict
          show={done}
          correct={!!last?.correct}
          timedOut={timedOut}
          answer={answerText}
          points={last?.points ?? 0}
          explanation={question.explanation}
          last={isLast}
          onNext={onNext}
        />

        {/* ضوابط اللاعب الفرد — تُخفى عن الشاشة المعروضة على الجدار */}
        <div className="play-foot stage-hide">
          <button className="btn btn-quiet" onClick={onQuit}>إنهاء الجولة</button>
          {meta && (
            <button className="btn btn-quiet" onClick={() => setHowTo(true)}>كيف تلعب؟</button>
          )}
        </div>
      </div>

      {question.image && (
        <RevealImage
          src={question.image}
          progress={reveal}
          kind={question.reveal ?? 'none'}
          revealed={done}
          plate={question.round === 'logos' ? 'light' : 'dark'}
          /* الوصف البديل يبقى فارغاً ما دامت الصورة هي اللغز نفسه،
             ثم يحمل الإجابة بعد الكشف — وإلا تعذّر بلوغها بلا بصر */
          label={answerText}
          frame={question.round === 'people' ? 'portrait' : 'wide'}
        />
      )}

      {howTo && meta && (
        <HowToModal title={meta.title} steps={meta.howTo} onClose={() => setHowTo(false)} />
      )}
    </div>
  )
}
