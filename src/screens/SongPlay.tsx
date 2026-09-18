import { useEffect, useState } from 'react'
import { AwardPopup } from '../components/AwardPopup'
import { HowToModal } from '../components/HowToModal'
import { ROUNDS } from '../game/content'
import { scoreSong } from '../game/engine'
import type { AudienceMessage } from '../game/hostSync'
import { ScoreBar } from '../components/ScoreBar'
import { SongAudio } from '../components/SongAudio'
import type { GameState } from '../game/useGame'
import type { SongPhase, SongQuestion, Team } from '../game/types'
import './Play.css'
import './SongPlay.css'

interface Props {
  state: GameState
  question: SongQuestion
  onAction: (type: 'song-clue' | 'song-reveal' | 'song-heard', phase: SongPhase) => void
  onJudge: (correct: boolean) => void
  onUnavailable: () => void
  onNext: () => void
  onQuit: () => void
  teams?: [Team, Team] | null
  onAdjust?: (index: 0 | 1, delta: number) => void
  sendAudience?: (msg: AudienceMessage) => void
}

export function SongPlay({
  state, question, onAction, onJudge, onUnavailable, onNext, onQuit, teams, onAdjust, sendAudience,
}: Props) {
  const [howTo, setHowTo] = useState(false)
  const [failed, setFailed] = useState(false)
  const [awarded, setAwarded] = useState(false)
  const { song } = question
  const phase = state.songPhase
  const revealed = state.songRevealed
  const record = state.resolved ? state.records[state.records.length - 1] : null

  // العنوان يصل للجمهور بعد الحسم (resolved) لا عند الكشف الذاتي
  // (revealed) — تلك لحظة تحقّق المستضيف بنفسه قبل أن يُقرّر.
  useEffect(() => {
    sendAudience?.({
      type: 'question',
      data: {
        roundTitle: state.title,
        itemLabel: 'أغنية',
        index: state.index,
        total: state.questions.length,
        prompt: question.prompt,
        ...(state.resolved ? { correctText: song.artistAr ? `${song.titleAr} — ${song.artistAr}` : song.titleAr } : {}),
      },
    })
  }, [
    sendAudience, state.resolved, state.title, state.index, state.questions.length,
    question.prompt, song.titleAr, song.artistAr,
  ])
  const meta = ROUNDS.find((r) => r.id === 'songs')!
  // بعد المرحلة الثالثة (المقطع المشهور) لا مقطع تالٍ — الزرّ هناك
  // يستسلم للسؤال بدل أن ينتقل، فيحمل نصّاً مختلفاً عن مرحلتَي التقدّم
  const isLastPhase = phase === 3
  const nextPhasePoints = !isLastPhase ? scoreSong((phase + 1) as SongPhase, state.streak) : null
  const src = phase === 1 ? song.clips!.intro3 : phase === 2 ? song.clips!.intro8 : song.clips!.famous
  const firstLength = (song.intro3End ?? 3) - (song.intro3Start ?? 0)
  const secondLength = (song.intro8End ?? 8) - (song.intro8Start ?? 0)
  const duration = phase === 1 ? firstLength : phase === 2 ? secondLength : song.famousEnd! - song.famousStart!
  const labels = [
    !song.intro3Start && firstLength === 3 ? 'أول 3 ثوانٍ' : `المقطع الأول · ${firstLength.toFixed(2).replace(/\.?0+$/, '')} ث`,
    !song.intro8Start && secondLength === 8 ? 'أول 8 ثوانٍ' : `المقطع الثاني · ${secondLength.toFixed(2).replace(/\.?0+$/, '')} ث`,
    'المقطع المشهور',
  ]

  return (
    <main className="play song-play" lang="ar-SA" dir="rtl" onKeyDown={(e) => {
      if (e.key === 'Escape' && !howTo) { e.preventDefault(); onQuit() }
    }}>
      <div className="ask">
        <ScoreBar index={state.index} total={state.questions.length} score={state.score} streak={state.streak}
          roundTitle={state.title} itemLabel={state.roundId === 'songs' ? 'أغنية' : 'سؤال'} />
        <h1 className="prompt">{question.prompt}</h1>
        <ol className="song-phases" aria-label="مراحل التخمين">
          {labels.map((label, i) => (
            <li key={label} className={phase === i + 1 ? 'is-current' : phase > i + 1 ? 'is-past' : ''}
              aria-current={phase === i + 1 ? 'step' : undefined}>
              <span className="song-phase-num ltr">{i + 1}</span><span>{label}</span>
            </li>
          ))}
        </ol>

        {!revealed && <p className="song-potential"><strong className="ltr">{scoreSong(phase, state.streak)}</strong> نقطة</p>}
        <SongAudio key={`${question.id}-${phase}`} src={src} duration={duration}
          enabled={!revealed && !howTo} onHeard={() => onAction('song-heard', phase)} onError={setFailed} />

        {!revealed ? (
          <div className="song-decision">
            <div className="song-actions">
              <button className="btn btn-primary" disabled={!state.songHeard || howTo}
                onClick={() => onAction('song-reveal', phase)}>عرفت الأغنية</button>
              <button className="btn btn-quiet song-next-btn" disabled={!state.songHeard || howTo}
                onClick={() => { setFailed(false); onAction('song-clue', phase) }}>
                {isLastPhase ? 'لم أعرفها' : (
                  <>
                    المقطع التالي
                    <small className="song-next-hint">تنخفض النقاط إلى <span className="ltr">{nextPhasePoints}</span></small>
                  </>
                )}
              </button>
            </div>
            {failed && <button className="btn btn-quiet" onClick={onUnavailable}>تجاوز الأغنية بلا عقوبة</button>}
          </div>
        ) : (
          <section className="song-answer" aria-live="polite">
            <h2>{song.titleAr}</h2>
            {song.artistAr && <p>{song.artistAr}</p>}
            {!state.resolved ? (
              <div className="song-actions">
                <button className="btn song-yes" onClick={() => onJudge(true)}>إجابتي صحيحة</button>
                <button className="btn song-no" onClick={() => onJudge(false)}>إجابتي خاطئة</button>
              </div>
            ) : (
              <>
                <p className={record?.correct ? 'song-success' : ''}>
                  {record?.unavailable ? 'لم تُحتسب هذه الأغنية، وسلسلتك محفوظة.'
                    : record?.correct ? <>إجابة صحيحة · <span className="ltr">+{record.points}</span> نقطة</>
                    : 'لم تعرفها هذه المرة · بلا نقاط'}
                </p>
                <button className="btn btn-primary" onClick={onNext}>
                  {state.index + 1 === state.questions.length ? 'النتيجة' : 'التالي'}
                </button>
              </>
            )}
          </section>
        )}
        <div className="play-foot">
          <button className="btn btn-quiet" onClick={onQuit}>إنهاء الجولة</button>
          <button className="btn btn-quiet" onClick={() => setHowTo(true)}>كيف تلعب؟</button>
        </div>
      </div>
      {howTo && <HowToModal title={meta.title} steps={meta.howTo} onClose={() => setHowTo(false)} />}

      {teams && record?.correct && !awarded && (
        <AwardPopup
          points={record.points}
          teams={teams}
          // توزيع النقاط يُنهي هذه الأغنية — ينتقل للتالي على طول، بلا
          // ضغطة «التالي» إضافية بعد إغلاق النافذة.
          onAward={(i) => { onAdjust?.(i, record.points); setAwarded(true); onNext() }}
          onSkip={() => { setAwarded(true); onNext() }}
        />
      )}
    </main>
  )
}
