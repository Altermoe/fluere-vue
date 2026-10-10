import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

/**
 * @fluere-vue/hooks 库构建（Vite 8 lib mode，纯 ESM）。
 * 外部化 vue（peer）与 @fluere-vue/utils / @intlify/core-base，保证可 tree-shake。
 * .d.ts 用 ./tsconfig.build.json：把 @fluere-vue/utils 指到其 dist，类型不内联源码。
 */
export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.build.json',
      include: ['src'],
      exclude: ['**/*.test.ts', '**/__tests__/**'],
    }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue', '@fluere-vue/utils', '@intlify/core-base'],
    },
    sourcemap: true,
    minify: false,
  },
})
