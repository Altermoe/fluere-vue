#!/usr/bin/env node
/**
 * i18n 一致性检查（接入 `pnpm check` / CI）。
 *
 * 检查两件事，**任一失败即非零退出**：
 *  1. **key 集合一致性**：所有语言文件必须与主语言（zh-Hans）的扁平 key 集合完全一致
 *     （不许缺 key —— 否则运行期回退到中文；不许多 key —— 否则语言文件出现孤儿串）。
 *  2. **硬编码中文残留扫描**：检查文档站源码（pages / layouts / components /
 *     composables / data / plugins / utils）里**肉眼可见的中文** —— 防止新增硬编码
 *     界面串绕过 i18n。扫描会先用状态机**剥离注释**（行注释、块注释与 HTML 注释，
 *     并跟踪字符串字面量，模板正文里的撇号不会让 JS 注释状态误判），所以
 *     中文注释与文档站 content/**（双语正文源）天然不在命中范围内。
 *
 *     有意硬编码的少数位置写进下方 `HARDCODED_ALLOW`（文件级 + 理由），除此之外
 *     出现即失败。历史备注：本检查早期只做提示，实测把「注释续行」误报成界面串、
 *     噪音淹没真阳性，才一直没阻断；改成剥注释 + 白名单后命中收敛到已知例外，
 *     已升级为**阻断项**（见 docs/todo.md 目标 1 · 1.2）。
 *  3. **key 引用存在性**：源码里 `t('…')` / `tm('…')` 的字面量 key 必须能在主语言
 *     消息树上解析到节点。vue-tsc 并不校验 key（见 composables/use-docs-i18n.ts），
 *     引用了不存在的 key 时页面会渲染出 key 路径本身（纯 ASCII，上面的中文扫描
 *     拦不住），或在英文语种静默回退成中文 —— 此检查把「引用 ↔ key」闭合。
 *
 * 用法：
 *   node scripts/i18n-check.mjs     # 三项检查，任一失败即非零退出
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const LOCALES_DIR = join(ROOT, 'apps/docs/i18n/locales')

/**
 * 有意硬编码中文 / 目标语种文案的位置（文件相对 apps/docs 的路径 → 理由）。
 * 只收录「不能走当前语种 key」的位置，新增条目必须写清理由。
 */
const HARDCODED_ALLOW = new Map([
  [
    'components/locale-switch.vue',
    '语言切换控件的可访问名有意硬编码为目标语种（切到英文要说 Switch to English），不随当前 locale 解析',
  ],
])

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
const masterKeys = Object.keys(flatten(master)).toSorted()

let failed = false

for (const file of files) {
  const data = JSON.parse(readFileSync(join(LOCALES_DIR, file), 'utf8'))
  const keys = Object.keys(flatten(data)).toSorted()

  const missing = masterKeys.filter((k) => !keys.includes(k))
  const extra = keys.filter((k) => !masterKeys.includes(k))

  if (missing.length || extra.length) {
    failed = true
    console.error(`✗ ${file} 与主语言 ${masterFile} key 不一致：`)
    if (missing.length) {
      console.error(`   缺失 key: ${missing.join(', ')}`)
    }
    if (extra.length) {
      console.error(`   多余 key: ${extra.join(', ')}`)
    }
  } else {
    console.log(`✓ ${file}: ${keys.length} 个 key 与主语言完全一致`)
  }
}

// ---- 硬编码中文残留扫描（剥注释后命中即阻断；有意例外见 HARDCODED_ALLOW） ----

/** script / style 段：剥离行注释与块注释，跟踪字符串字面量（换行等量保留，行号对齐）。 */
function stripJsComments(src) {
  let out = ''
  let i = 0
  let quote = null
  const n = src.length
  while (i < n) {
    const c = src[i]
    if (quote) {
      if (c === '\\') {
        out += src.slice(i, i + 2)
        i += 2
        continue
      }
      if (c === quote) {
        quote = null
      }
      out += c
      i += 1
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c
      out += c
      i += 1
      continue
    }
    if (src.startsWith('//', i)) {
      const j = src.indexOf('\n', i)
      i = j === -1 ? n : j
      continue
    }
    if (src.startsWith('/*', i)) {
      const j = src.indexOf('*/', i + 2)
      const end = j === -1 ? n : j + 2
      out += '\n'.repeat(countNewlines(src, i, end)) // 等量换行，保证行号对齐
      i = end
      continue
    }
    out += c
    i += 1
  }
  return out
}

