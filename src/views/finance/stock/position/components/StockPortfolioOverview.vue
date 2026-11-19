<template>
  <div class="portfolio-header">
    <div class="portfolio-title">
      <div>
        <h1>我的持仓</h1>
        <p>
          {{ summary.positionCount }} 只持仓
          <span v-if="summary.latestImportTime"
            >· 快照 {{ formatDateTime(summary.latestImportTime) }}</span
          >
        </p>
      </div>
      <el-tag v-if="summary.missingValuationCount" type="warning" effect="plain">
        {{ summary.missingValuationCount }} 只缺少估值
      </el-tag>
    </div>

    <div class="portfolio-actions">
      <el-button
        type="primary"
        v-hasPermi="['finance:stock-position:create']"
        @click="emit('create')"
      >
        <Icon icon="ep:plus" class="mr-5px" />
        录入持仓
      </el-button>
      <el-button v-hasPermi="['finance:stock-position:create']" @click="emit('import')">
        <Icon icon="ep:upload" class="mr-5px" />
        导入 Excel
      </el-button>
      <el-button :loading="quoteLoading" @click="emit('refresh-quotes')">
        <Icon icon="ep:trend-charts" class="mr-5px" />
        刷新行情
      </el-button>
      <el-button
        :loading="snapshotSaving"
        v-hasPermi="['finance:stock-position:update']"
        @click="emit('save-snapshot')"
      >
        <Icon icon="ep:camera" class="mr-5px" />
        保存今日快照
      </el-button>
      <el-button :loading="snapshotLoading" @click="emit('open-history')">
        <Icon icon="ep:trend-charts" class="mr-5px" />
        资产历史
      </el-button>
      <el-tooltip content="重新加载持仓、清仓和账户数据" placement="top">
        <el-button circle :loading="loading" aria-label="重新加载数据" @click="emit('refresh')">
          <Icon icon="ep:refresh" />
        </el-button>
      </el-tooltip>
    </div>
  </div>

  <div class="portfolio-summary">
    <section class="summary-metric summary-metric--asset">
      <div class="summary-metric__label">
        <span>总资产</span>
        <el-tooltip content="设置总资产" placement="top">
          <el-button
            link
            type="primary"
            aria-label="设置总资产"
            v-hasPermi="['finance:stock-position:update']"
            @click="emit('edit-asset')"
          >
            <Icon icon="ep:edit" />
          </el-button>
        </el-tooltip>
      </div>
      <strong>{{ formatAmount(summary.totalAsset) }}</strong>
    </section>
    <section class="summary-metric summary-metric--cash">
      <span>可用资产</span>
      <strong>{{ formatAmount(summary.availableAsset) }}</strong>
    </section>
    <section class="summary-metric">
      <span>持有金额</span>
      <strong>{{ formatAmount(summary.holdingAmount) }}</strong>
    </section>
    <section class="summary-metric" :class="changeClass(summary.holdingProfitLoss)">
      <span>持有盈亏</span>
      <strong>{{ formatSignedAmount(summary.holdingProfitLoss) }}</strong>
    </section>
    <section class="summary-metric" :class="changeClass(summary.dailyProfitLoss)">
      <span>当日盈亏</span>
      <strong>{{ formatSignedAmount(summary.dailyProfitLoss) }}</strong>
    </section>
    <section class="summary-metric">
      <span>仓位占比</span>
      <strong>{{ formatPercent(summary.positionRatio) }}</strong>
    </section>
    <section class="summary-metric">
      <span>上涨 / 下跌</span>
      <strong>{{ summary.risingCount }} / {{ summary.fallingCount }}</strong>
    </section>
    <section class="summary-metric">
      <span>持仓股票</span>
      <strong>{{ summary.positionCount }}</strong>
    </section>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'

interface PortfolioSummary {
  totalAsset: number | null
  availableAsset: number | null
  holdingAmount: number
  holdingProfitLoss: number
  dailyProfitLoss: number
  positionRatio: number | null
  positionCount: number
  risingCount: number
  fallingCount: number
  missingValuationCount: number
  latestImportTime: string | null
}

defineProps<{
  summary: PortfolioSummary
  loading: boolean
  quoteLoading: boolean
  snapshotSaving: boolean
  snapshotLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'create'): void
  (e: 'import'): void
  (e: 'refresh-quotes'): void
  (e: 'save-snapshot'): void
  (e: 'open-history'): void
  (e: 'refresh'): void
  (e: 'edit-asset'): void
}>()

const formatAmount = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : Number(value).toLocaleString('zh-CN', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
      })

const formatSignedAmount = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : `${Number(value) > 0 ? '+' : ''}${formatAmount(Number(value))}`

const formatPercent = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%`

const formatDateTime = (value?: string | null) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '--'

const changeClass = (value?: number | null) => {
  if ((value ?? 0) > 0) return 'profit-up'
  if ((value ?? 0) < 0) return 'profit-down'
  return 'profit-flat'
}
</script>

<style scoped>
.portfolio-header,
.portfolio-title,
.portfolio-actions,
.summary-metric__label {
  display: flex;
  align-items: center;
}

.portfolio-header {
  justify-content: space-between;
  gap: 16px;
}

.portfolio-title {
  min-width: 0;
  gap: 10px;
}

.portfolio-title h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.3;
  letter-spacing: 0;
}

.portfolio-title p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.portfolio-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.portfolio-actions .el-button {
  margin-left: 0;
}

.portfolio-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 18px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}

.summary-metric {
  display: flex;
  min-width: 0;
  min-height: 74px;
  padding: 12px 16px;
  flex-direction: column;
  justify-content: center;
  border-top: 1px solid var(--el-border-color-lighter);
  border-left: 1px solid var(--el-border-color-lighter);
}

.summary-metric:nth-child(-n + 4) {
  border-top: 0;
}

.summary-metric:nth-child(4n + 1) {
  border-left: 0;
}

.summary-metric--asset {
  box-shadow: inset 0 3px var(--el-color-primary);
}

.summary-metric--cash {
  box-shadow: inset 0 3px #2c8c73;
}

.summary-metric > span,
.summary-metric__label {
  margin-bottom: 5px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-metric__label {
  justify-content: space-between;
}

.summary-metric__label .el-button {
  width: 24px;
  height: 24px;
  padding: 0;
}

.summary-metric strong {
  overflow: hidden;
  font-size: 19px;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
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

@media (width <= 900px) {
  .portfolio-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-metric:nth-child(n) {
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 1px solid var(--el-border-color-lighter);
  }

  .summary-metric:nth-child(-n + 2) {
    border-top: 0;
  }

  .summary-metric:nth-child(2n + 1) {
    border-left: 0;
  }
}

@media (width <= 720px) {
  .portfolio-header {
    align-items: stretch;
    flex-direction: column;
  }

  .portfolio-actions {
    justify-content: flex-start;
  }

  .portfolio-actions .el-button:not(.is-circle) {
    flex: 1 1 auto;
  }
}
</style>
