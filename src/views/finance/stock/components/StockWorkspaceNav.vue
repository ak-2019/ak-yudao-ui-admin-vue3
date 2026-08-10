<template>
  <div class="stock-workspace-nav" aria-label="投资分析工作台导航">
    <nav class="stock-workspace-nav__items">
      <button
        v-for="item in visibleItems"
        :key="item.key"
        type="button"
        class="stock-workspace-nav__item"
        :class="{ 'is-active': item.key === activeKey }"
        @click="navigate(item.path)"
      >
        <Icon :icon="item.icon" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
    <div class="stock-workspace-nav__context">
      <span>{{ activeItem.description }}</span>
      <el-tooltip content="打开股票分析功能介绍" placement="top">
        <el-button
          link
          type="primary"
          aria-label="打开股票分析功能介绍"
          @click="navigate('/finance/stock-guide')"
        >
          <Icon icon="ep:question-filled" />
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type WorkspaceKey = 'selection' | 'account' | 'statistics' | 'ai'

interface WorkspaceItem {
  key: WorkspaceKey
  label: string
  icon: string
  path: string
  description: string
  match: string[]
}

const route = useRoute()
const router = useRouter()

const items: WorkspaceItem[] = [
  {
    key: 'selection',
    label: '选股工作台',
    icon: 'ep:data-analysis',
    path: '/finance/stock-analysis',
    description: '建立个股池，按分组、标签和行情筛选股票',
    match: ['/finance/stock-analysis']
  },
  {
    key: 'account',
    label: '账户工作台',
    icon: 'ep:wallet-filled',
    path: '/finance/stock-position',
    description: '统一管理持仓、清仓、交易流水和资产快照',
    match: ['/finance/stock-position', '/finance/stock-trade-record']
  },
  {
    key: 'statistics',
    label: '统计工作台',
    icon: 'ep:data-line',
    path: '/finance/stock-statistics',
    description: '观察每日成功率、累计能力、基准和账户净值',
    match: ['/finance/stock-statistics']
  },
  {
    key: 'ai',
    label: 'AI 交易复盘',
    icon: 'ep:magic-stick',
    path: '/finance/stock-ai-analysis',
    description: '基于账户、成交和行情生成可追溯的交易复盘',
    match: ['/finance/stock-ai-analysis']
  }
]

const activeKey = computed<WorkspaceKey>(() => {
  const matched = items.find((item) => item.match.some((path) => route.path.startsWith(path)))
  return matched?.key ?? 'selection'
})

const activeItem = computed(() => items.find((item) => item.key === activeKey.value) ?? items[0])
const visibleItems = computed(() => items)

const navigate = async (path: string) => {
  if (route.path !== path) await router.push(path)
}
</script>

<style scoped lang="scss">
.stock-workspace-nav {
  display: flex;
  min-height: 48px;
  padding: 6px 10px;
  margin-bottom: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.stock-workspace-nav__items {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow-x: auto;
}

.stock-workspace-nav__item {
  display: inline-flex;
  min-height: 34px;
  padding: 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
}

.stock-workspace-nav__item:hover {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.stock-workspace-nav__item.is-active {
  font-weight: 600;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.stock-workspace-nav__context {
  display: inline-flex;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}

@media (width <= 900px) {
  .stock-workspace-nav {
    align-items: stretch;
    flex-direction: column;
    gap: 4px;
  }

  .stock-workspace-nav__context {
    justify-content: space-between;
    padding: 0 4px;
  }
}
</style>
