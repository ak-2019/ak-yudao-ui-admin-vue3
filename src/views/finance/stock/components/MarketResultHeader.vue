<template>
  <div class="market-result-header">
    <MarketResultMeta :label="label" :result="result" />
    <el-tooltip :content="`刷新${label}`" placement="top">
      <el-button circle :aria-label="`刷新${label}`" :loading="loading" @click="emit('refresh')">
        <Icon icon="ep:refresh" />
      </el-button>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { MarketDataStatus } from '@/api/finance/stock'
import MarketResultMeta from './MarketResultMeta.vue'

defineOptions({ name: 'FinanceMarketResultHeader' })

interface MarketResultMeta {
  status: MarketDataStatus
  provider: string | null
  sourceTime: string | null
  fetchedAt: string
  message: string | null
}

defineProps<{
  label: string
  result?: MarketResultMeta
  loading?: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()
</script>

<style scoped>
.market-result-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
</style>
