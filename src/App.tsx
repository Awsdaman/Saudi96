import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { TeamScoreboard } from './components/TeamScoreboard'
import { ROUNDS, poolFor } from './game/content'
import { AUDIENCE_CHANNEL, audienceUrl, isAudienceWindow } from './game/hostSync'
import type { AudienceMessage } from './game/hostSync'
import { sourceColor } from './game/sourceTheme'
import { saveBest } from './game/storage'
import { useGame } from './game/useGame'
import { useRoundTheme } from './game/useRoundTheme'
import { useStageScale } from './game/useStageScale'
import type { Entity, Question, RoundId, Team } from './game/types'
import { AudienceView } from './screens/AudienceView'
import { Credits } from './screens/Credits'
import { CustomBuilder } from './screens/CustomBuilder'
import { Home } from './screens/Home'
import { LogoResults } from './screens/LogoResults'
import { LogoRound } from './screens/LogoRound'
import { Play } from './screens/Play'
import { Results } from './screens/Results'
import { SongPlay } from './screens/SongPlay'
import { TeamSetup } from './screens/TeamSetup'

type View = 'home' | 'custom' | 'logos' | 'logoResults' | 'credits'

interface LogoOutcome { known: number; total: number; missed: Entity[] }

export default function App() {
  // تبويب الجمهور شجرة مكوّناتٍ مستقلّة تماماً — لا تشارك حالة أو
  // خطاطيف Game، فيبقى قرار الدور هنا بلا أثرٍ على قواعد الخطاطيف.
  return isAudienceWindow() ? <AudienceView /> : <Game />
}

