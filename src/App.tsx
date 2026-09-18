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
import { SongPlay } from './screens/SongPlay'

type View = 'home' | 'custom' | 'logos' | 'logoResults' | 'credits'

interface LogoOutcome { known: number; total: number; missed: Entity[] }

export default function App() {
  return <Game />
}

function Game() {
  const { state, question, start, answer, next, home, songAction, judgeSong, skipUnavailable } = useGame()
  const [view, setView] = useState<View>('home')
  const [logoCount, setLogoCount] = useState(12)
  const [isRecord, setIsRecord] = useState(false)
  const [logoOutcome, setLogoOutcome] = useState<LogoOutcome | null>(null)
  const lastCustom = useRef<{ pool: Question[]; count: number } | null>(null)

  // الجولة المخصّصة لها هوية تخزين مستقلة، وتحتفظ بلون اللعبة العام.
  const themeRoundId =
    view === 'logos' || view === 'logoResults' ? 'logos'
    : (state.phase === 'playing' || state.phase === 'results') && state.roundId !== 'custom' ? state.roundId
    : null
  useRoundTheme(themeRoundId)

  function beginRound(id: RoundId, count: number, easy: boolean) {
    setIsRecord(false)
    lastCustom.current = null
    // «خمّن الشعار» بالنمط الصعب يبقى بطاقات التذكّر الحرّ المخصّصة؛
    // بالنمط السهل يمرّ عبر مسار الاختيار من متعدد العادي مثل أي جولة —
    // نفس بنك الأسئلة (logoQuestions) الذي تستعيره «لعبتي» أصلاً.
    if (id === 'logos' && !easy) {
      setLogoCount(count)
      setView('logos')
      return
    }
    const meta = ROUNDS.find((r) => r.id === id)!
    setView('home')
    // بدء جولةٍ عادية يُبطل «لعبتي» السابقة، وإلا أعاد زرّ «جولة أخرى»
    // في شاشة النتيجة تلك الجولةَ المخصّصة بدل الجولة التي انتهت للتوّ
    lastCustom.current = null
    start(id, meta.title, poolFor(id), count)
  }

  function beginCustom(pool: Question[], count: number) {
    lastCustom.current = { pool, count }
    setIsRecord(false)
    setView('home')
    start('custom', 'لعبتي', pool, count)
  }

  // الانتقال إلى النتائج يمرّ دائماً عبر next، فهنا تُحفظ النتيجة —
  // في معالج الحدث لا في تأثير جانبي، تفادياً لتصيير متتالٍ.
  function handleNext() {
    if (!state.resolved) return
    const isLast = state.index + 1 >= state.questions.length
    // النمط السهل لـ«خمّن الشعار» يسجّل نقاطاً (كأي جولة اختيارٍ من
    // متعدد)، بينما بطاقات التذكّر الحرّ تسجّل عدد «عرفتها» تحت المفتاح
    // logos نفسه — مقياسان لا يُقارَنان، فيُفرَد للنمط السهل مفتاحه
    // الخاص كي لا يُفسد أحدهما رقم الآخر القياسي.
    if (isLast && state.roundId) {
      const bestKey = state.roundId === 'logos' ? 'logos-mc' : state.roundId
      setIsRecord(saveBest(bestKey, state.score))
    }
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
          setIsRecord(false)
          const c = lastCustom.current
          if (c) beginCustom(c.pool, c.count)
          else start(state.roundId!, state.title, poolFor(state.roundId!), state.questions.length)
        }}
        onHome={goHome}
      />
    )
  }

  if (state.phase === 'playing' && question) {
    if (question.kind === 'song') return (
      <SongPlay key={question.id} state={state} question={question}
        onAction={songAction} onJudge={judgeSong} onUnavailable={skipUnavailable}
        onNext={handleNext} onQuit={goHome} />
    )
    return (
      <Play
        key={question.id}
        state={state}
        question={question}
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
