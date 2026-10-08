<script setup lang="ts">
import { FluentIconWeatherMoon24Regular, FluentIconWeatherSunny24Regular } from '@fluere-vue/icons'
import { FluereButton } from '@fluere-vue/ui'

const { isDark, toggle } = useColorMode()
const { t } = useDocsI18n()
</script>

<template>
  <!--
    图标按钮直接复用组件库的 FluereButton（icon-only）：外观/尺寸/悬停/焦点环都交给
    组件实现，站点不再手写一套按钮样式。点击事件透传 MouseEvent，供切换动效取圆心。
  -->
  <FluereButton
    appearance="outline"
    size="medium"
    icon-only
    :aria-label="isDark ? t('theme.switchToLight') : t('theme.switchToDark')"
    :title="isDark ? t('theme.switchToLight') : t('theme.switchToDark')"
    @click="toggle"
  >
    <!--
      两个图标都渲染、可见性交给 CSS（按 html[data-color-mode]，与 content-code.css 同一约定）：
      SSR 与水合的 DOM 完全一致，主题差异由 nuxt.config 的首帧脚本在水合前写入的属性决定，
      既不产生水合告警，也不会闪错图标。aria-label/title 仍是动态文案，靠
      useColorMode 把「读取存储值」推迟到 onMounted（水合完成后）保证属性一致。
    -->
    <template #icon>
      <!-- size 20：Fluent 2 中号图标按钮（32px）配 20px 图标，与 library 的 .fui-button__icon 一致 -->
      <FluentIconWeatherSunny24Regular
        :size="20"
        class="fui-theme-toggle__icon fui-theme-toggle__icon--sun"
      />
      <FluentIconWeatherMoon24Regular
        :size="20"
        class="fui-theme-toggle__icon fui-theme-toggle__icon--moon"
      />
    </template>
  </FluereButton>
</template>

<style scoped>
/* 亮色（或脚本未写入属性）显示月亮、暗色显示太阳 —— 语义与原 isDark 分支一致：
   图标提示的是「可切换到的目标模式」。选择器锚定 html 属性（组件外的全局状态），
   而图标本身带本组件 scope id（插槽内容在父组件作用域编译），故只作用于这两个 svg。 */
html:not([data-color-mode='dark']) .fui-theme-toggle__icon--sun {
  display: none;
}
html[data-color-mode='dark'] .fui-theme-toggle__icon--moon {
  display: none;
}
</style>
