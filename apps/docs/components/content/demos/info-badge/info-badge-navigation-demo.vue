<script setup lang="ts">
import {
  FluentIconHome20Regular,
  FluentIconMail20Regular,
  FluentIconPerson20Regular,
  FluentIconSettings20Regular,
} from '@fluere-vue/icons'
import {
  FluereInfoBadge,
  FluereRadioButton,
  FluereRadioGroup,
  FluereToggleSwitch,
} from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

/**
 * 对齐 Gallery 示例 1「InfoBadge embedded in NavigationView」：
 * 徽章挂在「Inbox」导航项上，右侧选项面板控制 `InfoBadge.Opacity` 与
 * `NavigationView.PaneDisplayMode`（LeftExpanded / LeftCompact）。
 *
 * 文档站没有 NavigationView 组件（rc.1 明确不做），这里用 UnoCSS 拼一个等价面板：
 * 只保留与徽章有关的两点——徽章跟随导航项排布、以及窄栏（Compact）下徽章仍贴住图标。
 * 可访问名按 Gallery 的做法挂在**导航项**上
 * （`AutomationProperties.Name="Inbox, 5 notifications"`），而不是挂在徽章上。
 *
 * `Opacity` 与 `PaneDisplayMode` 在 WinUI 里都是瞬时赋值，故这里也不加过渡动画。
 */
const MENU = [
  { key: 'home', label: 'Home', icon: FluentIconHome20Regular, badge: null },
  { key: 'account', label: 'Account', icon: FluentIconPerson20Regular, badge: null },
  { key: 'inbox', label: 'Inbox', icon: FluentIconMail20Regular, badge: 5 },
]

const paneDisplayMode = ref<'LeftExpanded' | 'LeftCompact'>('LeftExpanded')
const badgeVisible = ref(true)

/** `InfoBadge.Opacity`：Gallery 用 ToggleSwitch 在 0 / 1 之间切换 */
const badgeOpacity = computed(() => (badgeVisible.value ? 1 : 0))
const itemLabel = (label: string, badge: number | null): string | undefined =>
  badge === null ? undefined : `${label}, ${badge} notifications`
</script>

<template>
  <div class="ib-nav-demo">
    <nav
      class="ib-nav-demo__pane"
      :class="{ 'ib-nav-demo__pane--compact': paneDisplayMode === 'LeftCompact' }"
      :aria-label="t('demos.info-badge.navigation.navLabel')"
    >
      <ul class="ib-nav-demo__list">
        <li
          v-for="item in MENU"
          :key="item.key"
          class="ib-nav-demo__item"
          :aria-label="itemLabel(item.label, item.badge)"
        >
          <span class="ib-nav-demo__icon"><component :is="item.icon" /></span>
          <span class="ib-nav-demo__label">{{ item.label }}</span>
          <FluereInfoBadge
            v-if="item.badge !== null"
            class="ib-nav-demo__badge"
            :value="item.badge"
            :style="{ opacity: badgeOpacity }"
          />
        </li>
        <li class="ib-nav-demo__spacer" />
        <li class="ib-nav-demo__item">
          <span class="ib-nav-demo__icon"><FluentIconSettings20Regular /></span>
          <span class="ib-nav-demo__label">Settings</span>
        </li>
      </ul>
    </nav>

    <div class="ib-nav-demo__options">
      <FluereToggleSwitch v-model="badgeVisible">InfoBadge Opacity</FluereToggleSwitch>

      <div class="flex flex-col gap-fluent-xs">
        <span class="text-sm text-colorNeutralForeground2">Display Mode</span>
        <FluereRadioGroup v-model="paneDisplayMode">
          <FluereRadioButton value="LeftExpanded">LeftExpanded</FluereRadioButton>
          <FluereRadioButton value="LeftCompact">LeftCompact</FluereRadioButton>
        </FluereRadioGroup>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ib-nav-demo {
  display: flex;
  gap: var(--spacingHorizontalXL);
  align-items: flex-start;
  flex-wrap: wrap;
}

.ib-nav-demo__pane {
  flex: 1 1 420px;
  min-width: 0;
  padding-block: var(--spacingVerticalS);
  background-color: var(--colorNeutralCardBackground);
  border-radius: var(--borderRadiusMedium);
}

.ib-nav-demo__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ib-nav-demo__item {
  display: flex;
  align-items: center;
  gap: var(--spacingHorizontalM);
  min-block-size: 36px;
  padding-inline: var(--spacingHorizontalM);
  color: var(--colorNeutralForeground1);
}

.ib-nav-demo__icon {
  display: inline-flex;
  flex: 0 0 auto;
  line-height: 0;
}

.ib-nav-demo__label {
  flex: 1 1 auto;
}

/* Compact（PaneDisplayMode=LeftCompact）：收窄栏宽，徽章仍贴住图标 */
.ib-nav-demo__pane--compact {
  flex-basis: 132px;
}

.ib-nav-demo__pane--compact .ib-nav-demo__label {
  display: none;
}

.ib-nav-demo__badge {
  flex: 0 0 auto;
}

.ib-nav-demo__spacer {
  block-size: 32px;
}

.ib-nav-demo__options {
  display: flex;
  flex-direction: column;
  gap: var(--spacingVerticalL);
  flex: 0 0 200px;
}
</style>
