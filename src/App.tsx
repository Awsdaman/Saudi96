import { useEffect, useRef, useState } from 'react'
import { ROUNDS, poolFor } from './game/content'
import {
  isPresenterWindow,
  listenForCommands,
  sendToPresenter,
  watchPresenterHandshake,
  type PresenterState,
} from './game/presenter'
import { saveBest } from './game/storage'
import { useGame } from './game/useGame'
import { useSurface } from './game/useSurface'
import type { Entity, Question, RoundId } from './game/types'
import { Credits } from './screens/Credits'
import { CustomBuilder } from './screens/CustomBuilder'
import { Home } from './screens/Home'
import { LogoResults } from './screens/LogoResults'
import { LogoRound } from './screens/LogoRound'
import { Play } from './screens/Play'
import { Presenter } from './screens/Presenter'
import { Results } from './screens/Results'
import { RoundIntro } from './screens/RoundIntro'

/** ثوانٍ افتراضية للجولة المخصّصة */
const CUSTOM_SECONDS = 22

type View = 'home' | 'intro' | 'custom' | 'logos' | 'logoResults' | 'credits'

interface LogoOutcome { known: number; total: number; missed: Entity[] }

export default function App() {
  // نافذة المقدّم تعرض المكوّن الخاص بها وحده
  if (isPresenterWindow()) return <Presenter />
  return <Game />
}

function Game() {
  const { state, question, reveal, start, answer, next, pause, home } = useGame()
  const [view, setView] = useState<View>('home')
  const [introRound, setIntroRound] = useState<RoundId | null>(null)
  const [logoCount, setLogoCount] = useState(12)
  const [isRecord, setIsRecord] = useState(false)
  const [logoOutcome, setLogoOutcome] = useState<LogoOutcome | null>(null)
  const lastCustom = useRef<{ pool: Question[]; count: number } | null>(null)

  // اتّصال شاشة المقدّم يعني أن هذه النافذة صارت معروضة على الجدار
  useSurface()

  useEffect(() => watchPresenterHandshake(), [])

  // ── بثّ الحالة إلى شاشة المقدّم ──
  useEffect(() => {
    if (state.phase === 'playing' && question) {
      sendToPresenter({
        kind: 'mcq',
        roundTitle: state.title,
        index: state.index,
        total: state.questions.length,
        prompt: question.prompt,
        options: question.options,
        answerIndex: question.answerIndex,
        answer: question.options[question.answerIndex],
        explanation: question.explanation,
        image: question.image,
        revealed: state.selected !== null,
        score: state.score,
        streak: state.streak,
        paused: state.paused,
      })
    } else if (view === 'home' && state.phase === 'home') {
      sendToPresenter({ kind: 'idle' })
    }
  }, [state.phase, state.index, state.selected, state.score, question, state.roundId, state.title, state.questions.length, state.streak, state.paused, view])

  function beginRound(id: RoundId) {
    setIntroRound(id)
    setView('intro')
  }

  function startFromIntro(count: number) {
    const id = introRound!
    setIsRecord(false)
    if (id === 'logos') {
      setLogoCount(count)
      setView('logos')
      return
    }
    const meta = ROUNDS.find((r) => r.id === id)!
    setView('home')
    // بدء جولةٍ عادية يُبطل «لعبتي» السابقة، وإلا أعاد زرّ «جولة أخرى»
    // في شاشة النتيجة تلك الجولةَ المخصّصة بدل الجولة التي انتهت للتوّ
    lastCustom.current = null
    start(id, meta.title, poolFor(id), count, meta.seconds)
  }

  function beginCustom(pool: Question[], count: number) {
    lastCustom.current = { pool, count }
    setIsRecord(false)
    setView('home')
    // معرّف الأسئلة المعرفية وعاءٌ لا أكثر — والعنوان يُمرَّر صريحاً
    start('trivia', 'لعبتي', pool, count, CUSTOM_SECONDS)
  }

  // الانتقال إلى النتائج يمرّ دائماً عبر next، فهنا تُحفظ النتيجة —
  // في معالج الحدث لا في تأثير جانبي، تفادياً لتصيير متتالٍ.
  function handleNext() {
    const isLast = state.index + 1 >= state.questions.length
    if (isLast && state.roundId) setIsRecord(saveBest(state.roundId, state.score))
    next()
  }

  // أوامر شاشة المقدّم تُنفَّذ هنا لأن الحالة كلها في هذه النافذة.
  // المستمع يُركّب مرة واحدة ويقرأ من ref، وإلا التقط إغلاقاً قديماً
  // فنفّذ الأمر على سؤال سابق.
  const cmd = useRef({ handleNext, answer, pause, done: state.selected !== null })
  useEffect(() => {
    cmd.current = { handleNext, answer, pause, done: state.selected !== null }
  })

  useEffect(
    () =>
      listenForCommands((c) => {
        const cur = cmd.current
        if (c.cmd === 'next') cur.handleNext()
        else if (c.cmd === 'pause') cur.pause()
        // الكشف بلا إجابة = لم تعرفها الغرفة، فلا نقاط
        else if (c.cmd === 'reveal') { if (!cur.done) cur.answer(-1) }
        else if (c.cmd === 'skip') {
          if (!cur.done) cur.answer(-1)
          cur.handleNext()
        }
      }),
    [],
  )

  function goHome() {
    home()
    setLogoOutcome(null)
    setIntroRound(null)
    setView('home')
    sendToPresenter({ kind: 'idle' })
  }

  // ── جولة الشعار ──
  if (view === 'logos') {
    return (
      <LogoRound
        count={logoCount}
        onCard={(s: PresenterState) => sendToPresenter(s)}
        onFinish={(known, total, missed) => {
          setIsRecord(saveBest('logos', known))
          setLogoOutcome({ known, total, missed })
          setView('logoResults')
          sendToPresenter({ kind: 'idle' })
        }}
        onQuit={goHome}
      />
    )
  }

  if (view === 'logoResults' && logoOutcome) {
    return (
      <LogoResults
        {...logoOutcome}
        isRecord={isRecord}
        onReplay={() => { setLogoOutcome(null); setView('logos') }}
        onHome={goHome}
      />
    )
  }

  // ── الجولات ذات الخيارات ──
  if (state.phase === 'results') {
    return (
      <Results
        state={state}
        isRecord={isRecord}
        onReplay={() => {
          const c = lastCustom.current
          if (c) beginCustom(c.pool, c.count)
          else start(state.roundId!, state.title, poolFor(state.roundId!), state.questions.length,
            ROUNDS.find((r) => r.id === state.roundId)!.seconds)
        }}
        onHome={goHome}
      />
    )
  }

  if (state.phase === 'playing' && question) {
    return (
      <Play
        state={state}
        question={question}
        reveal={reveal}
        onAnswer={answer}
        onNext={handleNext}
        onQuit={goHome}
      />
    )
  }

  if (view === 'intro' && introRound) {
    return (
      <RoundIntro
        meta={ROUNDS.find((r) => r.id === introRound)!}
        poolSize={poolFor(introRound).length}
        onStart={startFromIntro}
        onBack={goHome}
      />
    )
  }

  if (view === 'custom') {
    return <CustomBuilder onStart={beginCustom} onBack={goHome} />
  }

  if (view === 'credits') {
    return <Credits onBack={goHome} />
  }

  return (
    <Home
      onPick={beginRound}
      onCustom={() => setView('custom')}
      onCredits={() => setView('credits')}
    />
  )
}
