import { useEffect } from 'react'
import { onPresenterConnection, presenterIsOpen } from './presenter'

/**
 * يبدّل سطح العرض بين «ليل» و«ضوء».
 *
 * اتّصال شاشة المقدّم يعني أن هذه النافذة صارت معروضة على جهاز العرض —
 * فالتحوّل استنتاج من واقع الحال لا تفضيلٌ يبحث عنه المقدّم في الإعدادات.
 * الإشارة موجودة في presenter.ts منذ البداية ولم يكن أحد يستمع إليها.
 */
export function useSurface() {
  useEffect(() => {
    const apply = (open: boolean) => {
      document.documentElement.dataset.surface = open ? 'stage' : 'night'
    }
    apply(presenterIsOpen())
    return onPresenterConnection(apply)
  }, [])
}
