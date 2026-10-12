#!/usr/bin/env node
/**
 * 版本号单一事实源与统一校验。
 *
 * 全仓 `@fluere-vue/*`（含根 workspace）统一使用同一个版本号（Changesets `fixed`
 * 分组约束，见 .changeset/config.json）。本脚本负责「把它们拉平」与「校验它们一致」：
 *
 *   node scripts/version.mjs sync                  # 取 根 package.json 与所有可发布包 里的最大版本，统一写入根与这些包
 *   node scripts/version.mjs check                 # 校验可发布包版本彼此一致，且与根版本一致；同时校验 .changeset/config.json
 *   node scripts/version.mjs check --tag v0.1.0    # 额外校验 git tag 与根版本一致（CI）
 *
 * 退出码：0 = 通过；1 = 不一致（打印每一处偏差）。
 *
 * 方向说明：`changeset version`（固定分组）会先统一 bump 子包，此时根版本仍是旧值；
 * 因此 `sync` 以「最大版本」为准回写根，而不是反过来（旧实现 root→sub 会把
 * changeset 的 bump 回退掉）。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
/**
 * 参与版本同步的目录：**只有 `packages/`**（六个可发布库包）。
 *
 * 为什么刻意排除 `apps/*`（`@fluere-vue/docs` / `playground`）：它们是 private、从不发布，
 * changesets 的 `ignore` 也跳过它们；而 changesets/action 的 version 步骤用「版本号是否变化」
 * 判定变更包，并对每个变更包读 `<pkg.dir>/CHANGELOG.md`（action v2 的 src/run.ts）。
 * 一旦把 apps 的版本也改掉，action 就会去找并不存在的 `apps/docs/CHANGELOG.md` 并抛
 * ENOENT，release job 直接失败（2026-10-12 在 GitHub 上实测到该失败）。
 *
 * 文档站展示的版本号读的是**根** `package.json`（apps/docs/nuxt.config.ts），与 apps 自身版本无关。
 */
const WORKSPACE_DIRS = ['packages']

/** workspace 的全部包目录（含 private 的 `apps/*`）：仅用于校验 config 里的包名是否存在。 */
const ALL_WORKSPACE_DIRS = ['apps', 'packages']

const rootPkgPath = join(ROOT, 'package.json')

/** 读取并解析 JSON（保留缩进风格由写入侧统一为 2 空格 + 末尾换行）。 */
function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** 收集指定目录下的 package.json 路径（workspace 包 = 这些目录下的一级子目录）。 */
function collectPackageJsons(dirs) {
  const targets = []
  for (const dir of dirs) {
    const abs = join(ROOT, dir)
    if (!existsSync(abs)) {
      continue
    }
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue
      }
      const pkg = join(abs, entry.name, 'package.json')
      if (existsSync(pkg)) {
        targets.push(pkg)
      }
    }
  }
  return targets
}

/** 需要同步版本的包：只有可发布包（见 WORKSPACE_DIRS 注释）。 */
function collectTargets() {
  return collectPackageJsons(WORKSPACE_DIRS)
}

/** 全部 workspace 包（含 private 的 apps/*）：供 `.changeset/config.json` 的包名校验使用。 */
function collectAllWorkspacePackages() {
  return collectPackageJsons(ALL_WORKSPACE_DIRS)
}

function rel(path) {
  return path.slice(ROOT.length)
}

/* 极简 semver 比较（够统一版本用）：数值核心逐段比较，再比预发布段。 */
function versionParts(v) {
  const [core = '', pre = ''] = String(v).split('-', 2)
  return [core.split('.').map((n) => Number(n) || 0), pre]
}
function compareVersions(a, b) {
  const [ca, pa] = versionParts(a)
  const [cb, pb] = versionParts(b)
  for (let i = 0; i < 3; i += 1) {
    if ((ca[i] ?? 0) !== (cb[i] ?? 0)) {
      return (ca[i] ?? 0) > (cb[i] ?? 0) ? 1 : -1
    }
  }
  if (pa === pb) {
    return 0
  }
  if (!pa) {
    return 1 // 正式版 > 预发布
  }
  if (!pb) {
    return -1
  }
  return pa > pb ? 1 : -1
}
function maxVersion(a, b) {
  return compareVersions(a, b) >= 0 ? a : b
}