function Game() {
  const { state, question, start, answer, next, home, songAction, judgeSong, skipUnavailable } = useGame()
  const [view, setView] = useState<View>('home')
  const [logoCount, setLogoCount] = useState(12)
  const [isRecord, setIsRecord] = useState(false)
  const [logoOutcome, setLogoOutcome] = useState<LogoOutcome | null>(null)
  const lastCustom = useRef<{ pool: Question[]; count: number } | null>(null)

  // شاشة الفريقين تفتح الجلسة، مرّةً واحدة، قبل الرئيسية — انظر التعليق
  // في TeamSetup.tsx. null بعد «لعب بلا فرق» يخفي الشريط العائم كلياً.
  const [teamsReady, setTeamsReady] = useState(false)
  const [teams, setTeams] = useState<[Team, Team] | null>(null)
  // تبويب جمهورٍ مفتوح فعلاً على شاشة عرضٍ منفصلة — انظر hostSync.ts
  const [audienceOpen, setAudienceOpen] = useState(false)
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (!audienceOpen) return
    const channel = new BroadcastChannel(AUDIENCE_CHANNEL)
    channelRef.current = channel
    return () => { channel.close(); channelRef.current = null }
  }, [audienceOpen])

  function sendAudience(msg: AudienceMessage) {
    channelRef.current?.postMessage(msg)
  }

  useEffect(() => {
    if (audienceOpen) sendAudience({ type: 'teams', teams })
  }, [audienceOpen, teams])

  // الشاشات النشطة (اللعب، بطاقات الشعار) تُبلّغ الجمهور بنفسها سؤالاً
  // بسؤال؛ هنا تُبلَّغ حالات الانتظار والنتائج فقط.
  useEffect(() => {
    if (!audienceOpen || state.phase === 'playing' || view === 'logos') return
    if (state.phase === 'results' || view === 'logoResults') sendAudience({ type: 'results', score: state.score })
    else sendAudience({ type: 'idle' })
  }, [audienceOpen, view, state.phase, state.score])

  function adjustScore(index: 0 | 1, delta: number) {
    setTeams((prev) => {
      if (!prev) return prev
      const next = [...prev] as [Team, Team]
      next[index] = { ...next[index], score: Math.max(0, next[index].score + delta) }
      return next
    })
  }

  // يُلحَق الشريط العائم بكل شاشةٍ دون تكرار شرطه في كل مسار عودة أدناه.
  // رابط شاشة الجمهور يظهر معه دائماً — لا يعتمد على نجاح الفتح
  // التلقائي عند البدء، فيبقى بمتناول المستضيف لو حظره المتصفح أو أُغلقت
  // النافذة بالخطأ.
  function withScoreboard(node: ReactNode) {
    return teams ? (
      <>
        {node}
        <TeamScoreboard teams={teams} onAdjust={adjustScore} audienceHref={audienceOpen ? audienceUrl() : undefined} />
      </>
    ) : node
  }

  // الجولة المخصّصة لها هوية تخزين مستقلة، وتحتفظ بلون اللعبة العام.
  const themeRoundId =
    view === 'logos' || view === 'logoResults' ? 'logos'
    : (state.phase === 'playing' || state.phase === 'results') && state.roundId !== 'custom' ? state.roundId
    : null
  // «لعبتي» بلا لونٍ ثابتٍ خاصٍّ بها — بدل ذلك تُصبَغ الخلفية بلون
  // فئة السؤال الحالي (sourceTheme.ts)، فتتغيّر مع كل سؤال حسب مصدره
  // (جولة كاملة، فئة شخصياتٍ، أو تصنيفٌ معرفي) بدل البقاء بلون افتراضيٍّ ثابت.
  const customColor = state.roundId === 'custom' && state.phase === 'playing'
    ? sourceColor(question?.selectionSource)
    : null
  // يبقى استدعاء الخطّاف قبل أي عودةٍ مبكّرة — قواعد الخطاطيف تحظر
  // استدعاءه بترتيبٍ يختلف بين تصييرين لنفس المكوّن (شاشة الفريقين ثم الرئيسية)
  useRoundTheme(themeRoundId, customColor)
  // شاشات الأسئلة (اختيار، أغنية، بطاقات الشعار) تُكبَّر للعرض من بعيد؛
  // الرئيسية والنتائج والمصادر تبقى بحجمها. انظر index.css.
  useStageScale(view === 'logos' || (state.phase === 'playing' && !!question))

  if (!teamsReady) {
    return (
      <TeamSetup
        onStart={(a, b, withAudience) => {
          setTeams([{ name: a, score: 0 }, { name: b, score: 0 }])
          setAudienceOpen(withAudience)
          if (withAudience) window.open(audienceUrl(), 'saudiknowledge-audience')
          setTeamsReady(true)
        }}
        onSkip={() => { setTeams(null); setTeamsReady(true) }}
      />
    )
  }

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
    return withScoreboard(
      <LogoRound
        count={logoCount}
        teams={teams}
        onAdjust={adjustScore}
        sendAudience={audienceOpen ? sendAudience : undefined}
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
    return withScoreboard(
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
    return withScoreboard(
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
    if (question.kind === 'song') return withScoreboard(
      <SongPlay key={question.id} state={state} question={question}
        onAction={songAction} onJudge={judgeSong} onUnavailable={skipUnavailable}
        onNext={handleNext} onQuit={goHome}
        teams={teams} onAdjust={adjustScore} sendAudience={audienceOpen ? sendAudience : undefined} />
    )
    return withScoreboard(
      <Play
        key={question.id}
        state={state}
        question={question}
        onAnswer={answer}
        onNext={handleNext}
        onQuit={goHome}
        teams={teams}
        onAdjust={adjustScore}
        sendAudience={audienceOpen ? sendAudience : undefined}
      />
    )
  }

  if (view === 'custom') {
    return withScoreboard(<CustomBuilder onStart={beginCustom} onBack={goHome} />)
  }

  if (view === 'credits') {
    return withScoreboard(<Credits onBack={goHome} />)
  }

  return withScoreboard(
    <Home
      onStart={beginRound}
      onCustom={() => setView('custom')}
      onCredits={() => setView('credits')}
    />
  )
}