/** 只剥离 `<!-- -->`（模板正文里的撇号不进 JS 引号状态）。 */
function stripHtmlComments(src) {
  let out = ''
  let i = 0
  const n = src.length
  while (i < n) {
    if (src.startsWith('<!--', i)) {
      const j = src.indexOf('-->', i + 4)
      const end = j === -1 ? n : j + 3
      out += '\n'.repeat(countNewlines(src, i, end))
      i = end
      continue
    }
    out += src[i]
    i += 1
  }
  return out
}

function countNewlines(src, from, to) {
  let count = 0
  for (let k = from; k < to; k += 1) {
    if (src[k] === '\n') {
      count += 1
    }
  }
  return count
}

/**
 * 按 SFC 分段剥离注释：先剥 HTML 注释（文件头注释正文里常出现 `<style scoped>`
 * 之类的字面量，先分段会被引到错误位置），再对 script / style 段剥 JS 注释。
 * 非 SFC（.ts）直接走 JS 规则。
 */
function stripComments(src, isSfc) {
  if (!isSfc) {
    return stripJsComments(src)
  }
  const strippedHtml = stripHtmlComments(src)
  const blockRe = /<(?<tag>script|style)\b[^>]*>[\s\S]*?<\/\k<tag>>/g
  let out = ''
  let last = 0
  let m = null
  while ((m = blockRe.exec(strippedHtml)) !== null) {
    out += strippedHtml.slice(last, m.index)
    out += stripJsComments(m[0])
    last = m.index + m[0].length
  }
  out += strippedHtml.slice(last)
  return out
}

const SCAN_DIRS = ['pages', 'layouts', 'components', 'composables', 'data', 'plugins', 'utils']
const scanRoot = join(ROOT, 'apps/docs')
const hits = []
for (const dir of SCAN_DIRS) {
  const base = join(scanRoot, dir)
  if (!statSync(base, { throwIfNoEntry: false })?.isDirectory()) {
    continue
  }
  for (const abs of collectFiles(base)) {
    const rel = relative(scanRoot, abs)
    if (rel.split('/').includes('__tests__')) {
      continue
    }
    if (HARDCODED_ALLOW.has(rel)) {
      continue
    }
    const raw = readFileSync(abs, 'utf8')
    const stripped = stripComments(raw, abs.endsWith('.vue'))
    const rawLines = raw.split('\n')
    const keptLines = stripped.split('\n')
    const lineCount = Math.min(rawLines.length, keptLines.length)
    for (let idx = 0; idx < lineCount; idx += 1) {
      if (/[一-鿿]/.test(keptLines[idx])) {
        hits.push(`${rel}:${idx + 1}: ${rawLines[idx].trim().slice(0, 100)}`)
      }
    }
  }
}

if (hits.length) {
  failed = true
  console.error('\n✗ 硬编码中文界面串残留（已剥离注释；新增文案一律走 i18n key）：')
  hits.slice(0, 60).forEach((h) => console.error(`   ${h}`))
  if (hits.length > 60) {
    console.error(`   … 还有 ${hits.length - 60} 处`)
  }
  console.error('   （确属有意硬编码的例外 → scripts/i18n-check.mjs 的 HARDCODED_ALLOW）')
} else {
  console.log('✓ 未发现硬编码中文界面串（注释已剥离，有意例外已入白名单）')
}

// ---- key 引用存在性：源码里 t('…') / tm('…') 字面量必须能在主语言解析到节点 ----
const KEY_REF_RE =
  /(?<![\w.$])(?<fn>[bt]m?)\(\s*(?<quoted>'(?<single>[^'\\]+)'|"(?<double>[^"\\]+)")/g

/** key 路径能否在消息树上解析到节点（容器 / 数组 / 叶子都算存在）。 */
function keyExists(tree, path) {
  let node = tree
  for (const part of path.replace(/\[(?<index>\d+)\]/g, '.$<index>').split('.')) {
    if (node === null || typeof node !== 'object') {
      return false
    }
    if (!(part in node)) {
      return false
    }
    node = node[part]
  }
  return true
}

