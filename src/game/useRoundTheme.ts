import { useEffect } from 'react'
import { ROUND_THEME } from './roundTheme'
import type { RoundId } from './types'

/**
 * يلوّن الجولة النشطة بقيمتها من هوية اليوم الوطني — يُستدعى مرّة
 * واحدة في أعلى شجرة الشاشات (App.tsx)، ويضبط --round-color على
 * الجذر (يقرأه index.css فيصبغ به --green-bright). بلا جولةٍ نشطة
 * تُزال القيمة فيعود اللون الافتراضي.
 */
export function useRoundTheme(id: RoundId | null) {
  useEffect(() => {
    const root = document.documentElement
    const theme = id ? ROUND_THEME[id] : undefined

    if (!theme) {
      root.style.removeProperty('--round-color')
      return
    }

    root.style.setProperty('--round-color', theme.color)

    return () => {
      root.style.removeProperty('--round-color')
    }
  }, [id])
}
