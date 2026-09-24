/**
 * متى تتحدّث لوحة الإدارة وحدها — المستضيف لا يراقبها كل دقيقة، وكل
 * تحديثٍ يستهلك نحو 80 أمراً من حصّة Upstash المجانية:
 *  - كل ساعة ما دامت الصفحة ظاهرة (مفتوحةً طوال اليوم كل يوم ≈ 11% من
 *    حصّة 500 ألف أمر شهرياً، والأغلب أقلّ بكثير).
 *  - فور العودة إلى الصفحة إن مضى على آخر تحديثٍ أكثر من 10 دقائق،
 *    فيجد المستضيف أرقاماً حديثة كلما فتحها بلا ضغطة.
 *  - لا شيء والصفحة مخفية.
 */
export const AUTO_REFRESH_MS = 60 * 60 * 1000
export const STALE_ON_RETURN_MS = 10 * 60 * 1000

export function shouldRefreshOnReturn(lastLoadedAt: number, now: number): boolean {
  return now - lastLoadedAt > STALE_ON_RETURN_MS
}
