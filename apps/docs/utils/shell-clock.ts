/**
 * 托盘时钟的格式化（0.5.6 `SystemTray`）—— 纯函数，无 DOM、无时区副作用。
 *
 * 为什么抽出来：`apps/docs` 是 Nuxt 应用，组件级测试不在 vitest 的 include 范围
 * （见 vitest.config.ts 注释，只有 `apps/docs/utils/**` 收集测试）。把
 * `Intl.DateTimeFormat` 的组装放在这里，时钟的 locale 行为才谈得上契约测试，
 * 而不是只靠浏览器肉眼看一眼。
 *
 * 口径（对齐 Windows 11 任务栏的两行时钟，**应用层构图、无 WinUI 来源**）：
 *  - 第一行时间、第二行日期，右对齐堆叠 —— 竖排让托盘宽度只取决于较宽的一行，
 *    窄档（移动端压缩布局）保时间时不用把整段文案挤成横排；
 *  - 格式全部交给 `Intl.DateTimeFormat` 按 locale 决定（24h / 12h、日期顺序），
 *    **不硬编码** `"HH:mm"`：zh 走 24 小时制（13:20），en 走 12 小时制（1:20 PM），
 *    与站点语言切换联动（todo 2.2「时钟随 locale」的验收口径）。
 */

/** 托盘时钟的两行文本 */
export interface TrayClockLines {
  /** 第一行：当前时间（locale 决定 12h / 24h） */
  time: string
  /** 第二行：日期（locale 决定顺序与分隔） */
  date: string
}

/**
 * 把一个时刻格式化为托盘时钟的两行文本。
 * @param date 当前时刻（由调用方决定刷新频率与时钟事实源）
 * @param locale 文档站语种（`zh-Hans` / `en`，`Intl` 认识的 BCP47 标签即可）
 */
export function formatTrayClock(date: Date, locale: string): TrayClockLines {
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date)
  const dateLine = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date)
  return { time, date: dateLine }
}
