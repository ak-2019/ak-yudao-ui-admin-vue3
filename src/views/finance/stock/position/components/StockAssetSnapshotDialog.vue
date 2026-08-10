<template>
  <el-dialog
    v-model="visible"
    title="账户资产历史"
    width="min(1080px, calc(100vw - 24px))"
    destroy-on-close
  >
    <el-alert
      title="历史数据从持仓页的“保存今日快照”产生；同一天重复保存会更新当天记录。系统不会读取同花顺个人账号。"
      type="info"
      :closable="false"
      show-icon
      class="mb-16px"
    />
    <div v-if="latestSnapshot" class="asset-snapshot-summary">
      <span
        >快照数 <strong>{{ snapshots.length }}</strong></span
      >
      <span>
        当前净值收益
        <strong :class="changeClass(latestSnapshot.cumulativeReturnRate)">
          {{ formatPercent(latestSnapshot.cumulativeReturnRate) }}
        </strong>
      </span>
      <span>
        最大回撤
        <strong :class="changeClass(latestSnapshot.maxDrawdownRate)">
          {{ formatPercent(latestSnapshot.maxDrawdownRate) }}
        </strong>
      </span>
      <span
        >最新总资产 <strong>{{ formatAmount(latestSnapshot.totalAsset) }}</strong></span
      >
    </div>
    <el-table
      v-loading="loading"
      :data="snapshots"
      stripe
      max-height="520"
      empty-text="暂无资产快照，请先保存今日快照"
    >
      <el-table-column prop="snapshotDate" label="日期" width="128" fixed />
      <el-table-column prop="totalAsset" label="总资产" min-width="130" align="right">
        <template #default="{ row }">{{ formatAmount(row.totalAsset) }}</template>
      </el-table-column>
      <el-table-column prop="holdingAsset" label="持仓市值" min-width="130" align="right">
        <template #default="{ row }">{{ formatAmount(row.holdingAsset) }}</template>
      </el-table-column>
      <el-table-column prop="availableAsset" label="可用资产" min-width="130" align="right">
        <template #default="{ row }">{{ formatAmount(row.availableAsset) }}</template>
      </el-table-column>
      <el-table-column prop="dailyProfitRate" label="当日收益" min-width="120" align="right">
        <template #default="{ row }">
          <span :class="changeClass(row.dailyProfitRate)">{{
            formatPercent(row.dailyProfitRate)
          }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="cumulativeReturnRate"
        label="累计净值收益"
        min-width="140"
        align="right"
      >
        <template #default="{ row }">
          <span :class="changeClass(row.cumulativeReturnRate)">
            {{ formatPercent(row.cumulativeReturnRate) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="maxDrawdownRate" label="最大回撤" min-width="120" align="right">
        <template #default="{ row }">
          <span :class="changeClass(row.maxDrawdownRate)">
            {{ formatPercent(row.maxDrawdownRate) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="positionCount" label="持仓数" width="90" align="right" />
      <el-table-column prop="missingValuationCount" label="缺失估值" width="100" align="right" />
    </el-table>
  </el-dialog>
</template>

<script setup lang="ts">
import type { StockPositionAssetSnapshotVO } from '@/api/finance/stock/position'

const props = defineProps<{
  snapshots: StockPositionAssetSnapshotVO[]
  loading: boolean
}>()

const visible = defineModel<boolean>({ required: true })
const latestSnapshot = computed(() => props.snapshots.at(-1) ?? null)

const formatAmount = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : Number(value).toLocaleString('zh-CN', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
      })

const formatPercent = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%`

const changeClass = (value?: number | null) => {
  if ((value ?? 0) > 0) return 'profit-up'
  if ((value ?? 0) < 0) return 'profit-down'
  return 'profit-flat'
}
</script>

<style scoped>
.asset-snapshot-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 18px 28px;
  padding: 0 0 16px;
  color: var(--el-text-color-secondary);
}

.asset-snapshot-summary strong {
  margin-left: 6px;
  color: var(--el-text-color-primary);
}

.profit-up {
  color: #d94848;
}

.profit-down {
  color: #22936d;
}

.profit-flat {
  color: var(--el-text-color-regular);
}
</style>
