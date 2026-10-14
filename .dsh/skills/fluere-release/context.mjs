#!/usr/bin/env node
/**
 * fluere-release —— 发版运行时上下文探针。
 *
 * 只输出**非密**上下文：版本、git remote、插件凭据是否就绪、changeset 状态。
 * 任何 token / 密码 / 私钥都只折叠成 `set | not set`，绝不打印明文，
 * 也不把带凭据的 URL 原样回显。
 *
 * 用法：node .dsh/skills/fluere-release/context.mjs
 * 退出码：0 = 关键上下文齐全；1 = 缺关键项（GitHub 或 OneDev 凭据未就绪）。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const CWD = process.cwd()

/** 跑一条命令，失败/缺失一律返回空串（探针不应中断）。 */
function sh(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

/** 隐藏 URL 里的 userinfo（`https://user:token@host` → `https://***@host`）。 */
function redactUrl(url) {
  return (url || '').replace(/\/\/[^/@]*@/, '//***@')
}

/** 两个受管插件的凭据存储路径解析（与插件源码同口径：显式 env > XDG > ~/.config）。 */
function configFileFor(app, explicitEnv) {
  const explicit = process.env[explicitEnv]
  if (explicit !== undefined && explicit.trim() !== '') return explicit
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? ''
    if (appData !== '') return join(appData, app, 'config.json')
  }
  const home = process.env.HOME ?? process.env.USERPROFILE ?? homedir()
  const configHome = process.env.XDG_CONFIG_HOME ?? join(home, '.config')
  return join(configHome, app, 'config.json')
}

/** 用 ~ 折叠 home，避免在输出里暴露绝对家目录路径。 */
function tilde(file) {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? ''
  return home !== '' && file.startsWith(home) ? `~${file.slice(home.length)}` : file
}

function parseGitHub(url) {
  const m = /github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/.exec(url || '')
  return m ? { owner: m[1], repo: m[2] } : null
}

// 1) 版本（唯一事实源 = 根 package.json；六包由 scripts/version.mjs 拉平）
const rootPkg = readJson(join(CWD, 'package.json')) ?? {}
const packagesDir = join(CWD, 'packages')
const packages = {}
if (existsSync(packagesDir)) {
  for (const dir of readdirSync(packagesDir)) {
    const pkg = readJson(join(packagesDir, dir, 'package.json'))
    if (pkg?.name) packages[pkg.name] = pkg.version
  }
}
const versions = new Set([rootPkg.version, ...Object.values(packages)].filter(Boolean))

// 2) git remotes（owner/repo/主机一律从这里取，不写死）
const remotes = {}
for (const name of sh('git', ['remote']).split('\n').filter(Boolean)) {
  remotes[name] = redactUrl(sh('git', ['remote', 'get-url', name]))
}
const githubRemoteUrl = ['github', 'origin'].map((r) => remotes[r]).find((u) => /github\.com/.test(u ?? '')) ?? ''
const github = parseGitHub(githubRemoteUrl) ?? { owner: null, repo: null }
const isSshGithub = githubRemoteUrl.startsWith('git@') || githubRemoteUrl.startsWith('ssh://')

// 3) 受管插件凭据（只报 set / not set）
const githubConfigFile = configFileFor('dsh-github', 'GITHUB_CONFIG_FILE')
const githubStore = readJson(githubConfigFile) ?? {}
const onedevConfigFile = configFileFor('dsh-onedev', 'ONEDEV_CONFIG_FILE')
const onedevStore = readJson(onedevConfigFile) ?? {}
const onedevEnvs = onedevStore.environments ?? {}
const onedevSlugs = Object.keys(onedevEnvs)
const onedevSlug = (process.env.ONEDEV_ENV ?? '').trim() || onedevStore.primary || onedevSlugs[0] || ''
const onedevEnv = onedevEnvs[onedevSlug] ?? {}

// 4) changesets 状态
const preState = readJson(join(CWD, '.changeset', 'pre.json'))
const changesetDir = join(CWD, '.changeset')
const pendingChangesets = existsSync(changesetDir)
  ? readdirSync(changesetDir).filter((f) => f.endsWith('.md'))
  : []

const ok = Boolean(github.owner && githubStore.token && onedevSlug && (onedevEnv.onedevToken || onedevEnv.password))

const report = {
  rootVersion: rootPkg.version ?? null,
  versionConsistent: versions.size === 1,
  packages,
  remotes,
  github: {
    remoteScheme: githubRemoteUrl === '' ? 'missing' : isSshGithub ? 'ssh' : 'https',
    owner: github.owner,
    repo: github.repo,
    configFile: tilde(githubConfigFile),
    tokenSet: Boolean(githubStore.token),
    authType: githubStore.authType ?? null,
  },
  onedev: {
    configFile: tilde(onedevConfigFile),
    primary: onedevSlug || null,
    environmentSlugs: onedevSlugs,
    url: redactUrl(onedevEnv.onedevUrl ?? ''),
    tokenSet: Boolean(onedevEnv.onedevToken || onedevEnv.password),
    authType: onedevEnv.authType ?? null,
    remote: redactUrl(remotes.onedev ?? ''),
  },
  docs: {
    homepage: rootPkg.homepage ?? null,
  },
  changesets: {
    preMode: preState?.mode ?? null,
    preTag: preState?.tag ?? null,
    pending: pendingChangesets,
  },
  ready: ok,
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
if (!ok) {
  process.stderr.write(
    '\n[context] 关键上下文缺失：请先在 DSH 里配好 dsh-github 令牌与 dsh-onedev 的 primary 环境凭据。\n',
  )
  process.exitCode = 1
}
