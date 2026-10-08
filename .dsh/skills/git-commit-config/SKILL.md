---
name: git-commit-config
description: Generate per-harness/IDE git commit-convention (rules) config files for a project. Currently supports Trae — installs the config to .trae/rules/git-commit-message.md using the bundled template.
whenToUse: Any time a project needs a git 提交规范配置文件 for a specific AI harness / IDE (e.g. Trae), or you are asked to generate / install / sync a .trae git commit rule, or to add a new harness target to this config generator.
---

# Git Commit 规范配置生成器

本技能用于为各种 AI harness / IDE **生成 git 提交规范配置**（`*-rules` 文件），并把它们安装到目标工程里。它是「一块可复用、自带模板的配置生成器」：每个 harness/IDE 的真实模板都收在本技能目录下，模型/脚本按模板**逐字**产出目标文件，保证「安装后的文件 = 模板」字节一致。

## 已支持的目标

| harness/IDE | 安装路径（相对工程 git 根）                          | 配置形态                                            |
| ----------- | ---------------------------------------------------- | --------------------------------------------------- |
| `trae`      | `.trae/rules/git-commit-message.md`                  | Trae Agent Rules（`scene: git_message` 触发）       |

> 模板目录结构与安装路径**镜像对齐**：`templates/trae/rules/git-commit-message.md` ↔ 安装到 `<工程根>/.trae/rules/git-commit-message.md`。

## 支持列表与文件

- `SKILL.md` — 本说明（怎么用 + 怎么扩展）。
- `gen.js` — 生成器脚本：把模板复制到目标工程的安装路径（无网络依赖，纯文件拷贝）。
- `templates/<name>/…` — 各 harness/IDE 的真实模板（唯一事实来源）。目前只有：
  - `templates/trae/rules/git-commit-message.md` — Trae 的 git 提交规范，取自本仓库既有 `.trae/rules/git-commit-message.md`（Conventional Commits + emoji：`feat: ✨` / `fix: 🐛` / `docs: 📝` …，描述用中文，中英/中数之间留一个半角空格）。

## 如何生成 / 安装配置

### 方式 A：跑生成器脚本（可复现，推荐）

```bash
# 把 trae 配置装进当前工程（自动向上找 .git 根）
node .dsh/skills/git-commit-config/gen.js --target trae --out <工程根>
```

- `--target`：目标 harness/IDE，目前只能是 `trae`（缺省即 `trae`）。
- `--out`：目标工程 git 根；会向上查找最近的 `.git` 目录确认根，找不到就直写 `<out>/.trae/rules/…`。缺省为当前工作目录。
- 脚本只是 `copyFileSync` 一份模板过去，不会改动模板本身。

### 方式 B：按模板手工落文件

1. 读模板 `templates/trae/rules/git-commit-message.md` 的完整内容（含 `---` frontmatter）。
2. 判断目标工程 git 根（含 `.git` 的目录）。
3. 在根下创建 `.trae/rules/`，写入 `git-commit-message.md`，内容与模板**逐字一致**（不许改写、增删、重排）。

## 校验清单（生成后必做）

- [ ] 目标文件与对应模板 `diff` 后**字节一致**（含末尾换行）。
- [ ] 安装路径拼法正确：`trae` → `.trae/rules/git-commit-message.md`。
- [ ] frontmatter 保留：`alwaysApply: false`、`description`、`scene: git_message`。
- [ ] 若从「当前工程」生成，确认 `.trae/` 属于**本机配置**（通常被仓库 `.gitignore`），不要把用户本地 `.trae/` 提交进版本库。

## 如何新增一个 harness/IDE

1. 在 `templates/` 下新建目录，路径与目标安装路径镜像对齐（例如新的 `copilot` → `templates/copilot/…`）。
2. 在 `gen.js` 的 `TARGETS` 表补一行 `{ install, template }`。
3. 在「已支持的目标」表格里补一行，并说明它的安装路径与配置形态。

## 关键约束

- **模板即真相**：安装产物必须与 `templates/` 里的模板字节一致。改提交规范 = 改 `templates/` + 重跑生成，别直接手改目标文件（否则下次生成又把旧版本盖回来）。
- **目标可增、模板不破坏**：加新 harness 只加 `templates/` 与 `TARGETS`，不要改既有模板的既定内容。
- **`.trae/` 往往被 gitignore**：生成是往工程本地写文件，不会（也不应）被 `git add`。