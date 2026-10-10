import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

/**
 * @fluere-vue/ui 库构建（Vite 8 lib mode，纯 ESM，Vue SFC）。
 * - vue / reka-ui / @fluere-vue/* 全部外部化，避免重复实例化与不可 tree-shake。
 * - 入口 index.ts 的 `import '@fluere-vue/designs/tokens.css'` 与各组件 scoped 样式
 *   被 Vite 抽取到 `dist/style.css`，对外暴露为 `@fluere-vue/ui/style.css`。
 * - 本文件只产出 JS 与 CSS；类型声明由 `vue-tsc -p tsconfig.build.json` 生成
 *   （Vue SFC 的精确 Props 类型只有 vue 语言工具能产出，vite-plugin-dts 拿不到），
 *   见 package.json 的 `build` 脚本。
 */
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: {
        'index': 'index.ts',
        'locales/zh-Hans': 'locales/zh-Hans.ts',
        'locales/en': 'locales/en.ts',
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
      cssFileName: 'style',
    },
    rollupOptions: {
      external: [
        'vue',
        'reka-ui',
        '@fluere-vue/hooks',
        '@fluere-vue/utils',
        '@fluere-vue/icons',
        '@fluere-vue/themes',
        '@fluere-vue/designs',
      ],
    },
    sourcemap: true,
    minify: false,
  },
})
