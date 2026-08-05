<template>
  <div class="fundamental-chart">
    <Echart v-if="sortedData.length > 0" :height="320" :options="chartOptions" />
    <el-empty v-else description="暂无股东人数数据" />
  </div>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { StockShareholderCountVO } from '@/api/finance/stock'
import { Echart } from '@/components/Echart'

defineOptions({ name: 'ShareholderCountChart' })

const props = defineProps<{
  data: StockShareholderCountVO[]
}>()

const sortedData = computed(() =>
  [...props.data].sort((left, right) => {
    if (!left.statisticsDate) return right.statisticsDate ? 1 : 0
    if (!right.statisticsDate) return -1
    return left.statisticsDate.localeCompare(right.statisticsDate)
  })
)

const formatIntegerValue = (value: unknown) => {
  if (value === null || value === undefined || value === '-') return '--'
  const numberValue = Number(value)
  return Number.isFinite(numberValue)
    ? `${Math.round(numberValue).toLocaleString('zh-CN')} 户`
    : '--'
}

const chartOptions = computed<EChartsOption>(() => ({
  animation: false,
  aria: {
    enabled: true,
    decal: { show: true }
  },
  color: ['#2563eb'],
  grid: {
    left: 18,
    right: 24,
    top: 42,
    bottom: 42,
    containLabel: true
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'cross' },
    formatter: (params) => {
      const items = Array.isArray(params) ? params : [params]
      const dataIndex = items[0]?.dataIndex
      const row = dataIndex === undefined ? undefined : sortedData.value[dataIndex]
      if (!row) return ''
      const count = formatIntegerValue(row.shareholderCount)
      const change =
        row.changePercent === null
          ? '--'
          : `${row.changePercent > 0 ? '+' : ''}${row.changePercent.toFixed(2)}%`
      return `${row.statisticsDate || '--'}<br/>股东人数：${count}<br/>较上期变化：${change}`
    }
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: sortedData.value.map((item) => item.statisticsDate || '--'),
    axisLabel: { hideOverlap: true }
  },
  yAxis: {
    type: 'value',
    name: '户数',
    scale: true,
    axisLabel: {
      formatter: (value: number) => Math.round(value).toLocaleString('zh-CN')
    },
    splitLine: { lineStyle: { type: 'dashed' } }
  },
  series: [
    {
      name: '股东人数',
      type: 'line',
      smooth: false,
      connectNulls: false,
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.08 },
      data: sortedData.value.map((item) => item.shareholderCount)
    }
  ]
}))
</script>

<style scoped>
.fundamental-chart {
  min-height: 260px;
  margin-bottom: 12px;
}
</style>
