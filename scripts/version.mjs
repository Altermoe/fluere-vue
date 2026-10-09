#!/usr/bin/env node
/**
 * 版本号单一事实源：**根 package.json**。
 *
 * 所有子包（apps/*、packages/*）的 `version` 必须与根版本一致；发布以 git tag
 * （`v<version>`）为触发点，CI 负责校验「tag 去掉 v 前缀 == 根版本」，避免各处
 * 手写版本号漂移。
 *
 * 用法：
 *   node scripts/version.mjs sync                  # 把根版本写入所有子包
 *   node scripts/version.mjs check                 # 校验子包版本与根一致
 *   node scripts/version.mjs check --tag v0.1.0    # 额外校验 tag 与根版本一致（CI）
 *
 * 退出码：0 = 通过；1 = 不一致（打印每一处偏差）。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
/** 与 pnpm-workspace.yaml 的 `packages:` 保持一致（子包只在这两个目录下）。 */
const WORKSPACE_DIRS = ['apps', 'packages']

const rootPkgPath = join(ROOT, 'package.json')

/** 读取并解析 JSON（保留缩进风格由写入侧统一为 2 空格 + 末尾换行）。 */
function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** 收集所有需要同步版本的子包 package.json 路径。 */
function collectTargets() {
  const targets = []
  for (const dir of WORKSPACE_DIRS) {
    const abs = join(ROOT, dir)
    if (!existsSync(abs)) continue
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const pkg = join(abs, entry.name, 'package.json')
      if (existsSync(pkg)) targets.push(pkg)
    }
  }
  return targets
}

function rel(path) {
  return path.slice(ROOT.length)
}

function cmdSync(version) {
  const targets = collectTargets()
  let changed = 0
  for (const path of targets) {
    const pkg = readJson(path)
    if (pkg.version === version) continue
    const before = pkg.version
    pkg.version = version
    writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`)
    console.log(`sync ${rel(path)}: ${before} -> ${version}`)
    changed += 1
  }
  console.log(
    changed === 0
      ? `已同步：全部 ${targets.length} 个子包均为 ${version}`
      : `已更新 ${changed}/${targets.length} 个子包 -> ${version}`,
  )
}

function cmdCheck(version, tag) {
  const problems = []
  const targets = collectTargets()
  if (targets.length === 0)
    problems.push('未找到任何子包 package.json（检查 pnpm-workspace.yaml 的 packages 目录）')

  for (const path of targets) {
    const actual = readJson(path).version
    if (actual !== version)
      problems.push(`${rel(path)}: ${actual} != 根 package.json 的 ${version}`)
  }

  if (tag) {
    const expected = String(tag).replace(/^v/, '')
    if (expected !== version) {
      problems.push(
        `git tag ${tag} 对应版本 ${expected}，与根 package.json 的 ${version} 不一致（发布前请先执行 pnpm version:sync 并提交）`,
      )
    } else {
      console.log(`tag 校验通过：${tag} -> ${version}`)
    }
  }

  if (problems.length > 0) {
    console.error('版本一致性检查失败：')
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log(
    `版本一致性检查通过：根版本 ${version}，子包 ${targets.length} 个${tag ? `，tag ${tag}` : ''}`,
  )
}

const [command, ...rest] = process.argv.slice(2)
const tagIndex = rest.indexOf('--tag')
const tag = tagIndex >= 0 ? rest[tagIndex + 1] : undefined
const { version } = readJson(rootPkgPath)

if (!version) {
  console.error('根 package.json 缺少 version 字段')
  process.exit(1)
}

switch (command) {
  case 'sync':
    cmdSync(version)
    break
  case 'check':
    cmdCheck(version, tag)
    break
  default:
    console.error('用法：node scripts/version.mjs <sync|check> [--tag vX.Y.Z]')
    process.exit(2)
}
