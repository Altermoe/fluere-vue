---
'@fluere-vue/ui': patch
'@fluere-vue/designs': patch
'@fluere-vue/hooks': patch
'@fluere-vue/icons': patch
'@fluere-vue/themes': patch
'@fluere-vue/utils': patch
---

0.4.1 预发布（alpha）：ScrollView 手势拆分、ToggleSwitch 无障碍修正、Button 过渡口径统一。

**ScrollView**：拆分触摸与笔输入，新增共用平移手势状态机（`pan` 手势与指针捕获解耦，笔输入走独立分支）。

**ToggleSwitch**：隐藏的表单复选框移出 Tab 序与无障碍树，修掉键盘 Tab 被不可见控件截获的问题。

**FluereButton**：背景过渡统一到 WinUI A 级口径（`background-color 83ms linear`，来源 `Button_themeresources.xaml`），与 `FluereToggleButton` 一致。

**文档与构建**：文档站接入 `@nuxtjs/sitemap` / `@nuxtjs/robots`，生产构建改用 esbuild 压缩 CSS；`README` 当前版本指引更新为 `0.4.1-alpha.1`；`docs/release.md` 按 changesets 实际判定修正 dist-tag 口径，并记录 OneDev 部署结果与 tag 推送顺序的踩坑。
