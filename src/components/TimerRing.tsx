import './TimerRing.css'

interface Props {
  /** الثواني المتبقّية */
  left: number
  totalTime: number
}

/**
 * حلقة بدل الشريط.
 *
 * شريط بارتفاع خمسة بكسلات لا يُرى من آخر الغرفة؛ أما الزاوية فتُدرَك
 * من بعيد. وpathLength=100 يجعل الحساب نسبةً مئوية مباشرة مهما تغيّر
 * نصف القطر بين السطحين.
 */
export function TimerRing({ left, totalTime }: Props) {
  const pct = totalTime > 0 ? Math.max(0, Math.min(1, left / totalTime)) : 0
  const low = pct < 0.25

  return (
    <svg
      className={`ring ${low ? 'is-low' : ''}`}
      viewBox="0 0 36 36"
      role="timer"
      /* بلا aria-live: لو كان حيّاً لأعلن كل نبضة */
      aria-label={`بقي ${Math.ceil(left)} ثانية`}
    >
      <circle className="ring-track" cx="18" cy="18" r="15.9" />
      <circle
        className="ring-value"
        cx="18"
        cy="18"
        r="15.9"
        pathLength={100}
        strokeDasharray={`${pct * 100} 100`}
      />
    </svg>
  )
}
