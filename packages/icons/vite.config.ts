import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

/**
 * @fluere-vue/icons 库构建（Vite 8 lib mode，纯 ESM）。
 * 入口 src/index.ts 汇聚 generated/*（全部图标组件）。单文件 ESM + sideEffects:false，
 * 消费端 bundler 可按命名导出 tree-shake（生成代码已带 PURE 标注）。
 * vue 为对等依赖（peer），外部化。
 */
export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.json',
      include: ['index.ts', 'src', 'generated'],
      exclude: ['**/*.test.ts', '**/__tests__/**'],
    }),
  ],
  build: {
    lib: {
      entry: 'index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue'],
    },
    sourcemap: false,
    minify: false,
  },
})
