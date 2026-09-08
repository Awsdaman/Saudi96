import { useState } from 'react'
import type { RevealKind } from '../game/types'
import './RevealImage.css'

interface Props {
  src: string
  kind: RevealKind
  /** بعد الإجابة تظهر الصورة كاملة فوراً */
  revealed: boolean
  /**
   * الشعارات كثيراً ما تكون داكنة اللون بخلفية شفافة،
   * فتختفي فوق سطح اللعبة الداكن — لذا تُعرض على لوح فاتح.
   */
  plate?: 'light' | 'dark'
  /** اسم الجهة أو المعلم — يصير وصفاً بديلاً بعد الكشف وحده */
  label?: string
  /** صور الأشخاص طولية، فإطار 4:3 يهدر ارتفاعها ويصغّر الوجه على الشاشة */
  frame?: 'wide' | 'portrait'
}

export function RevealImage({ src, kind, revealed, plate = 'dark', label, frame = 'wide' }: Props) {
  const cls = `reveal reveal-${plate}${frame === 'portrait' ? ' reveal-portrait' : ''}`
  // فارغ ما دامت الصورة هي اللغز: وصفها قبل الكشف يُفسده
  const alt = revealed && label ? label : ''
  const [expanded, setExpanded] = useState(false)
  // زرّ الحجم الكامل يظهر بعد اكتمال حركة الكشف الذاتية (أو فوراً حين
  // لا حركة أصلاً) — لا قبلها، وإلا فتح ثغرةً تكشف اللغز قبل أوانه.
  // يُعاد ضبطه تلقائياً عند كل سؤال جديد لأن Play.tsx يُركِّب هذا
  // المكوّن من جديد بمفتاح السؤال (key={question.id}).
  const [settled, setSettled] = useState(kind === 'none')
  const canExpand = revealed || settled

  const lightbox = expanded && (
    <div
      className="reveal-lightbox-backdrop"
      onClick={() => setExpanded(false)}
      role="presentation"
    >
      <img className="reveal-lightbox-img" src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
      <button
        className="reveal-lightbox-close"
        onClick={() => setExpanded(false)}
        aria-label="إغلاق"
      >
        ✕
      </button>
    </div>
  )

  const expandButton = canExpand && (
    <button
      className="reveal-expand"
      onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
      aria-label="فتح الصورة بالحجم الكامل"
    >
      ⤢
    </button>
  )

  if (kind === 'blur') {
    // للشعارات المبنية على الرمز الوطني: الاسم مضبَّب، واللون والتكوين هما الدليل.
    // الانقشاع حركةٌ ذاتية بمدّةٍ ثابتة (CSS)، لا مرتبطة بمؤقّت اللعبة —
    // key={src} يعيد تشغيلها من الصفر عند كل سؤال جديد.
    return (
      <div className={cls}>
        <img
          key={src}
          className={`reveal-img ${revealed ? '' : 'reveal-blur-anim'}`}
          src={src}
          alt={alt}
          style={revealed ? { filter: 'none' } : undefined}
          onAnimationEnd={() => setSettled(true)}
        />
        {expandButton}
        {lightbox}
      </div>
    )
  }

  if (kind === 'zoom') {
    // تبدأ من تفصيل مقصوص ثم تتّسع الصورة — حركةٌ ذاتية بمدّةٍ ثابتة،
    // لا مرتبطة بمؤقّت اللعبة (لا مؤقّت أصلاً بعد اليوم)
    return (
      <div className={`${cls} reveal-clip`}>
        <img
          key={src}
          className={`reveal-img ${revealed ? '' : 'reveal-zoom-anim'}`}
          src={src}
          alt={alt}
          style={revealed ? { transform: 'scale(1)' } : undefined}
          onAnimationEnd={() => setSettled(true)}
        />
        {expandButton}
        {lightbox}
      </div>
    )
  }

  return (
    <div className={cls}>
      <img className="reveal-img" src={src} alt={alt} />
      {expandButton}
      {lightbox}
    </div>
  )
}
