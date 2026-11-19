<template>
  <div class="statistics-workbench">
    <div class="statistics-primary">
      <span>全账户综合成功率</span>
      <strong :class="changeClass(winRate)">{{ formatPercent(winRate) }}</strong>
      <small>{{ sampleCount }} 只有效股票</small>
    </div>
    <div class="statistics-distribution">
      <div class="distribution-heading">
        <span>最终累计结果</span>
        <span>{{ total }} 只</span>
      </div>
      <div class="distribution-counts">
        <span class="price-up">上涨 {{ winCount }}</span>
        <span class="price-down">下跌 {{ lossCount }}</span>
        <span class="price-flat">平盘 {{ flatCount }}</span>
      </div>
      <div class="distribution-bar" aria-hidden="true">
        <span class="distribution-bar__win" :style="{ width: `${distribution.win}%` }"></span>
        <span class="distribution-bar__loss" :style="{ width: `${distribution.loss}%` }"></span>
        <span class="distribution-bar__flat" :style="{ width: `${distribution.flat}%` }"></span>
      </div>
    </div>
    <div class="statistics-context-grid">
      <div class="context-metric">
        <span>当前显示</span>
        <strong>{{ visibleCount }}</strong>
      </div>
      <div class="context-metric">
        <span>持续跟踪</span>
        <strong>{{ activeTrackingCount }}</strong>
      </div>
      <div class="context-metric">
        <span>平均累计涨幅</span>
        <strong :class="changeClass(averageCumulativeChange)">
          {{ formatPercent(averageCumulativeChange) }}
        </strong>
      </div>
      <div class="context-metric" :class="{ 'context-metric--warning': quoteIssueCount > 0 }">
        <span>行情异常</span>
        <strong>{{ quoteIssueCount }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  winRate?: number | null
  sampleCount: number
  winCount: number
  lossCount: number
  flatCount: number
  total: number
  distribution: { win: number; loss: number; flat: number }
  visibleCount: number
  activeTrackingCount: number
  averageCumulativeChange?: number | null
  quoteIssueCount: number
}>()

const changeClass = (value?: number | null) => {
  if ((value ?? 0) > 0) return 'price-up'
  if ((value ?? 0) < 0) return 'price-down'
  return 'price-flat'
}

const formatPercent = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%`
</script>

<style scoped>
.statistics-workbench {
  display: grid;
  grid-template-columns: minmax(160px, 0.75fr) minmax(260px, 1.15fr) minmax(420px, 1.7fr);
  min-height: 104px;
  margin-top: 14px;
  overflow: hidden;
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}

.statistics-primary,
.statistics-distribution,
.statistics-context-grid {
  min-width: 0;
  padding: 14px 16px;
}

.statistics-primary {
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: inset 3px 0 var(--el-color-primary);
}

.statistics-primary span,
.context-metric span,
.distribution-heading,
.statistics-primary small {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.statistics-primary strong {
  margin: 3px 0;
  font-size: 28px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.statistics-distribution {
  border-left: 1px solid var(--el-border-color-lighter);
}

.distribution-heading,
.distribution-counts {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.distribution-counts {
  margin-top: 13px;
  font-size: 13px;
  font-weight: 600;
}

.distribution-bar {
  display: flex;
  height: 8px;
  margin-top: 12px;
  overflow: hidden;
  background: var(--el-fill-color-darker);
  border-radius: 2px;
}

.distribution-bar__win {
  background: #d94848;
}

.distribution-bar__loss {
  background: #22936d;
}

.distribution-bar__flat {
  background: #8c95a3;
}

.statistics-context-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-left: 1px solid var(--el-border-color-lighter);
}

.context-metric {
  display: flex;
  min-width: 0;
  padding: 0 12px;
  flex-direction: column;
  justify-content: center;
  border-left: 1px solid var(--el-border-color-lighter);
}

.context-metric:first-child {
  border-left: 0;
}

.context-metric strong {
  margin-top: 5px;
  overflow: hidden;
  font-size: 20px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.context-metric--warning strong {
  color: var(--el-color-warning);
}

.price-up {
  color: #d94848;
}

.price-down {
  color: #22936d;
}

.price-flat {
  color: var(--el-text-color-regular);
}

@media (width <= 1100px) {
  .statistics-workbench {
    grid-template-columns: minmax(160px, 0.7fr) minmax(260px, 1.3fr);
  }

  .statistics-context-grid {
    grid-column: span 2;
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 0;
  }
}

@media (width <= 720px) {
  .statistics-workbench {
    grid-template-columns: 1fr;
  }

  .statistics-primary,
  .statistics-distribution,
  .statistics-context-grid {
    grid-column: auto;
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 0;
  }

  .statistics-primary {
    border-top: 0;
  }

  .statistics-context-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0;
  }

  .context-metric {
    min-height: 68px;
    padding: 10px 12px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}
</style>
