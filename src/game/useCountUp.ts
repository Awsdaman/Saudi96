import { useEffect, useRef, useState } from 'react'

/**
 * يُصعّد الرقم المعروض إلى قيمته الجديدة بدل أن يقفز إليها.
 *
 * في لعبة تُقدَّم لمجموعة، تصاعد النقاط هو لحظة التشويق نفسها؛
 * والقفز بين إطارين يبتلعها كاملةً.
 */
export function useCountUp(target: number, ms = 600): number {
  // قاعدة prefers-reduced-motion في index.css تحكم انتقالات CSS وحدها،
  // وهذا رسمٌ بالـJS — فيُقرأ التفضيل هنا صراحةً. ويُقرأ مرة واحدة:
  // تغييره أثناء الجولة أندر من أن يستحقّ مستمعاً.
  const [still] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const [shown, setShown] = useState(target)
  const from = useRef(target)

  useEffect(() => {
    if (still) return

    const start = performance.now()
    const a = from.current
    let raf = 0

    // المتصفّح يوقف إطارات الرسم في التبويب المخفيّ، فلو اكتفينا بها
    // لبقي الرقم المعروض قديماً — لا ساكناً فحسب بل خاطئاً: صفرٌ
    // بينما النتيجة الحقيقية مئات. هذا المؤقّت يضمن بلوغه قيمته.
    const settle = window.setTimeout(() => {
      from.current = target
      setShown(target)
    }, ms + 80)

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setShown(Math.round(a + (target - a) * eased))
      if (t < 1) {
        raf = requestAnimationFrame(step)
      } else {
        from.current = target
        window.clearTimeout(settle)
      }
    }

    raf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(settle)
    }
  }, [target, ms, still])

  return still ? target : shown
}
