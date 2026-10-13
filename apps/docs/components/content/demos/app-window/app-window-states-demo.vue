<script setup lang="ts">
import { FluereAppWindow, FluereCheckbox } from '@fluere-vue/ui'
import { ref } from 'vue'

/**
 * 窗口的三种「集成样式」由外部状态驱动，组件只负责呈现与过渡：
 *
 *   - **失活（非前台）**：`active=false` ⇒ 标题 / 副标题换 `TextFillColorTertiary`
 *     语义位的前景，图标 / 左头 / 中段 / 右头 `Opacity=0.5`（对应
 *     `TitleBar.cpp#OnInputActivationChanged` 的两个分支）。
 *     真机上这个状态来自 `InputActivationListener`；Web 侧由外壳自行接
 *     `document.visibilitychange` / `window.blur` 驱动。
 *   - **最大化**：`maximized=true` ⇒ 圆角归零、阴影消失、caption 字形切成「还原」。
 *     **组件不改几何**：尺寸由外壳决定。
 *   - **动效**：`motion="auto"`（缺省）只给窗口框体（圆角 / 阴影 / 底色）挂 token 化过渡，
 *     并尊重 `prefers-reduced-motion`；标题栏内部状态切换一律零时长（对齐
 *     `GoToState(..., false)`）。`motion="none"` 完全关闭过渡。
 */
const { t } = useDocsI18n()

const active = ref(true)
const maximized = ref(false)
</script>

<template>
  <div class="flex flex-col gap-fluent-l py-fluent-s">
    <div class="flex flex-wrap items-center gap-fluent-l">
      <FluereCheckbox v-model="active">
        {{ t('demos.app-window.states.active') }}
      </FluereCheckbox>
      <FluereCheckbox v-model="maximized">
        {{ t('demos.app-window.states.maximized') }}
      </FluereCheckbox>
    </div>

    <div class="grid gap-fluent-l md:grid-cols-2">
      <FluereAppWindow
        class="h-[220px]"
        :active="active"
        :maximized="maximized"
        :title="t('demos.app-window.states.leftTitle')"
        :subtitle="t('demos.app-window.states.leftSubtitle')"
      >
        <template #content>
          <div class="p-fluent-l text-xs text-colorNeutralForeground3">
            {{ t('demos.app-window.states.leftBody') }}
          </div>
        </template>
      </FluereAppWindow>

      <FluereAppWindow
        class="h-[220px]"
        motion="none"
        :title="t('demos.app-window.states.rightTitle')"
        :is-back-button-visible="true"
        :is-pane-toggle-button-visible="true"
      >
        <template #right-header>
          <span class="pr-fluent-s text-xs text-colorNeutralForeground3">
            {{ t('demos.app-window.states.rightHeader') }}
          </span>
        </template>
        <template #content>
          <div class="p-fluent-l text-xs text-colorNeutralForeground3">
            {{ t('demos.app-window.states.rightBody') }}
          </div>
        </template>
      </FluereAppWindow>
    </div>
  </div>
</template>
