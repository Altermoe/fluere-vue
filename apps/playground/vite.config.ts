import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

/**
 * Playground（视觉回归页）的 Vite 配置。
 *
 * 与文档站不同，这里**显式 alias 到各包的源码**：工作区包的 `exports` 本就指向源码，
 * 但 Vite 从 `apps/playground` 起步时把 `node_modules/@fluere-vue/*` 解析成真实路径
 * （pnpm 链接），落在 app root 之外；显式 alias 后 HMR 与 `server.fs.allow` 都不必额外放宽。
 *
 * 样式来源与文档站一致：`@fluere-vue/ui` 入口会引 `@fluere-vue/designs/tokens.css`
 * 与共享原语 `focus-visual.css`，各组件 SFC 自带 scoped 样式。
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@fluere-vue/designs/tokens.css': fileURLToPath(
        new URL('../../packages/designs/generated/tokens.css', import.meta.url),
      ),
      '@fluere-vue/designs': fileURLToPath(
        new URL('../../packages/designs/src/index.ts', import.meta.url),
      ),
      '@fluere-vue/hooks': fileURLToPath(
        new URL('../../packages/hooks/src/index.ts', import.meta.url),
      ),
      '@fluere-vue/icons': fileURLToPath(
        new URL('../../packages/icons/src/index.ts', import.meta.url),
      ),
      '@fluere-vue/themes': fileURLToPath(
        new URL('../../packages/themes/src/index.ts', import.meta.url),
      ),
      '@fluere-vue/utils': fileURLToPath(
        new URL('../../packages/utils/src/index.ts', import.meta.url),
      ),
      '@fluere-vue/ui': fileURLToPath(new URL('../../packages/ui/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 60728,
  },
})
