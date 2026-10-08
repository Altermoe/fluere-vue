import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// Monorepo 统一测试配置（Vitest 5）。
//
// - 工作区包在 pnpm 的 .pnpm 虚拟 store 中，未提升到根 node_modules，普通解析找不到
//   @fluere-vue/*；这里用 resolve.alias 直接指到各包源文件，与 tsconfig.base.json 的
//   paths 保持一致（仅 @fluere-vue/ui 指到真实入口 packages/ui/index.ts）。
// - 环境统一为 jsdom：组件测试用 @vue/test-utils 挂载 SFC，需要 DOM。
// - include 限定 packages/** 与 apps/docs 的**纯工具函数**测试；apps/docs 是 Nuxt 应用，
//   其页面 / 组件测试需要 @nuxt/test-utils 与 Nuxt 运行时（自动导入、`~` 别名），不在本范围。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 更具体的子路径别名必须排在包名别名之前
      '@fluere-vue/designs/preset-fluent': fileURLToPath(
        new URL('./packages/designs/generated/preset-fluent.ts', import.meta.url),
      ),
      '@fluere-vue/designs/token-names': fileURLToPath(
        new URL('./packages/designs/generated/token-names.ts', import.meta.url),
      ),
      '@fluere-vue/designs/tokens.css': fileURLToPath(
        new URL('./packages/designs/generated/tokens.css', import.meta.url),
      ),
      '@fluere-vue/designs/data/fluent-tokens.json': fileURLToPath(
        new URL('./packages/designs/data/fluent-tokens.json', import.meta.url),
      ),
      '@fluere-vue/designs': fileURLToPath(
        new URL('./packages/designs/src/index.ts', import.meta.url),
      ),
      '@fluere-vue/icons/data': fileURLToPath(
        new URL('./packages/icons/generated/icons.json', import.meta.url),
      ),
      '@fluere-vue/icons': fileURLToPath(new URL('./packages/icons/src/index.ts', import.meta.url)),
      '@fluere-vue/hooks': fileURLToPath(new URL('./packages/hooks/src/index.ts', import.meta.url)),
      '@fluere-vue/utils': fileURLToPath(new URL('./packages/utils/src/index.ts', import.meta.url)),
      '@fluere-vue/themes': fileURLToPath(
        new URL('./packages/themes/src/index.ts', import.meta.url),
      ),
      '@fluere-vue/ui': fileURLToPath(new URL('./packages/ui/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: [
      'packages/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'apps/docs/utils/**/*.{test,spec}.?(c|m)[jt]s?(x)',
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/**/src/**'],
      reporter: ['text', 'html'],
    },
  },
})
