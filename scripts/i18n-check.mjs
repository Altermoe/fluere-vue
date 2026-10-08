#!/usr/bin/env node
/**
 * i18n 一致性检查（接入 `pnpm check` / CI）。
 *
 * 检查两件事：
 *  1. **key 集合一致性**：所有语言文件必须与主语言（zh-Hans）的扁平 key 集合完全一致
 *     （不许缺 key —— 否则运行期回退到中文；不许多 key —— 否则语言文件出现孤儿串）。
 *  2. **硬编码中文残留扫描**：检查文档站源码（pages / layouts / components / composables /
 *     data / i18n 之外）是否出现肉眼可见的中文字符 —— 防止新增硬编码界面串绕过 i18n。
 *     此检查确实会误报（如注释里的中文说明不算 i18n 字符串），故结果仅作**提示**，
 *     不阻断退出码；真正拦截交给第 1 条（key 缺失）与 vue-tsc。
 *
 * 用法：
 *   node scripts/i18n-check.mjs          # 正常检查，缺失 key 时以非零退出
 *   node scripts/i18n-check.mjs --scan   # 额外打印硬编码中文残留（不阻断）
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const LOCALES_DIR = join(ROOT, 'apps/docs/i18n/locales')
const SCAN = process.argv.includes('--scan')

/** 递归把嵌套 JSON 展平为 { 'a.b.c': value }（数组值按原样保留叶子）。 */
function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, path, out)
    } else {
      out[path] = value
    }
  }
  return out
}

const files = readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'))
if (files.length === 0) {
  console.error('✗ 未在 apps/docs/i18n/locales 找到任何语言文件')
  process.exit(1)
}

// 主语言：zh-Hans（命名约定，见 docs/todo.md 目标 1）
const masterFile = files.find((f) => f.startsWith('zh-Hans')) ?? files[0]
const master = JSON.parse(readFileSync(join(LOCALES_DIR, masterFile), 'utf8'))
const masterKeys = Object.keys(flatten(master)).sort()

let failed = false

for (const file of files) {
  const data = JSON.parse(readFileSync(join(LOCALES_DIR, file), 'utf8'))
  const keys = Object.keys(flatten(data)).sort()

  const missing = masterKeys.filter((k) => !keys.includes(k))
  const extra = keys.filter((k) => !masterKeys.includes(k))

  if (missing.length || extra.length) {
    failed = true
    console.error(`✗ ${file} 与主语言 ${masterFile} key 不一致：`)
    if (missing.length) console.error(`   缺失 key: ${missing.join(', ')}`)
    if (extra.length) console.error(`   多余 key: ${extra.join(', ')}`)
  } else {
    console.log(`✓ ${file}: ${keys.length} 个 key 与主语言完全一致`)
  }
}

if (failed) {
  console.error('\n✗ i18n key 一致性检查未通过（修补后用 `pnpm i18n:check` 复跑）')
  process.exit(1)
}

// ---- 硬编码中文残留扫描（仅提示，不阻断） ----
if (SCAN) {
  const scanDirs = ['pages', 'layouts', 'components']
  const scanRoot = join(ROOT, 'apps/docs')
  const hits = []
  for (const dir of scanDirs) {
    collectFiles(join(scanRoot, dir)).forEach((abs) => {
      const content = readFileSync(abs, 'utf8')
      // 粗略定位含中文的行（interface 串；行首无 `*` / `//`/`<!--` 等注释前缀才累加）
      const lines = content.split('\n')
      lines.forEach((line, idx) => {
        if (!/[\u4e00-\u9fff]/.test(line)) return
        const t = line.trim()
        // 跳过注释块行（JSDoc `*`、`//`、`<!--`、CSS 注释）与纯注释
        if (
          t.startsWith('*') ||
          t.startsWith('//') ||
          t.startsWith('<!--') ||
          t.startsWith('/*') ||
          line.trimStart().startsWith('*')
        )
          return
        hits.push(`${relative(scanRoot, abs)}:${idx + 1}: ${line.trim().slice(0, 80)}`)
      })
    })
  }
  if (hits.length) {
    console.warn(
      '\n⚠ 以下位置疑似硬编码中文界面串（请人工确认是否应改为 i18n key；仅提示不阻断）：',
    )
    hits.slice(0, 60).forEach((h) => console.warn(`   ${h}`))
    if (hits.length > 60) console.warn(`   … 还有 ${hits.length - 60} 处`)
  } else {
    console.log('\n✓ 未发现明显硬编码中文界面串')
  }
}

// 校验用：扫描目录递归收集文件
function collectFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name)
    if (statSync(abs).isDirectory()) out.push(...collectFiles(abs))
    else if (/\.(vue|ts|tsx)$/.test(name)) out.push(abs)
  }
  return out
}
