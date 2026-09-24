import { useEffect, useRef, useState } from 'react'
import { AnswerGrid } from '../components/AnswerGrid'
import { AwardPopup } from '../components/AwardPopup'
import { HowToModal } from '../components/HowToModal'
import { ROUNDS } from '../game/content'
import type { AudienceMessage } from '../game/hostSync'
import { RevealImage } from '../components/RevealImage'
import { ScoreBar } from '../components/ScoreBar'
import { loadPlayMode } from '../game/storage'
import { Verdict } from '../components/Verdict'
import type { GameState } from '../game/useGame'
import type { ChoiceQuestion, Team } from '../game/types'
import './Play.css'

interface Props {
  state: GameState
  question: ChoiceQuestion
  onAnswer: (i: number, discounted?: boolean) => void
  onNext: () => void
  onQuit: () => void
  teams?: [Team, Team] | null
  onAdjust?: (index: 0 | 1, delta: number) => void
  sendAudience?: (msg: AudienceMessage) => void
}

export function Play({ state, question, onAnswer, onNext, onQuit, teams, onAdjust, sendAudience }: Props) {
  const done = state.selected !== null
  const last = state.records[state.records.length - 1]
  const meta = ROUNDS.find((r) => r.id === question.round)
  const [howTo, setHowTo] = useState(false)
  // نافذة توزيع النقاط بين الفريقين تنتظر ضغطة «التالي» بدل الظهور فوراً
  // عند الإجابة — وإلا حجبت لوحة الحكم (Verdict) بإجابتها وشرحها قبل أن
  // يراهما أحد. تُعاد لـfalse تلقائياً مع كل سؤالٍ جديد لأن Play.tsx
  // يُركَّب من جديد بمفتاح question.id.
  const [awarding, setAwarding] = useState(false)

  // إخفاء الخيارات تفادياً لتلميح الحل بالاستبعاد بلا معرفة فعلية —
  // نمط اللعب (سهل/صعب) يختاره اللاعب في شاشة الإعداد، ويُقرأ هنا عند
  // كل سؤال جديد (المكوّن يُعاد تركيبه بمفتاح question.id).
  const [choicesShown, setChoicesShown] = useState(() => loadPlayMode() === 'easy')
  // طلب الخيارات في النمط المتوسط/الصعب مخاطرةٌ يتجنّبها اللاعب — تُنصَّف
  // نقاطه إن أجاب بعدها. في السهل الخيارات ظاهرةٌ أصلاً بلا طلب، فهذا
  // العلم يبقى false دائماً هناك (الزرّ لا يظهر لتغييره). «اعرض لي
  // الإجابة» لا يمسّه أبداً — أداة المستضيف المنفصلة تبقى بكامل نقاطها.
  const [manuallyRevealed, setManuallyRevealed] = useState(false)

  function revealChoices() {
    setChoicesShown(true)
    setManuallyRevealed(true)
  }

  const answerText = question.options[question.answerIndex]
  const isLast = state.index + 1 >= state.questions.length
  const showChoices = choicesShown || done

  // في وضع الفريقين، إجابةٌ صحيحة تفتح نافذة توزيع النقاط بدل الانتقال
  // المباشر — الجميع يرى الإجابة والشرح كاملين على لوحة الحكم أولاً،
  // ثم يقرّر المستضيف من يستحقّها بعد هذه الضغطة تحديداً.
  function advance() {
    if (teams && last?.correct) setAwarding(true)
    else onNext()
  }

  // يُبلَّغ تبويب الجمهور بالسؤال دون إجابته — answerIndex لا يصل إلا
  // بعد أن يحسم المستضيف الأمر (done)، فتبقى الإجابة عنده حتى تلك اللحظة.
  useEffect(() => {
    sendAudience?.({
      type: 'question',
      data: {
        roundTitle: state.title,
        itemLabel: 'سؤال',
        index: state.index,
        total: state.questions.length,
        prompt: question.prompt,
        image: question.image,
        reveal: question.reveal,
        options: showChoices ? question.options : undefined,
        ...(done ? { answerIndex: question.answerIndex } : {}),
      },
    })
  }, [
    sendAudience, showChoices, done, state.title, state.index, state.questions.length,
    question.prompt, question.image, question.reveal, question.options, question.answerIndex,
  ])

  // المستمع يُركّب مرة واحدة ويقرأ من ref، وإلا التقط إغلاقاً قديماً
  // فتضيع ضغطة Enter التي تلي الإجابة مباشرةً قبل إعادة التصيير.
  const latest = useRef({ done, showChoices, manuallyRevealed, count: question.options.length, onAnswer, advance, onQuit })
  useEffect(() => {
    latest.current = { done, showChoices, manuallyRevealed, count: question.options.length, onAnswer, advance, onQuit }
  })

  // اختصارات لوحة المفاتيح: مسافة/Enter تُظهر الخيارات أولاً، ثم ١-٤
  // للإجابة، ثم Enter/مسافة للسؤال التالي — وEsc للخروج في أي وقت.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cur = latest.current
      if (e.key === 'Escape') return cur.onQuit()
      if (cur.done) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          cur.advance()
        }
        return
      }
      if (!cur.showChoices) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          revealChoices()
        }
        return
      }
      const n = Number(e.key)
      if (n >= 1 && n <= cur.count) cur.onAnswer(n - 1, cur.manuallyRevealed)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isPortrait = question.round === 'people'
  const imageClass = question.image ? (isPortrait ? 'has-image has-image-portrait' : 'has-image has-image-wide') : ''

  return (
    <div className={`play ${imageClass}`}>
      <div className="ask">
        <ScoreBar
          index={state.index}
          total={state.questions.length}
          score={state.score}
          roundTitle={state.title}
        />

        <h2 className="prompt">{question.prompt}</h2>

        {showChoices ? (
          <AnswerGrid
            options={question.options}
            answerIndex={question.answerIndex}
            selected={state.selected}
            onPick={(i) => onAnswer(i, manuallyRevealed)}
          />
        ) : (
          <button className="btn btn-primary play-reveal-choices" onClick={revealChoices}>
            أظهر الخيارات
          </button>
        )}

        {!done && (
          <button className="btn btn-quiet host-reveal-btn" onClick={() => onAnswer(question.answerIndex, false)}>
            👁 اعرض لي الإجابة
          </button>
        )}

        <Verdict
          show={done}
          correct={!!last?.correct}
          answer={answerText}
          points={last?.points ?? 0}
          discounted={last?.discounted}
          explanation={question.explanation}
          last={isLast}
          onNext={advance}
        />

        <div className="play-foot">
          <button className="btn btn-quiet" onClick={onQuit}>إنهاء الجولة</button>
          {meta && (
            <button className="btn btn-quiet" onClick={() => setHowTo(true)}>كيف تلعب؟</button>
          )}
        </div>
      </div>

      {question.image && (
        <RevealImage
          key={question.id}
          src={question.image}
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

      {awarding && teams && last && (
        <AwardPopup
          points={last.points}
          teams={teams}
          onAward={(i) => { onAdjust?.(i, last.points); setAwarding(false); onNext() }}
          onSkip={() => { setAwarding(false); onNext() }}
        />
      )}
    </div>
  )
}
