import { mkdirSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import dts from 'vite-plugin-dts'

/**
 * @fluere-vue/designs 库构建（Vite 8 lib mode，纯 ESM）。
 *
 * 一个入口产一块 JS + 一块 .d.ts：
 *   - index         语言层 TS 表面（token 名常量 + 类型）
 *   - preset-fluent UnoCSS preset（含 tokensCssText 字符串文本）
 *   - token-names   token 名常量
 * 静态产物（不经过编译，原样拷贝）：
 *   - tokens.css        -> dist/tokens.css
 *   - data/fluent-tokens.json -> dist/data/fluent-tokens.json
 * 外部化运行时依赖（@fluentui/tokens 仅供类型，unocss 仅供 Preset 类型），保证 tree-shaking。
 */
const root = fileURLToPath(new URL('.', import.meta.url))

function copyStatic(mappings: Array<[string, string]>): Plugin {
  return {
    name: 'fluere-designs-copy-static',
    closeBundle() {
      for (const [src, out] of mappings) {
        const absOut = join(root, out)
        mkdirSync(dirname(absOut), { recursive: true })
        copyFileSync(join(root, src), absOut)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.json',
      include: ['src', 'generated'],
      exclude: ['**/*.test.ts', '**/__tests__/**'],
      // 仅保留三个入口对应的声明文件，并把它们拍平到 dist 根（JS 同理）：
      //   src/index.ts -> dist/index.d.ts
      //   generated/preset-fluent.ts -> dist/preset-fluent.d.ts
      //   generated/token-names.ts -> dist/token-names.d.ts
      beforeWriteFile(filePath, content) {
        const name = filePath.split(/[\\/]/).pop()
        if (name === 'index.d.ts' || name === 'preset-fluent.d.ts' || name === 'token-names.d.ts') {
          // 拍平到 dist 根后，src/index.ts 里的 `../generated/token-names` 相对路径失效，
          // 改为同层 `./token-names`（token-names.d.ts 已被拍平到同一层）。
          const fixed =
            name === 'index.d.ts'
              ? content.replaceAll("'../generated/token-names'", "'./token-names'")
              : content
          return { filePath: join(root, 'dist', name), content: fixed }
        }
        return { filePath, content }
      },
    }),
    copyStatic([
      ['generated/tokens.css', 'dist/tokens.css'],
      ['data/fluent-tokens.json', 'dist/data/fluent-tokens.json'],
    ]),
  ],
  build: {
    lib: {
      entry: {
        'index': 'src/index.ts',
        'preset-fluent': 'generated/preset-fluent.ts',
        'token-names': 'generated/token-names.ts',
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ['@fluentui/tokens', 'unocss'],
    },
    sourcemap: true,
    minify: false,
  },
})