const missingRefs = new Map()
for (const dir of SCAN_DIRS) {
  const base = join(scanRoot, dir)
  if (!statSync(base, { throwIfNoEntry: false })?.isDirectory()) {
    continue
  }
  for (const abs of collectFiles(base)) {
    const rel = relative(scanRoot, abs)
    if (rel.split('/').includes('__tests__')) {
      continue
    }
    const stripped = stripComments(readFileSync(abs, 'utf8'), abs.endsWith('.vue'))
    for (const m of stripped.matchAll(KEY_REF_RE)) {
      const key = m[3] ?? m[4]
      if (!key || keyExists(master, key)) {
        continue
      }
      if (!missingRefs.has(key)) {
        missingRefs.set(key, [])
      }
      missingRefs.get(key).push(rel)
    }
  }
}

if (missingRefs.size) {
  failed = true
  console.error(`\n✗ ${missingRefs.size} 个 t()/tm() 引用在主语言 ${masterFile} 中不存在：`)
  for (const [key, refs] of missingRefs) {
    console.error(`   ${key}  ← ${[...new Set(refs)].join(', ')}`)
  }
} else {
  console.log('✓ 源码引用的 t()/tm() key 全部存在于主语言消息树')
}

// ---- 组件库 locale 切片（packages/ui/src/**/locale.ts）：zh-Hans / en 两侧 key 集一致 ----

/**
 * 组件库每组件一个 `locale.ts`（todo 目标 1 · 1.4）。其消息对象两侧
 * `zhHans`（内置缺省）与 `en`（兜底）的 key 集必须一致：任一侧缺 key 会让设计好的
 * 回退链（zh-Hans→zh→en）在某一侧静默断链。这里做**静态**校核——不引入 TS 运行时，
 * 只解析切片对象字面量两侧的顶层属性名（切片均为一层扁平结构）；两侧不一致即失败。
 */
const UI_LOCALES_ROOT = join(ROOT, 'packages/ui/src')
function collectLocaleSlices(dir) {
  const collected = []
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name)
    if (statSync(abs).isDirectory()) {
      if (name !== '__tests__') {
        collected.push(...collectLocaleSlices(abs))
      }
    } else if (name === 'locale.ts') {
      collected.push(abs)
    }
  }
  return collected
}
const objectKeySet = (block) =>
  new Set([...block.matchAll(/^\s*(?<key>[A-Za-z_$][\w$]*)\s*:/gm)].map((m) => m[1]))
for (const file of collectLocaleSlices(UI_LOCALES_ROOT)) {
  const src = stripComments(readFileSync(file, 'utf8'), false)
  const zh = /zhHans\s*:\s*\{(?<body>[\s\S]*?)\}/.exec(src)
  const en = /en\s*:\s*\{(?<body>[\s\S]*?)\}/.exec(src)
  if (!zh || !en) {
    failed = true
    console.error(
      `✗ ${relative(ROOT, file)}：无法解析 zhHans / en 对象字面量（切片结构有变？请同步该检查）`,
    )
    continue
  }
  const zhKeys = objectKeySet(zh[1])
  const enKeys = objectKeySet(en[1])
  const missingEn = [...zhKeys].filter((k) => !enKeys.has(k))
  const extraEn = [...enKeys].filter((k) => !zhKeys.has(k))
  if (missingEn.length || extraEn.length) {
    failed = true
    console.error(`✗ ${relative(ROOT, file)} 组件 locale 切片 zh-Hans / en key 不一致：`)
    if (missingEn.length) {
      console.error(`   zh-Hans 有、en 缺: ${missingEn.join(', ')}`)
    }
    if (extraEn.length) {
      console.error(`   en 有、zh-Hans 缺: ${extraEn.join(', ')}`)
    }
  } else {
    console.log(`✓ ${relative(ROOT, file)}: ${zhKeys.size} 个 key 两侧一致`)
  }
}

if (failed) {
  console.error('\n✗ i18n 检查未通过（修补后用 `pnpm i18n:check` 复跑）')
  process.exit(1)
}

// 校验用：扫描目录递归收集文件
function collectFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name)
    if (statSync(abs).isDirectory()) {
      out.push(...collectFiles(abs))
    } else if (/\.(?:vue|ts|tsx)$/.test(name)) {
      out.push(abs)
    }
  }
  return out
}
