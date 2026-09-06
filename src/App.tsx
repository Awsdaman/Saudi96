import { useRef, useState } from 'react'
import { ROUNDS, poolFor } from './game/content'
import { saveBest } from './game/storage'
import { useGame } from './game/useGame'
import { useRoundTheme } from './game/useRoundTheme'
import type { Entity, Question, RoundId } from './game/types'
import { Credits } from './screens/Credits'
import { CustomBuilder } from './screens/CustomBuilder'
import { Home } from './screens/Home'
import { LogoResults } from './screens/LogoResults'
import { LogoRound } from './screens/LogoRound'
import { Play } from './screens/Play'
import { Results } from './screens/Results'

/** ثوانٍ افتراضية للجولة المخصّصة */
const CUSTOM_SECONDS = 22

type View = 'home' | 'custom' | 'logos' | 'logoResults' | 'credits'

interface LogoOutcome { known: number; total: number; missed: Entity[] }

export default function App() {
  return <Game />
}

function Game() {
  const { state, question, reveal, start, answer, next, home } = useGame()
  const [view, setView] = useState<View>('home')
  const [logoCount, setLogoCount] = useState(12)
  const [isRecord, setIsRecord] = useState(false)
  const [logoOutcome, setLogoOutcome] = useState<LogoOutcome | null>(null)
  const lastCustom = useRef<{ pool: Question[]; count: number } | null>(null)

  // لون الجولة النشطة: اللعب والنتيجة بجولةٍ حقيقية وحدها — «لعبتي»
  // تُعرَّف بعنوانها المميَّز لأن معرّفها الداخلي «trivia» وعاءٌ لا هوية.
  const isCustomRound = state.title === 'لعبتي'
  const themeRoundId =
    view === 'logos' || view === 'logoResults' ? 'logos'
    : (state.phase === 'playing' || state.phase === 'results') && !isCustomRound ? state.roundId
    : null
  useRoundTheme(themeRoundId)

  function beginRound(id: RoundId, count: number) {
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

  function goHome() {
    home()
    setLogoOutcome(null)
    setView('home')
  }

  // ── جولة الشعار ──
  if (view === 'logos') {
    return (
      <LogoRound
        count={logoCount}
        onFinish={(known, total, missed) => {
          setIsRecord(saveBest('logos', known))
          setLogoOutcome({ known, total, missed })
          setView('logoResults')
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

  if (view === 'custom') {
    return <CustomBuilder onStart={beginCustom} onBack={goHome} />
  }

  if (view === 'credits') {
    return <Credits onBack={goHome} />
  }

  return (
    <Home
      onStart={beginRound}
      onCustom={() => setView('custom')}
      onCredits={() => setView('credits')}
    />
  )
}
