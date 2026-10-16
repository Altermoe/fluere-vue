/**
 * 仓库地址的**单一事实源**（0.5.7）。
 *
 * 此前 `REPOSITORY_URL` 写在 `components/github-link.vue` 内部；0.5.7 起它有第二个
 * 消费方（任务栏中间的 GitHub 固定入口，见 shell-taskbar.vue）—— 散成两份字面量
 * 一旦改仓库地址就会漂移，因此抽成 util（与 `docs-version.ts` 同一层：站点常量）。
 */
export const REPOSITORY_URL = 'https://github.com/Altermoe/fluere-vue'
