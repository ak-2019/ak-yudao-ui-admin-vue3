<template>
  <div class="filter-command-row">
    <div class="filter-command-main">
      <el-badge :value="advancedFilterCount" :hidden="advancedFilterCount === 0">
        <el-button
          :type="expanded || advancedFilterCount > 0 ? 'primary' : undefined"
          :plain="advancedFilterCount === 0"
          @click="expanded = !expanded"
        >
          <Icon icon="ep:filter" class="mr-5px" />
          筛选
          <Icon :icon="expanded ? 'ep:arrow-up' : 'ep:arrow-down'" class="ml-5px" />
        </el-button>
      </el-badge>
      <div v-if="activeFilterChips.length > 0" class="active-filter-chips">
        <el-tag
          v-for="chip in activeFilterChips"
          :key="chip.key"
          closable
          effect="plain"
          @close="emit('clear-chip', chip.key)"
        >
          {{ chip.label }}
        </el-tag>
      </div>
      <span v-else class="filter-command-empty">当前未限定地域、行业、标签或日期</span>
    </div>
    <el-button v-if="hasListFilters" link type="primary" @click="emit('reset')">
      清空全部
    </el-button>
  </div>

  <el-collapse-transition>
    <div v-show="expanded" class="filter-panel">
      <el-select
        v-model="province"
        class="filter-select"
        clearable
        filterable
        placeholder="全部省份"
      >
        <el-option v-for="item in provinceOptions" :key="item" :label="item" :value="item" />
      </el-select>
      <el-select v-model="city" class="filter-select" clearable filterable placeholder="全部城市">
        <el-option v-for="item in cityOptions" :key="item" :label="item" :value="item" />
      </el-select>
      <el-select
        v-model="industry"
        class="filter-select filter-select--industry"
        clearable
        filterable
        placeholder="全部行业"
      >
        <el-option v-for="item in industryOptions" :key="item" :label="item" :value="item" />
      </el-select>
      <el-select
        v-model="tagIds"
        class="filter-tags"
        multiple
        clearable
        collapse-tags
        collapse-tags-tooltip
        :max-collapse-tags="2"
        placeholder="全部标签"
      >
        <el-option v-for="tag in tags" :key="tag.id" :label="tag.name" :value="tag.id">
          <span class="tag-option-dot" :style="{ backgroundColor: tag.color }"></span>
          <span>{{ tag.name }}</span>
        </el-option>
      </el-select>
      <el-segmented
        v-model="tagMode"
        :options="tagMatchOptions"
        :disabled="tagIds.length === 0"
        class="tag-match-mode"
      />
      <el-date-picker
        v-model="dateRange"
        class="filter-date-range"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="跟踪开始日期"
        end-placeholder="跟踪结束日期"
        unlink-panels
        :shortcuts="dateShortcuts"
      />
    </div>
  </el-collapse-transition>
</template>

<script setup lang="ts">
import type { FinanceDateRangeShortcut } from '@/views/finance/utils/dateShortcuts'

interface ActiveFilterChip {
  key: string
  label: string
}

interface StockTag {
  id: number
  name: string
  color: string
}

defineProps<{
  advancedFilterCount: number
  activeFilterChips: ActiveFilterChip[]
  hasListFilters: boolean
  provinceOptions: string[]
  cityOptions: string[]
  industryOptions: string[]
  tags: StockTag[]
  tagMatchOptions: Array<{ label: string; value: string }>
  dateShortcuts: FinanceDateRangeShortcut[]
}>()

const expanded = defineModel<boolean>('expanded', { required: true })
const province = defineModel<string | undefined>('province', { required: true })
const city = defineModel<string | undefined>('city', { required: true })
const industry = defineModel<string | undefined>('industry', { required: true })
const tagIds = defineModel<number[]>('tagIds', { required: true })
const tagMode = defineModel<string>('tagMode', { required: true })
const dateRange = defineModel<[string, string] | null>('dateRange', { required: true })

const emit = defineEmits<{
  (e: 'clear-chip', key: string): void
  (e: 'reset'): void
}>()
</script>

<style scoped>
.filter-command-row,
.filter-command-main,
.active-filter-chips,
.filter-panel {
  display: flex;
  align-items: center;
}

.filter-command-row {
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.filter-command-main {
  min-width: 0;
  flex: 1;
  gap: 10px;
}

.active-filter-chips {
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-command-empty {
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-panel {
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px;
  margin-top: 12px;
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.filter-select {
  width: 156px;
}

.filter-select--industry {
  width: 184px;
}

.filter-tags {
  width: 240px;
}

.tag-option-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 8px;
  border-radius: 50%;
}

.tag-match-mode {
  flex: none;
}

.filter-date-range {
  width: 300px;
}

@media (width <= 720px) {
  .filter-command-row,
  .filter-command-main {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-command-main,
  .active-filter-chips {
    width: 100%;
  }

  .filter-command-empty {
    white-space: normal;
  }

  .filter-panel {
    align-items: stretch;
  }

  .filter-select,
  .filter-select--industry {
    width: calc(50% - 6px);
  }

  .filter-tags,
  .tag-match-mode,
  .filter-date-range {
    width: 100%;
  }
}
</style>
