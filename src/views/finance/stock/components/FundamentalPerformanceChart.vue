<template>
  <div class="fundamental-chart">
    <Echart v-if="sortedData.length > 0" :height="380" :options="chartOptions" />
    <el-empty v-else description="暂无业绩数据" />
  </div>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { StockPerformanceVO } from '@/api/finance/stock'
import { Echart } from '@/components/Echart'

defineOptions({ name: 'FundamentalPerformanceChart' })

const props = defineProps<{
  data: StockPerformanceVO[]
}>()

const sortedData = computed(() =>
  [...props.data].sort((left, right) => {
    if (!left.reportPeriod) return right.reportPeriod ? 1 : 0
    if (!right.reportPeriod) return -1
    return left.reportPeriod.localeCompare(right.reportPeriod)
  })
)

const formatCompactAmount = (value: number) => {
  const absolute = Math.abs(value)
  if (absolute >= 100000000) return `${(value / 100000000).toFixed(1)} 亿`
  if (absolute >= 10000) return `${(value / 10000).toFixed(1)} 万`
  return value.toFixed(0)
}

const formatAmount = (value: unknown) => {
  if (value === null || value === undefined || value === '-') return '--'
  const numberValue = Number(value)
  return Number.isFinite(numberValue)
    ? `${numberValue.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 元`
    : '--'
}

const formatPercentValue = (value: unknown) => {
  if (value === null || value === undefined || value === '-') return '--'
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? `${numberValue.toFixed(2)}%` : '--'
}

const chartOptions = computed<EChartsOption>(() => ({
  animation: false,
  aria: {
    enabled: true,
    decal: { show: true }
  },
  color: ['#2563eb', '#16845b', '#d97706', '#7c3aed', '#cf2e2e', '#64748b'],
  grid: {
    left: 18,
    right: 22,
    top: 72,
    bottom: 48,
    containLabel: true
  },
  legend: {
    type: 'scroll',
    top: 8,
    data: ['营业收入', '归母净利润', '营收同比', '营收环比', '净利润同比', '净利润环比']
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'cross' }
  },
  xAxis: {
    type: 'category',
    data: sortedData.value.map((item) => item.reportPeriod || '--'),
    axisLabel: { hideOverlap: true }
  },
  yAxis: [
    {
      type: 'value',
      name: '金额',
      scale: true,
      axisLabel: { formatter: (value: number) => formatCompactAmount(value) },
      splitLine: { lineStyle: { type: 'dashed' } }
    },
    {
      type: 'value',
      name: '增长率',
      scale: true,
      axisLabel: { formatter: (value: number) => `${value.toFixed(0)}%` },
      splitLine: { show: false }
    }
  ],
  series: [
    {
      name: '营业收入',
      type: 'bar',
      yAxisIndex: 0,
      barMaxWidth: 34,
      data: sortedData.value.map((item) => item.revenue),
      tooltip: { valueFormatter: formatAmount }
    },
    {
      name: '归母净利润',
      type: 'bar',
      yAxisIndex: 0,
      barMaxWidth: 34,
      data: sortedData.value.map((item) => item.netProfit),
      tooltip: { valueFormatter: formatAmount }
    },
    {
      name: '营收同比',
      type: 'line',
      yAxisIndex: 1,
      symbol: 'circle',
      symbolSize: 6,
      connectNulls: false,
      data: sortedData.value.map((item) => item.revenueYearOnYear),
      tooltip: { valueFormatter: formatPercentValue }
    },
    {
      name: '营收环比',
      type: 'line',
      yAxisIndex: 1,
      symbol: 'diamond',
      symbolSize: 7,
      connectNulls: false,
      data: sortedData.value.map((item) => item.revenueQuarterOnQuarter),
      tooltip: { valueFormatter: formatPercentValue }
    },
    {
      name: '净利润同比',
      type: 'line',
      yAxisIndex: 1,
      symbol: 'triangle',
      symbolSize: 7,
      connectNulls: false,
      data: sortedData.value.map((item) => item.netProfitYearOnYear),
      tooltip: { valueFormatter: formatPercentValue }
    },
    {
      name: '净利润环比',
      type: 'line',
      yAxisIndex: 1,
      symbol: 'rect',
      symbolSize: 6,
      connectNulls: false,
      data: sortedData.value.map((item) => item.netProfitQuarterOnQuarter),
      tooltip: { valueFormatter: formatPercentValue }
    }
  ]
}))
</script>

<style scoped>
.fundamental-chart {
  min-height: 300px;
  margin-bottom: 12px;
}
</style>
