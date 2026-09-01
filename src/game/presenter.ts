/**
 * قناة نافذة المقدّم.
 *
 * تُستخدم postMessage عبر مقبض النافذة لا BroadcastChannel:
 * اللعبة تُفتح غالباً من القرص مباشرة (file://) حيث يأخذ كل ملف أصلاً معزولاً،
 * فتفشل القنوات التي تشترط وحدة الأصل. أما postMessage فيعمل عبر الأصول أصلاً.
 */

export interface PresenterState {
  kind: 'idle' | 'mcq' | 'logo'
  roundTitle?: string
  index?: number
  total?: number
  prompt?: string
  options?: string[]
  answerIndex?: number
  /** نص الإجابة الصحيحة — أهم ما في الشاشة */
  answer?: string
  explanation?: string
  /** صورة توضيحية: الشعار الكامل أو صورة المعلم */
  image?: string
  revealed?: boolean
  score?: number
  streak?: number
}

const MSG = 'saudiknowledge:presenter'

let win: Window | null = null
let last: PresenterState = { kind: 'idle' }
const connectedCbs = new Set<(open: boolean) => void>()

export function presenterIsOpen(): boolean {
  return !!win && !win.closed
}

/** يُخطر الواجهة عند اتصال شاشة المقدّم أو انقطاعها */
export function onPresenterConnection(cb: (open: boolean) => void): () => void {
  connectedCbs.add(cb)
  return () => {
    connectedCbs.delete(cb)
  }
}

export function closePresenter() {
  if (presenterIsOpen()) win!.close()
  win = null
  connectedCbs.forEach((cb) => cb(false))
}

export function sendToPresenter(state: PresenterState) {
  last = state
  if (!presenterIsOpen()) return
  try {
    win!.postMessage({ type: MSG, state }, '*')
  } catch {
    // النافذة أُغلقت بين الفحص والإرسال — لا يضرّ
  }
}

/**
 * ترد على إعلان الجاهزية القادم من نافذة المقدّم.
 *
 * الشاشة تُفتح برابط target="_blank" لا بـ window.open، لأن حاجب النوافذ
 * المنبثقة يمنع الثانية ولا يمنع الأولى. ولأن الرابط لا يعيد مقبضاً،
 * نلتقط المقبض من e.source عند وصول إعلان الجاهزية.
 */
export function watchPresenterHandshake() {
  const onMsg = (e: MessageEvent) => {
    if (e.data?.type === `${MSG}:ready`) {
      win = (e.source as Window) ?? win
      connectedCbs.forEach((cb) => cb(true))
      sendToPresenter(last)
    }
  }
  window.addEventListener('message', onMsg)
  return () => window.removeEventListener('message', onMsg)
}

/** تُستدعى داخل نافذة المقدّم نفسها */
export function listenAsPresenter(onState: (s: PresenterState) => void) {
  const onMsg = (e: MessageEvent) => {
    if (e.data?.type === MSG) onState(e.data.state as PresenterState)
  }
  window.addEventListener('message', onMsg)
  // أعلن الجاهزية للنافذة الأم. opener عند الفتح في نافذة جديدة،
  // و parent عند التضمين في إطار — ندعم الاثنين ليعمل في الحالتين.
  const host = window.opener ?? (window.parent !== window ? window.parent : null)
  try {
    host?.postMessage({ type: `${MSG}:ready` }, '*')
  } catch {
    // فُتحت مباشرةً بلا نافذة مضيفة
  }
  return () => window.removeEventListener('message', onMsg)
}

export function isPresenterWindow(): boolean {
  return location.hash === '#presenter'
}
