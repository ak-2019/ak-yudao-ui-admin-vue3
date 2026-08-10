<template>
  <ContentWrap class="account-snapshot-panel">
    <div class="panel-heading">
      <div>
        <div class="panel-heading__title">账户净值与回撤</div>
        <div class="panel-heading__meta">来自每日资产快照，不使用当前持仓伪造历史数据</div>
      </div>
      <div class="panel-heading__actions">
        <el-button-group>
          <el-button
            v-for="range in ranges"
            :key="range.key"
            size="small"
            :type="activeRange === range.key ? 'primary' : 'default'"
            @click="loadRange(range.key)"
          >
            {{ range.label }}
          </el-button>
        </el-button-group>
        <el-button size="small" :loading="loading" @click="loadRange(activeRange)">
          <Icon icon="ep:refresh" />
        </el-button>
      </div>
    </div>

    <div class="snapshot-metrics">
      <div class="snapshot-metric">
        <span>最新总资产</span>
        <strong>{{ formatAmount(latest?.totalAsset) }}</strong>
      </div>
      <div class="snapshot-metric">
        <span>累计净值收益</span>
        <strong :class="changeClass(latest?.cumulativeReturnRate)">
          {{ formatPercent(latest?.cumulativeReturnRate) }}
        </strong>
      </div>
      <div class="snapshot-metric">
        <span>最大回撤</span>
        <strong :class="changeClass(latest?.maxDrawdownRate)">
          {{ formatPercent(latest?.maxDrawdownRate) }}
        </strong>
      </div>
      <div class="snapshot-metric">
        <span>快照数量</span>
        <strong>{{ snapshots.length }}</strong>
      </div>
    </div>

    <div v-loading="loading" class="snapshot-chart">
      <Echart v-if="snapshots.length > 0" :height="300" :options="chartOptions" />
      <el-empty v-else description="暂无资产快照，请在账户工作台保存今日快照" />
    </div>

    <el-table v-if="snapshots.length > 0" :data="recentSnapshots" stripe size="small" max-height="280">
      <el-table-column prop="snapshotDate" label="日期" width="120" />
      <el-table-column prop="totalAsset" label="总资产" min-width="130" align="right">
        <template #default="{ row }">{{ formatAmount(row.totalAsset) }}</template>
      </el-table-column>
      <el-table-column prop="dailyProfitRate" label="当日收益" min-width="110" align="right">
        <template #default="{ row }">
          <span :class="changeClass(row.dailyProfitRate)">{{ formatPercent(row.dailyProfitRate) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="cumulativeReturnRate" label="累计收益" min-width="110" align="right">
        <template #default="{ row }">
          <span :class="changeClass(row.cumulativeReturnRate)">{{ formatPercent(row.cumulativeReturnRate) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="maxDrawdownRate" label="最大回撤" min-width="110" align="right">
        <template #default="{ row }">
          <span :class="changeClass(row.maxDrawdownRate)">{{ formatPercent(row.maxDrawdownRate) }}</span>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type { EChartsOption } from 'echarts'
import { Echart } from '@/components/Echart'
import {
  StockPositionApi,
  type StockPositionAssetSnapshotVO
} from '@/api/finance/stock/position'

type RangeKey = '7d' | '30d' | 'all'

const ranges: Array<{ key: RangeKey; label: string }> = [
  { key: '7d', label: '近 7 日' },
  { key: '30d', label: '近 30 日' },
  { key: 'all', label: '全部' }
]

const snapshots = ref<StockPositionAssetSnapshotVO[]>([])
const loading = ref(false)
const activeRange = ref<RangeKey>('30d')

const latest = computed(() => snapshots.value.at(-1) ?? null)
const recentSnapshots = computed(() => snapshots.value.slice(-10).reverse())

const chartOptions = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['总资产', '累计净值收益', '最大回撤'] },
  grid: { left: 56, right: 56, top: 32, bottom: 32 },
  xAxis: {
    type: 'category',
    data: snapshots.value.map((item) => formatAxisDate(item.snapshotDate))
  },
  yAxis: [
    { type: 'value', name: '资产', scale: true },
    { type: 'value', name: '收益率', axisLabel: { formatter: '{value}%' } }
  ],
  series: [
    {
      name: '总资产',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: snapshots.value.map((item) => item.totalAsset),
      yAxisIndex: 0
    },
    {
      name: '累计净值收益',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: snapshots.value.map((item) => item.cumulativeReturnRate),
      yAxisIndex: 1
    },
    {
      name: '最大回撤',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: snapshots.value.map((item) => item.maxDrawdownRate),
      yAxisIndex: 1
    }
  ]
}))

const formatAxisDate = (value: string) => dayjs(value).format('MM-DD')
const formatAmount = (value: number | null | undefined) =>
  value === null || value === undefined
    ? '--'
    : new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value)
const formatPercent = (value: number | null | undefined) =>
  value === null || value === undefined ? '--' : `${value.toFixed(2)}%`
const changeClass = (value: number | null | undefined) => ({
  'is-positive': value !== null && value !== undefined && value > 0,
  'is-negative': value !== null && value !== undefined && value < 0
})

const loadRange = async (range: RangeKey) => {
  activeRange.value = range
  loading.value = true
  try {
    const endDate = dayjs().format('YYYY-MM-DD')
    const beginDate = range === 'all' ? undefined : dayjs().subtract(range === '7d' ? 6 : 29, 'day').format('YYYY-MM-DD')
    snapshots.value = await StockPositionApi.getAssetSnapshotTrend({ beginDate, endDate })
  } finally {
    loading.value = false
  }
}

onMounted(() => loadRange(activeRange.value))
</script>

<style scoped lang="scss">
.account-snapshot-panel {
  margin-top: 16px;
}

.panel-heading,
.panel-heading__actions,
.snapshot-metrics {
  display: flex;
  align-items: center;
}

.panel-heading {
  justify-content: space-between;
  gap: 16px;
}

.panel-heading__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.panel-heading__meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.panel-heading__actions {
  gap: 8px;
}

.snapshot-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.snapshot-metric {
  min-width: 0;
  padding: 12px 14px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.snapshot-metric span {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.snapshot-metric strong {
  display: block;
  margin-top: 6px;
  font-size: 18px;
  color: var(--el-text-color-primary);
}

.snapshot-chart {
  min-height: 300px;
  margin: 12px 0;
}

.is-positive {
  color: var(--el-color-danger);
}

.is-negative {
  color: var(--el-color-success);
}

@media (width <= 720px) {
  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .snapshot-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
