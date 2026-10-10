import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

/** @fluere-vue/utils 库构建（Vite 8 lib mode，纯 ESM）。无运行时依赖，无需外部化。 */
export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.json',
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
    sourcemap: true,
    minify: false,
  },
})
