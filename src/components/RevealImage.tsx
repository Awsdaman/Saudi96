import type { RevealKind } from '../game/types'
import './RevealImage.css'

interface Props {
  src: string
  /** 0 = مخفية · 1 = ظاهرة كاملة */
  progress: number
  kind: RevealKind
  /** بعد الإجابة تظهر الصورة كاملة فوراً */
  revealed: boolean
  /**
   * الشعارات كثيراً ما تكون داكنة اللون بخلفية شفافة،
   * فتختفي فوق سطح اللعبة الداكن — لذا تُعرض على لوح فاتح.
   */
  plate?: 'light' | 'dark'
  /** صور الأشخاص طولية، فإطار 4:3 يهدر ارتفاعها ويصغّر الوجه على الشاشة */
  frame?: 'wide' | 'portrait'
}

export function RevealImage({ src, progress, kind, revealed, plate = 'dark', frame = 'wide' }: Props) {
  const p = revealed ? 1 : Math.min(1, Math.max(0, progress))
  const cls = `reveal reveal-${plate}${frame === 'portrait' ? ' reveal-portrait' : ''}`

  if (kind === 'silhouette') {
    // الظل أولاً: الشكل وحده بلا لون. ثم يذوب اللون تدريجياً.
    // من عرف الجهة من ظلّ رمزها استحق النقاط كاملةً.
    const colorIn = Math.max(0, (p - 0.45) / 0.55)
    return (
      <div className={cls}>
        <img className="reveal-img reveal-shadow" src={src} alt="" style={{ opacity: 1 - colorIn }} />
        <img className="reveal-img" src={src} alt="" style={{ opacity: colorIn }} />
      </div>
    )
  }

  if (kind === 'blur') {
    // للشعارات المبنية على الرمز الوطني: الاسم مضبَّب، واللون والتكوين هما الدليل.
    return (
      <div className={cls}>
        <img
          className="reveal-img"
          src={src}
          alt=""
          style={{ filter: `blur(${Math.pow(1 - p, 1.8) * 28}px)` }}
        />
      </div>
    )
  }

  if (kind === 'zoom') {
    // تبدأ من تفصيل مقصوص ثم تتّسع الصورة
    return (
      <div className={`${cls} reveal-clip`}>
        <img
          className="reveal-img"
          src={src}
          alt=""
          style={{ transform: `scale(${1 + (1 - p) * 2.6})` }}
        />
      </div>
    )
  }

  return (
    <div className={cls}>
      <img className="reveal-img" src={src} alt="" />
    </div>
  )
}
