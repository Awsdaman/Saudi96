import { useEffect, useRef, useState } from 'react'

interface Props {
  src: string
  duration: number
  enabled: boolean
  onHeard: () => void
  onError: (failed: boolean) => void
}

export function SongAudio({ src, duration, enabled, onHeard, onError }: Props) {
  const audio = useRef<HTMLAudioElement>(null)
  const [status, setStatus] = useState<'ready' | 'loading' | 'playing' | 'ended' | 'blocked' | 'error'>('ready')
  const [elapsed, setElapsed] = useState(0)
  const request = useRef(0)
  const watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latest = useRef({ enabled, onHeard, onError })
  useEffect(() => { latest.current = { enabled, onHeard, onError } })

  function stop() {
    request.current++
    clearTimeout(watchdog.current)
    audio.current?.pause()
    setStatus((s) => s === 'playing' || s === 'loading' ? 'ready' : s)
  }

  async function play() {
    const el = audio.current
    if (!el || !latest.current.enabled || document.hidden) return
    const token = ++request.current
    clearTimeout(watchdog.current)
    el.pause()
    if (el.error) el.load()
    el.currentTime = 0
    setElapsed(0)
    setStatus('loading')
    latest.current.onError(false)
    watchdog.current = setTimeout(() => {
      if (token !== request.current) return
      request.current++
      el.pause()
      setStatus('error')
      latest.current.onError(true)
    }, 12000)
    try {
      await el.play()
      if (token !== request.current) return
      clearTimeout(watchdog.current)
    } catch (error) {
      if (token !== request.current) return
      clearTimeout(watchdog.current)
      const blocked = error instanceof DOMException && error.name === 'NotAllowedError'
      setStatus(blocked ? 'blocked' : 'error')
      latest.current.onError(!blocked)
    }
  }

  useEffect(() => {
    // قد يمنع المتصفح التشغيل التلقائي؛ زر التشغيل يبقى متاحاً دائماً.
    void play()
    const el = audio.current
    const hide = () => { if (document.hidden) stop() }
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('pagehide', stop)
    return () => {
      stop()
      el?.pause()
      document.removeEventListener('visibilitychange', hide)
      window.removeEventListener('pagehide', stop)
    }
  }, [])

  useEffect(() => {
    // حالة الزر تعكس إيقاف عنصر الصوت الخارجي، حتى أثناء انتظار التحميل.
    // eslint-disable-next-line react/set-state-in-effect
    if (!enabled) stop()
  }, [enabled])

  const playing = status === 'playing'
  const label = status === 'loading' ? 'جارٍ تحميل المقطع…'
    : status === 'error' ? 'إعادة المحاولة'
    : playing ? 'إيقاف المقطع'
    : status === 'ended' || elapsed > 0 ? 'إعادة المقطع' : 'تشغيل المقطع'

  return (
    <div className="song-audio">
      <audio ref={audio} src={src} preload="auto"
        onPlaying={() => {
          if (!latest.current.enabled || document.hidden) { stop(); return }
          clearTimeout(watchdog.current)
          setStatus('playing')
          latest.current.onError(false)
          latest.current.onHeard()
        }}
        onTimeUpdate={() => setElapsed(Math.min(duration, audio.current?.currentTime ?? 0))}
        onWaiting={() => {
          if (audio.current?.paused) return
          setStatus('loading')
          clearTimeout(watchdog.current)
          watchdog.current = setTimeout(() => {
            request.current++
            audio.current?.pause()
            setStatus('error')
            latest.current.onError(true)
          }, 12000)
        }}
        onPause={() => setStatus((s) => s === 'playing' || s === 'loading' ? 'ready' : s)}
        onEnded={() => { clearTimeout(watchdog.current); setStatus('ended'); setElapsed(duration) }}
        onError={() => { clearTimeout(watchdog.current); setStatus('error'); latest.current.onError(true) }}
      />
      <button className="song-listen" onClick={() => playing || status === 'loading' ? stop() : void play()}
        disabled={!enabled} aria-label={label} aria-busy={status === 'loading'}>
        <svg viewBox="0 0 48 48" aria-hidden="true">
          {playing || status === 'loading'
            ? <><path d="M17 13v22M31 13v22" /></>
            : <path d="m18 11 20 13-20 13Z" />}
        </svg>
        <span>{label}</span>
      </button>
      <div className="song-time" dir="ltr">
        <span>{Math.floor(elapsed)} / {Number(duration.toFixed(1))}</span>
        <span lang="ar-SA" dir="rtl">ثانية</span>
      </div>
      <progress className="song-progress" max={duration} value={elapsed} aria-label="تقدّم المقطع" dir="ltr" />
      {(status === 'error' || status === 'blocked') && <p className="song-audio-note" role="status">
        {status === 'error' ? 'تعذّر تشغيل المقطع. أعد المحاولة أو تجاوز هذه الأغنية بلا عقوبة.'
          : 'اضغط تشغيل المقطع لبدء الاستماع.'}
      </p>}
    </div>
  )
}
