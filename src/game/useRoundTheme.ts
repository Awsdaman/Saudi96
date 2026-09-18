import { useEffect } from 'react'
import { ROUND_THEME } from './roundTheme'
import type { RoundId } from './types'

/**
 * يلوّن الجولة النشطة بقيمتها من هوية اليوم الوطني — يُستدعى مرّة
 * واحدة في أعلى شجرة الشاشات (App.tsx)، ويضبط --round-color على
 * الجذر (يقرأه index.css فيصبغ به --green-bright). بلا جولةٍ نشطة
 * تُزال القيمة فيعود اللون الافتراضي.
 *
 * overrideColor يتجاوز لون الجولة — تستخدمه «لعبتي» لتصبغ الخلفية
 * بلون فئة السؤال الحالي (sourceTheme.ts) بدل البقاء بلا هويةٍ طوال
 * الجولة المخصَّصة، إذ لا لونَ ثابتاً لها هي نفسها.
 */
export function useRoundTheme(id: RoundId | null, overrideColor?: string | null) {
  useEffect(() => {
    const root = document.documentElement
    const color = overrideColor ?? (id ? ROUND_THEME[id]?.color : undefined)

    if (!color) {
      root.style.removeProperty('--round-color')
      return
    }

    root.style.setProperty('--round-color', color)

    return () => {
      root.style.removeProperty('--round-color')
    }
  }, [id, overrideColor])
}
