import { useEffect } from 'react'
import { ROUND_THEME, tapestryUrl } from './roundTheme'
import type { RoundId } from './types'

/**
 * يلوّن الجولة النشطة بقيمتها من هوية اليوم الوطني — يُستدعى مرّة
 * واحدة في أعلى شجرة الشاشات (App.tsx)، ويضبط متغيّرين على الجذر:
 * --round-color (يقرأه index.css فيصبغ به --green-bright) و
 * --round-carpet (نسيج القيمة). بلا جولةٍ نشطة تُزال المتغيّرات
 * فيعود اللون الافتراضي.
 */
export function useRoundTheme(id: RoundId | null) {
  useEffect(() => {
    const root = document.documentElement
    const theme = id ? ROUND_THEME[id] : undefined

    if (!theme) {
      root.style.removeProperty('--round-color')
      root.style.removeProperty('--round-carpet')
      return
    }

    root.style.setProperty('--round-color', theme.color)
    const carpet = tapestryUrl(id!)
    if (carpet) root.style.setProperty('--round-carpet', `url(${carpet})`)

    return () => {
      root.style.removeProperty('--round-color')
      root.style.removeProperty('--round-carpet')
    }
  }, [id])
}
