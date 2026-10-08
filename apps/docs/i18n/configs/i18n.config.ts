/**
 * Vue I18n 运行时配置（@nuxtjs/i18n 内部用 createI18n 应用此配置）。
 *
 * - legacy: false —— 走 Composition API（当前文档站全部使用 useI18n composable）。
 * - fallbackLocale: 'zh-Hans' —— 英文 key 缺失时回退到默认语种；页面侧再叠加
 *   明确提示「该页暂无英文版」（见 pages/components/[...slug].vue），不做静默混杂。
 * - missingWarn / fallbackWarn：开发阶段打开，及时暴露漏翻 / 回退的 key；
 *   生产关闭，避免无谓告警刷屏。
 */
export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'zh-Hans',
  missingWarn: import.meta.env.DEV,
  fallbackWarn: import.meta.env.DEV,
}))
