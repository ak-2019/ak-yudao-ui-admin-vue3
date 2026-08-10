<template>
  <div class="workspace-heading">
    <div class="workspace-heading__main">
      <div class="workspace-title-row">
        <h2>股票工作台</h2>
        <el-tag v-if="activeGroupName" type="info" effect="plain">{{ activeGroupName }}</el-tag>
      </div>
      <div class="workspace-context">
        <span>{{ stockCount }} 只个股</span>
        <span>{{ activeTrackingCount }} 只持续跟踪</span>
        <span v-if="quoteIssueCount > 0" class="workspace-context--warning">
          {{ quoteIssueCount }} 只行情异常
        </span>
      </div>
    </div>
    <div class="workspace-heading__actions">
      <el-tooltip content="维护标签库中的名称、颜色和排序" placement="top">
        <el-button v-if="canManageTags" @click="emit('manage-tags')">
          <Icon icon="ep:price-tag" class="mr-5px" />
          标签管理
        </el-button>
      </el-tooltip>
      <el-tooltip content="刷新跟踪列表" placement="top">
        <el-button :loading="loading" circle aria-label="刷新跟踪列表" @click="emit('refresh')">
          <Icon icon="ep:refresh" />
        </el-button>
      </el-tooltip>
    </div>
  </div>

  <div class="stock-add-bar">
    <div class="stock-search-wrap">
      <el-select
        v-model="selectedKeys"
        class="stock-search"
        clearable
        filterable
        remote
        reserve-keyword
        multiple
        collapse-tags
        collapse-tags-tooltip
        :max-collapse-tags="2"
        :remote-method="(keyword: string) => emit('search', keyword)"
        :loading="searchLoading"
        placeholder="输入股票代码、名称或拼音，搜索本地及真实行情"
        @keyup.enter="emit('add')"
      >
        <el-option
          v-for="stock in searchOptions"
          :key="stock.key"
          :label="`${stock.name}（${stock.symbol}）`"
          :value="stock.key"
          :disabled="stock.disabled"
        >
          <div class="stock-option">
            <div class="stock-option__main">
              <span>{{ stock.name }}</span>
              <el-tag
                :type="stock.source === 'local' ? 'info' : 'warning'"
                size="small"
                effect="plain"
              >
                {{ stock.source === 'local' ? '本地股票池' : '真实行情' }}
              </el-tag>
              <el-tag v-if="stock.tracked" type="success" size="small" effect="plain">
                已跟踪
              </el-tag>
              <el-tag
                v-else-if="stock.source === 'market' && stock.local"
                type="info"
                size="small"
                effect="plain"
              >
                已入库
              </el-tag>
            </div>
            <span class="stock-option__meta">
              {{ stock.symbol }} · {{ stock.marketName
              }}<template v-if="stock.provider"> · {{ stock.provider }}</template>
            </span>
          </div>
        </el-option>
      </el-select>
      <span v-if="searchHint" class="stock-search-hint">{{ searchHint }}</span>
    </div>
    <el-button
      type="primary"
      :disabled="selectedKeys.length === 0"
      v-hasPermi="['finance:stock-track:create']"
      @click="emit('add')"
    >
      <Icon icon="ep:plus" class="mr-5px" />
      添加个股池<span v-if="selectedKeys.length > 0">（{{ selectedKeys.length }}）</span>
    </el-button>
    <el-button v-hasPermi="['finance:stock-track:create']" @click="emit('image-add')">
      <Icon icon="ep:picture" class="mr-5px" />
      识图添加
    </el-button>
  </div>
</template>

<script setup lang="ts">
interface StockSearchOption {
  key: string
  source: 'local' | 'market'
  symbol: string
  marketName: string
  name: string
  provider: string | null
  local: boolean
  tracked: boolean
  disabled: boolean
}

defineProps<{
  activeGroupName?: string
  stockCount: number
  activeTrackingCount: number
  quoteIssueCount: number
  canManageTags: boolean
  loading: boolean
  searchLoading: boolean
  searchHint: string
  searchOptions: StockSearchOption[]
}>()

const selectedKeys = defineModel<string[]>('selectedKeys', { required: true })
const emit = defineEmits<{
  (e: 'manage-tags'): void
  (e: 'refresh'): void
  (e: 'search', keyword: string): void
  (e: 'add'): void
  (e: 'image-add'): void
}>()
</script>

<style scoped>
.workspace-heading,
.workspace-title-row,
.workspace-heading__actions,
.workspace-context,
.stock-add-bar,
.stock-option__main {
  display: flex;
  align-items: center;
}

.workspace-heading {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.workspace-heading__main {
  min-width: 0;
}

.workspace-title-row,
.workspace-heading__actions,
.workspace-context,
.stock-option__main {
  gap: 8px;
}

.workspace-title-row h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.4;
  letter-spacing: 0;
  color: var(--el-text-color-primary);
}

.workspace-context {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.workspace-context span + span::before {
  margin-right: 8px;
  color: var(--el-border-color);
  content: '/';
}

.workspace-context .workspace-context--warning {
  color: #a65f00;
}

.stock-add-bar {
  gap: 10px;
  margin-top: 16px;
}

.stock-search,
.stock-search-wrap {
  width: 100%;
}

.stock-search-wrap {
  min-width: 280px;
  flex: 1;
}

.stock-search-hint,
.stock-option__meta {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stock-search-hint {
  margin-top: 4px;
}

.stock-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 24px;
  line-height: 1.35;
}

.stock-option__main {
  min-width: 0;
  gap: 6px;
}

@media (width <= 720px) {
  .workspace-heading,
  .stock-add-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .workspace-heading__actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .workspace-heading__actions > .el-button {
    flex: 1;
  }

  .workspace-context {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }

  .workspace-context span + span::before {
    display: none;
  }

  .stock-search-wrap {
    min-width: 0;
  }

  .stock-add-bar > .el-button {
    width: 100%;
    margin-left: 0;
  }
}
</style>
