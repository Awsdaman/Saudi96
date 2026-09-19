import { useLayoutEffect } from 'react'

/**
 * يُفعّل تكبير شاشات الأسئلة (html.stage في index.css) ما دامت شاشة
 * سؤالٍ معروضة. useLayoutEffect لا useEffect: التغيير يقع قبل الرسم،
 * فلا تومض الشاشة بحجمها الصغير لحظةً عند كل انتقال.
 */
export function useStageScale(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return
    const root = document.documentElement
    root.classList.add('stage')
    return () => root.classList.remove('stage')
  }, [active])
}
