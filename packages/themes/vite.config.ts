import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const root = fileURLToPath(new URL('.', import.meta.url))

/**
 * @fluere-vue/themes 库构建（Vite 8 lib mode，纯 ESM）。
 * re-export @fluere-vue/designs 的 preset/tokensCssText；外部化各运行时依赖。
 * .d.ts 用 ./tsconfig.build.json 把 @fluere-vue/designs/* 指向其 dist。
 */
export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.build.json',
      include: ['src'],
      exclude: ['**/*.test.ts', '**/__tests__/**'],
      // 唯一入口 src/index.ts -> dist/index.d.ts（拍平，与 index.js 同层）。
      beforeWriteFile(filePath, content) {
        const name = filePath.split(/[\\/]/).pop()
        if (name === 'index.d.ts') {
          return { filePath: join(root, 'dist', 'index.d.ts'), content }
        }
        return { filePath, content }
      },
    }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['@fluere-vue/designs', '@fluentui/tokens', 'unocss'],
    },
    sourcemap: true,
    minify: false,
  },
})
