<template>
  <div class="market-meta">
    <el-tag type="info" effect="plain">{{ label }}</el-tag>
    <el-tag :type="statusTagType" effect="plain">{{ statusLabel }}</el-tag>
    <span>来源：{{ result?.provider || '--' }}</span>
    <span>数据时间：{{ formatDateTime(result?.sourceTime) }}</span>
    <span v-if="result?.message" class="market-meta__message">{{ result.message }}</span>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { MarketDataStatus } from '@/api/finance/stock'

defineOptions({ name: 'FinanceMarketResultMeta' })

interface MarketResultMeta {
  status: MarketDataStatus
  provider: string | null
  sourceTime: string | null
  fetchedAt: string
  message: string | null
}

const props = defineProps<{
  label: string
  result?: MarketResultMeta
}>()

const statusLabel = computed(
  () =>
    ({
      REALTIME: '实时',
      DELAYED: '延迟',
      CACHED: '缓存',
      UNAVAILABLE: '不可用'
    })[props.result?.status ?? 'UNAVAILABLE']
)

const statusTagType = computed<'success' | 'warning' | 'danger' | 'info'>(
  () =>
    ({
      REALTIME: 'success',
      DELAYED: 'info',
      CACHED: 'warning',
      UNAVAILABLE: 'danger'
    })[props.result?.status ?? 'UNAVAILABLE'] as 'success' | 'warning' | 'danger' | 'info'
)

const formatDateTime = (value?: string | null) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '--'
</script>

<style scoped>
.market-meta {
  display: flex;
  min-height: 40px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  align-items: center;
  gap: 10px;
}

.market-meta__message {
  color: var(--el-color-danger);
}

@media (width <= 720px) {
  .market-meta {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
