<script setup lang="ts">
/**
 * Playground（视觉回归页）。
 *
 * 用途（对应 docs/todo.md 0.4.8 与 0.1.0 的发布检查项）：把「设置页 + 数据录入表单 +
 * 加载/提示反馈 + 0.4.x 通用件」的真实组合跑在一个页面里，人工过一遍
 * rest / hover / pressed / selected / focus / disabled × 明暗两态——这些状态在单测里
 * 只覆盖契约，看不出「组合起来是否走形」。
 *
 * 自检清单（每次改组件后按这张表过一遍）：
 *   1. rest / hover / pressed / selected / focus（Tab 走一遍）/ disabled 六态齐；
 *   2. 明暗两态无「白闪」、无对比度不足（切右上角按钮）；
 *   3. 浮层：Tooltip 悬停、ContentDialog 打开 → 层级与焦点归还正常（Esc 关闭）；
 *   4. 表单区 Tab 顺序从上到下，焦点环是双层矩形（外 2px + 内 1px）。
 */
import {
  FluentIconCheckmark24Regular,
  FluentIconCloudArrowUp24Regular,
  FluentIconPerson24Regular,
} from '@fluere-vue/icons'
import {
  FluereButton,
  FluereCheckbox,
  FluereCombobox,
  FluereContentDialog,
  FluereInfoBadge,
  FluereInfoBar,
  FluereInput,
  FluereNumberBox,
  FluereProgressBar,
  FluereProgressRing,
  FluereRadioButton,
  FluereRadioGroup,
  FluereSelect,
  FluereSlider,
  FluereToggleButton,
  FluereToggleGroup,
  FluereToggleGroupItem,
  FluereToggleSwitch,
  FluereTooltip,
} from '@fluere-vue/ui'
import { computed, ref } from 'vue'

/* ---------------- 主题切换（与文档站同口径：只改 color-scheme） ---------------- */
const isDark = ref(false)
const applyTheme = (dark: boolean): void => {
  isDark.value = dark
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.documentElement.dataset.colorMode = dark ? 'dark' : 'light'
}
applyTheme(false)

/* ---------------- Wave 1：表单 ---------------- */
const nickname = ref('夕云葛城')
const password = ref('')
const agree = ref(true)
const autoUpdate = ref(true)
const density = ref('comfortable')
const fontSize = ref(14)
const port = ref<number | undefined>(5432)
const region = ref<string | null>('east')
const syncMode = ref<string | null>('auto')

const regionItems = [
  { value: 'east', text: '华东' },
  { value: 'south', text: '华南' },
  { value: 'west', text: '西南', disabled: true },
]

const syncItems = [
  { value: 'auto', text: '自动' },
  { value: 'manual', text: '手动' },
]

/* ---------------- 按钮族 ---------------- */
const formats = ref<string[]>(['bold'])
const singleFormat = ref<string | undefined>('bold')
const pinned = ref<boolean | null>(false)
const triState = ref<boolean | null>(null)

/* ---------------- 反馈 ---------------- */
const progress = ref(35)
const ringValue = ref(60)
const infoOpen = ref(true)

/* ---------------- 浮层 ---------------- */
const dialogOpen = ref(false)
const dialogResult = ref('—')

const summary = computed(
  () =>
    `${nickname.value || '（未命名）'} · ${density.value} · 端口 ${port.value ?? '—'} · 区域 ${
      region.value ?? '—'
    } · 同步 ${syncMode.value ?? '—'} · 格式 ${formats.value.join('/') || '—'}`,
)
</script>