function writeVersion(path, version) {
  const pkg = readJson(path)
  if (pkg.version === version) {
    return false
  }
  const before = pkg.version
  pkg.version = version
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`)
  console.log(`sync ${rel(path)}: ${before} -> ${version}`)
  return true
}

function cmdSync() {
  // 目标版本 = 根与所有可发布包的「最大版本」；changeset 固定分组 bump 后，根会偏旧，
  // 以最大者（可发布包）为准回写根并把它们拉平。apps/* 不参与（见 WORKSPACE_DIRS 注释）。
  const targets = collectTargets()
  const versions = [readJson(rootPkgPath).version, ...targets.map((p) => readJson(p).version)]
  const target = versions.filter(Boolean).reduce(maxVersion)

  let changed = 0
  if (writeVersion(rootPkgPath, target)) {
    changed += 1
  }
  for (const path of targets) {
    if (writeVersion(path, target)) {
      changed += 1
    }
  }
  console.log(
    changed === 0
      ? `已同步：根与全部 ${targets.length} 个可发布包均为 ${target}`
      : `已更新 ${changed} 处 -> ${target}`,
  )
}

/**
 * 发布基建一致性：`.changeset/config.json` 的两类错误只在真正发布时才炸
 * （`changeset version` 会直接退出 1），所以在 `pnpm check` 里提前拦截：
 *
 *   1. `changelog` 必须是当前 Node 能解析的模块。写成 `@changesets/cli/changelog-git`
 *      这类**不存在的子路径**时（cli 3.x 的 `exports` 只导出 `.` / `./changelog` /
 *      `./commit` / `./package.json` / `./bin.js`），`changeset version` 在生成 CHANGELOG
 *      阶段抛 ERR_PACKAGE_PATH_NOT_EXPORTED；等价写法是 `@changesets/cli/changelog`
 *      （它本身就是 `@changesets/changelog-git` 的再导出）。
 *   2. `fixed` / `linked` / `ignore` 里的名字必须是 workspace 内真实存在的包（或 glob）。
 *      workspace 根包（private 的 `fluere-vue`）不属于任何包，写进去 changesets 会报
 *      "Invalid path"——根版本由本脚本 `sync` 对齐，不需要也不应该进 `fixed`。
 */
function checkChangesetConfig(problems) {
  const configPath = join(ROOT, '.changeset', 'config.json')
  if (!existsSync(configPath)) {
    problems.push('.changeset/config.json 缺失：Changesets 配置是发布链路的前提')
    return
  }

  let config = null
  try {
    config = readJson(configPath)
  } catch (error) {
    problems.push(`.changeset/config.json 解析失败：${error.message}`)
    return
  }
  if (config === null || typeof config !== 'object') {
    problems.push('.changeset/config.json 内容不是对象')
    return
  }

  const changelogModules = Array.isArray(config.changelog) ? config.changelog : [config.changelog]
  for (const specifier of changelogModules) {
    if (typeof specifier !== 'string') {
      continue // false / 缺省 = 关闭 changelog，合法
    }
    try {
      import.meta.resolve(specifier)
    } catch {
      problems.push(
        `.changeset/config.json 的 changelog "${specifier}" 无法解析：changeset version 会在生成 CHANGELOG 时报错（可用 @changesets/cli/changelog）`,
      )
    }
  }

  const workspaceNames = new Set(
    // 必须是「全部 workspace 包」：`ignore` 里合法地引用 private 的 apps/*（docs / playground），
    // 它们不在版本同步范围内，但确实是存在的包。
    collectAllWorkspacePackages()
      .map((path) => readJson(path).name)
      .filter(Boolean),
  )
  for (const key of ['fixed', 'linked', 'ignore']) {
    const value = config[key]
    if (!Array.isArray(value)) {
      continue
    }
    // fixed / linked 是「分组数组的数组」，ignore 是扁平数组。
    const groups = value.map((entry) => (Array.isArray(entry) ? entry : [entry]))
    for (const group of groups) {
      for (const name of group) {
        if (typeof name !== 'string' || /[*?[\]{}!]/.test(name)) {
          continue // glob 表达式不做静态校验，交给 changesets 自己解析
        }
        if (!workspaceNames.has(name)) {
          problems.push(
            `.changeset/config.json 的 ${key} 引用了不存在的包 "${name}"（workspace 包：${[...workspaceNames].join(' / ')}）`,
          )
        }
      }
    }
  }
}

function cmdCheck(tag) {
  const problems = []
  const targets = collectTargets()
  const rootVersion = readJson(rootPkgPath).version
  if (targets.length === 0) {
    problems.push('未找到任何可发布包 package.json（检查 pnpm-workspace.yaml 的 packages 目录）')
  }

  const subVersions = new Set(targets.map((p) => readJson(p).version))
  if (subVersions.size > 1) {
    problems.push(
      `可发布包版本不统一：${[...subVersions].join(' / ')}（请先执行 pnpm version:sync）`,
    )
  }
  for (const path of targets) {
    const actual = readJson(path).version
    if (actual !== rootVersion) {
      problems.push(`${rel(path)}: ${actual} != 根 package.json 的 ${rootVersion}`)
    }
  }

  checkChangesetConfig(problems)

  if (tag) {
    const expected = String(tag).replace(/^v/, '')
    if (expected !== rootVersion) {
      problems.push(
        `git tag ${tag} 对应版本 ${expected}，与根 package.json 的 ${rootVersion} 不一致（发布前请先执行 pnpm version:sync 并提交）`,
      )
    } else {
      console.log(`tag 校验通过：${tag} -> ${rootVersion}`)
    }
  }

  if (problems.length > 0) {
    console.error('版本一致性检查失败：')
    for (const p of problems) {
      console.error(`  - ${p}`)
    }
    process.exit(1)
  }
  console.log(
    `版本一致性检查通过：根版本 ${rootVersion}，可发布包 ${targets.length} 个${tag ? `，tag ${tag}` : ''}`,
  )
}

const [command, ...rest] = process.argv.slice(2)
const tagIndex = rest.indexOf('--tag')
const tag = tagIndex !== -1 ? rest[tagIndex + 1] : undefined

switch (command) {
  case 'sync': {
    cmdSync()
    break
  }
  case 'check': {
    cmdCheck(tag)
    break
  }
  default: {
    console.error('用法：node scripts/version.mjs <sync|check> [--tag vX.Y.Z]')
    process.exit(2)
  }
}
