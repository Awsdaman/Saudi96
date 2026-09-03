import { useEffect } from 'react'
import { ROUND_THEME, tapestryUrl } from './roundTheme'
import type { RoundId } from './types'

/**
 * يلوّن الجولة النشطة بقيمتها من هوية اليوم الوطني — يُستدعى مرّة
 * واحدة في أعلى شجرة الشاشات (App.tsx)، ويضبط متغيّرين على الجذر:
 * --round-night/--round-stage (يختار index.css بينهما حسب السطح
 * الحالي) و--round-carpet (نسيج القيمة، تستعمله شارة التعليمات).
 * بلا جولةٍ نشطة تُزال المتغيّرات فيعود اللون الافتراضي.
 */
export function useRoundTheme(id: RoundId | null) {
  useEffect(() => {
    const root = document.documentElement
    const theme = id ? ROUND_THEME[id] : undefined

    if (!theme) {
      root.style.removeProperty('--round-night')
      root.style.removeProperty('--round-stage')
      root.style.removeProperty('--round-carpet')
      return
    }

    root.style.setProperty('--round-night', theme.night)
    root.style.setProperty('--round-stage', theme.stage)
    const carpet = tapestryUrl(id!)
    if (carpet) root.style.setProperty('--round-carpet', `url(${carpet})`)

    return () => {
      root.style.removeProperty('--round-night')
      root.style.removeProperty('--round-stage')
      root.style.removeProperty('--round-carpet')
    }
  }, [id])
}