<template>
  <div class="pg-shell">
    <header class="pg-header">
      <div>
        <h1 class="pg-title">FluereVue Playground · 视觉回归</h1>
        <p class="pg-subtitle">
          Wave 1 子集 + 0.4.x 通用件的全状态陈列。切主题、Tab 走一遍、逐个 hover / 按下，与本页
          README 的自检清单对齐。
        </p>
      </div>
      <div class="pg-row">
        <FluereToggleButton
          :checked="isDark"
          :icon="FluentIconCheckmark24Regular"
          @update:checked="(value) => applyTheme(value === true)"
        >
          深色主题
        </FluereToggleButton>
      </div>
    </header>

    <!-- 1. 表单 -->
    <section class="pg-card">
      <h2 class="pg-card__title">1 · 表单（Wave 1）</h2>
      <p class="pg-card__hint">密排设置页：每项都能 Tab 到、每项都有 header / description。</p>

      <div class="pg-grid">
        <FluereInput
          v-model="nickname"
          header="昵称"
          description="普通文本，失焦不校验"
        />

        <FluereInput
          v-model="password"
          type="password"
          header="密码"
          description="含显示 / 隐藏按钮（0.4.5）"
        />

        <FluereNumberBox
          v-model="port"
          header="端口"
          :min="1"
          :max="65535"
        />

        <FluereSelect
          v-model="region"
          :items="regionItems"
          header="区域"
          description="不可编辑；西南为禁用项"
          placeholder="请选择区域"
        />

        <FluereCombobox
          v-model="syncMode"
          :items="syncItems"
          header="同步方式"
          description="可编辑 + 文本搜索"
        />

        <div class="pg-col">
          <FluereCheckbox v-model="agree">同意服务条款</FluereCheckbox>
          <FluereCheckbox
            v-model="agree"
            disabled
          >
            禁用态复选框
          </FluereCheckbox>
          <FluereToggleSwitch v-model="autoUpdate">自动更新</FluereToggleSwitch>
        </div>

        <div class="pg-col">
          <FluereRadioGroup v-model="density">
            <FluereRadioButton value="compact">紧凑</FluereRadioButton>
            <FluereRadioButton value="comfortable">舒适</FluereRadioButton>
            <FluereRadioButton value="spacious">宽松</FluereRadioButton>
          </FluereRadioGroup>
        </div>

        <div class="pg-col">
          <FluereSlider
            v-model="fontSize"
            :min="10"
            :max="24"
            :step="1"
          />
          <span class="pg-card__hint">字号 {{ fontSize }}px</span>
        </div>
      </div>

      <p class="pg-card__hint">当前取值：{{ summary }}</p>
    </section>

    <!-- 2. 按钮族 -->
    <section class="pg-card">
      <h2 class="pg-card__title">2 · 按钮族</h2>
      <p class="pg-card__hint">五档外观 × 三档尺寸；切换按钮的单选组 / 多选组与三态。</p>

      <div class="pg-row">
        <FluereButton appearance="primary">Primary</FluereButton>
        <FluereButton appearance="secondary">Secondary</FluereButton>
        <FluereButton appearance="outline">Outline</FluereButton>
        <FluereButton appearance="subtle">Subtle</FluereButton>
        <FluereButton appearance="transparent">Transparent</FluereButton>
        <FluereButton disabled>Disabled</FluereButton>
      </div>

      <div class="pg-row">
        <FluereButton size="small">Small</FluereButton>
        <FluereButton size="medium">Medium</FluereButton>
        <FluereButton size="large">Large</FluereButton>
        <FluereButton
          appearance="subtle"
          icon-only
          :icon="FluentIconPerson24Regular"
          aria-label="账户"
        />
      </div>

      <div class="pg-row">
        <FluereToggleButton
          v-model:checked="pinned"
          :icon="FluentIconCloudArrowUp24Regular"
        >
          固定到任务栏
        </FluereToggleButton>
        <FluereToggleButton
          v-model:checked="triState"
          three-state
        >
          三态开关
        </FluereToggleButton>
        <FluereToggleButton disabled>禁用切换</FluereToggleButton>
      </div>

      <div class="pg-row">
        <FluereToggleGroup v-model="singleFormat">
          <FluereToggleGroupItem value="bold">加粗</FluereToggleGroupItem>
          <FluereToggleGroupItem value="italic">倾斜</FluereToggleGroupItem>
          <FluereToggleGroupItem
            value="underline"
            disabled
          >
            下划线
          </FluereToggleGroupItem>
        </FluereToggleGroup>

        <FluereToggleGroup
          v-model="formats"
          type="multiple"
        >
          <FluereToggleGroupItem value="bold">B</FluereToggleGroupItem>
          <FluereToggleGroupItem value="italic">I</FluereToggleGroupItem>
          <FluereToggleGroupItem value="underline">U</FluereToggleGroupItem>
        </FluereToggleGroup>
      </div>
    </section>

    <!-- 3. 反馈 -->
    <section class="pg-card">
      <h2 class="pg-card__title">3 · 反馈与状态</h2>
      <p class="pg-card__hint">
        InfoBar / InfoBadge / ProgressBar / ProgressRing 的确定与不确定态。
      </p>

      <FluereInfoBar
        v-model:open="infoOpen"
        severity="success"
        title="已保存"
        message="设置已写入本机；可在「高级」里回滚。"
      />

      <div
        class="pg-row"
        style="margin-top: var(--spacingVerticalL)"
      >
        <FluereInfoBadge :value="3" />
        <FluereInfoBadge severity="attention" />
        <FluereInfoBadge
          severity="success"
          :value="12"
        />
      </div>

      <div
        class="pg-grid"
        style="margin-top: var(--spacingVerticalL)"
      >
        <div class="pg-col">
          <span class="pg-card__hint">ProgressBar（确定）</span>
          <FluereProgressBar v-model="progress" />
        </div>
        <div class="pg-col">
          <span class="pg-card__hint">ProgressBar（不确定）</span>
          <FluereProgressBar indeterminate />
        </div>
        <div class="pg-col">
          <span class="pg-card__hint">ProgressRing（确定）</span>
          <FluereProgressRing v-model="ringValue" />
        </div>
        <div class="pg-col">
          <span class="pg-card__hint">ProgressRing（不确定）</span>
          <FluereProgressRing indeterminate />
        </div>
      </div>
    </section>

    <!-- 4. 浮层 -->
    <section class="pg-card">
      <h2 class="pg-card__title">4 · 浮层</h2>
      <p class="pg-card__hint">Tooltip 悬停、ContentDialog 打开并 Esc 关闭，确认层级与焦点归还。</p>

      <div class="pg-row">
        <FluereTooltip content="这是 ToolTip（层级刻度里永远最上层）">
          <FluereButton appearance="subtle">悬停看提示</FluereButton>
        </FluereTooltip>

        <FluereButton
          appearance="primary"
          @click="dialogOpen = true"
        >
          打开 ContentDialog
        </FluereButton>

        <span class="pg-card__hint">closed.result：{{ dialogResult }}</span>
      </div>

      <FluereContentDialog
        v-model:open="dialogOpen"
        title="保存前确认"
        primary-button-text="保存"
        secondary-button-text="取消"
        default-button="primary"
        @closed="(args) => (dialogResult = args.result)"
      >
        关闭后焦点会回到「打开 ContentDialog」按钮上；Esc 与「取消」等价。
      </FluereContentDialog>
    </section>
  </div>
</template>
