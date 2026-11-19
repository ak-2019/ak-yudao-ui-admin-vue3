<template>
  <div class="technical-chart">
    <div class="technical-chart__toolbar">
      <el-segmented v-model="timeframe" :options="timeframeOptions" />
      <div class="technical-chart__ma-selector">
        <span class="technical-chart__control-label">均线</span>
        <el-checkbox-group v-model="selectedMaPeriods" size="small">
          <el-checkbox v-for="period in maPeriods" :key="period" :value="period">
            <span class="technical-chart__ma-option">
              <i :style="{ backgroundColor: maColors[period] }"></i>
              MA{{ period }}
            </span>
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>
    <Echart :height="820" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type { EChartsOption } from 'echarts'
import { macd, stochastic } from 'technicalindicators'
import type { StockDailyPriceVO } from '@/api/finance/stock'
import { Echart } from '@/components/Echart'

defineOptions({ name: 'StockTechnicalAnalysisChart' })

const props = defineProps<{
  data: StockDailyPriceVO[]
}>()

type Timeframe = 'DAY' | 'WEEK' | 'MONTH'
type MaPeriod = 5 | 10 | 15 | 20 | 30 | 60 | 250

interface ChartBar {
  tradeDate: string
  openPrice: number
  closePrice: number
  highPrice: number
  lowPrice: number
  volume: number | null
}

interface IndicatorData {
  dif: Array<number | null>
  dea: Array<number | null>
  histogram: Array<number | null>
  k: Array<number | null>
  d: Array<number | null>
  j: Array<number | null>
}

interface IndicatorSignal {
  tradeDate: string
  value: number
  type: 'GOLDEN' | 'DEATH'
}

interface SignalTooltipParams {
  seriesName?: string
  name?: string
  value?: unknown
}

const timeframe = ref<Timeframe>('DAY')
const timeframeOptions = [
  { label: '日线', value: 'DAY' },
  { label: '周线', value: 'WEEK' },
  { label: '月线', value: 'MONTH' }
]
const maPeriods: MaPeriod[] = [5, 10, 15, 20, 30, 60, 250]
const selectedMaPeriods = ref<MaPeriod[]>([5, 10, 20, 60])
const maColors: Record<MaPeriod, string> = {
  5: '#d97706',
  10: '#2563eb',
  15: '#7c3aed',
  20: '#0891b2',
  30: '#b45309',
  60: '#64748b',
  250: '#111827'
}

const sortedDailyData = computed<ChartBar[]>(() =>
  [...props.data]
    .sort((left, right) => left.tradeDate.localeCompare(right.tradeDate))
    .map((item) => ({
      tradeDate: item.tradeDate,
      openPrice: item.openPrice,
      closePrice: item.closePrice,
      highPrice: item.highPrice,
      lowPrice: item.lowPrice,
      volume: item.volume ?? null
    }))
)

const getPeriodKey = (tradeDate: string, period: Timeframe) => {
  if (period === 'DAY') return tradeDate
  const date = dayjs(tradeDate)
  if (period === 'MONTH') return date.format('YYYY-MM')
  const daysFromMonday = (date.day() + 6) % 7
  return date.subtract(daysFromMonday, 'day').format('YYYY-MM-DD')
}

const aggregateBars = (dailyBars: ChartBar[], period: Timeframe): ChartBar[] => {
  if (period === 'DAY') return dailyBars
  const groups = new Map<string, ChartBar[]>()
  dailyBars.forEach((bar) => {
    const key = getPeriodKey(bar.tradeDate, period)
    const group = groups.get(key)
    if (group) group.push(bar)
    else groups.set(key, [bar])
  })
  return Array.from(groups.values()).map((group) => {
    const first = group[0]
    const last = group[group.length - 1]
    const volumes = group.flatMap((item) => (item.volume === null ? [] : [item.volume]))
    return {
      tradeDate: last.tradeDate,
      openPrice: first.openPrice,
      closePrice: last.closePrice,
      highPrice: Math.max(...group.map((item) => item.highPrice)),
      lowPrice: Math.min(...group.map((item) => item.lowPrice)),
      volume: volumes.length > 0 ? volumes.reduce((sum, value) => sum + value, 0) : null
    }
  })
}

const chartData = computed(() => aggregateBars(sortedDailyData.value, timeframe.value))

const alignValues = <T,>(totalLength: number, values: T[]): Array<T | null> => [
  ...Array<T | null>(Math.max(0, totalLength - values.length)).fill(null),
  ...values
]

const calculateSma = (values: number[], period: number): Array<number | null> => {
  let rollingTotal = 0
  return values.map((value, index) => {
    rollingTotal += value
    if (index >= period) rollingTotal -= values[index - period]
    return index + 1 < period ? null : Number((rollingTotal / period).toFixed(4))
  })
}

const indicators = computed<IndicatorData>(() => {
  const prices = chartData.value
  const closes = prices.map((item) => item.closePrice)
  const macdValues = alignValues(
    prices.length,
    macd({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    })
  )
  const stochasticValues = alignValues(
    prices.length,
    stochastic({
      high: prices.map((item) => item.highPrice),
      low: prices.map((item) => item.lowPrice),
      close: closes,
      period: 9,
      signalPeriod: 3
    })
  )

  return {
    dif: macdValues.map((item) => item?.MACD ?? null),
    dea: macdValues.map((item) => item?.signal ?? null),
    histogram: macdValues.map((item) => item?.histogram ?? null),
    k: stochasticValues.map((item) => item?.k ?? null),
    d: stochasticValues.map((item) => item?.d ?? null),
    j: stochasticValues.map((item) =>
      item === null ? null : Number((3 * item.k - 2 * item.d).toFixed(4))
    )
  }
})

const detectCrossSignals = (
  dates: string[],
  primaryValues: Array<number | null>,
  secondaryValues: Array<number | null>
): IndicatorSignal[] => {
  const signals: IndicatorSignal[] = []
  for (let index = 1; index < dates.length; index += 1) {
    const previousPrimary = primaryValues[index - 1]
    const previousSecondary = secondaryValues[index - 1]
    const currentPrimary = primaryValues[index]
    const currentSecondary = secondaryValues[index]
    if (
      previousPrimary === null ||
      previousSecondary === null ||
      currentPrimary === null ||
      currentSecondary === null
    ) {
      continue
    }
    if (previousPrimary <= previousSecondary && currentPrimary > currentSecondary) {
      signals.push({ tradeDate: dates[index], value: currentPrimary, type: 'GOLDEN' })
    } else if (previousPrimary >= previousSecondary && currentPrimary < currentSecondary) {
      signals.push({ tradeDate: dates[index], value: currentPrimary, type: 'DEATH' })
    }
  }
  return signals
}

const indicatorSignals = computed(() => {
  const dates = chartData.value.map((item) => item.tradeDate)
  return {
    macd: detectCrossSignals(dates, indicators.value.dif, indicators.value.dea),
    kdj: detectCrossSignals(dates, indicators.value.k, indicators.value.d)
  }
})

const formatIndicatorValue = (value: unknown) => {
  if (value === null || value === undefined || value === '-') return '--'
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue.toFixed(2) : '--'
}

const formatVolumeValue = (value: unknown) => {
  if (value === null || value === undefined || value === '-') return '--'
  const numberValue = Number(value)
  return Number.isFinite(numberValue)
    ? numberValue.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
    : '--'
}

const formatVolumeAxis = (value: number) => {
  const absolute = Math.abs(value)
  if (absolute >= 100000000) return `${(value / 100000000).toFixed(1)}亿`
  if (absolute >= 10000) return `${(value / 10000).toFixed(1)}万`
  return value.toFixed(0)
}

const formatSignalTooltip = (params: unknown) => {
  if (params === null || typeof params !== 'object') return ''
  const item = params as SignalTooltipParams
  const signalValue = Array.isArray(item.value) ? item.value[1] : item.value
  return `${item.seriesName || '指标信号'}<br/>日期：${item.name || '--'}<br/>指标值：${formatIndicatorValue(signalValue)}`
}

const chartOptions = computed<EChartsOption>(() => {
  const prices = chartData.value
  const dates = prices.map((item) => item.tradeDate)
  const closes = prices.map((item) => item.closePrice)
  const dataZoomStart = prices.length > 80 ? 70 : 0
  const indicatorValues = indicators.value
  const signalValues = indicatorSignals.value
  const maNames = selectedMaPeriods.value.map((period) => `MA${period}`)
  const maSeries = selectedMaPeriods.value.map((period) => ({
    name: `MA${period}`,
    type: 'line' as const,
    xAxisIndex: 0,
    yAxisIndex: 0,
    symbol: 'none',
    smooth: false,
    connectNulls: false,
    data: calculateSma(closes, period),
    lineStyle: { width: 1.4, color: maColors[period] },
    itemStyle: { color: maColors[period] },
    tooltip: { valueFormatter: formatIndicatorValue }
  }))
  const buildSignalSeries = (
    name: string,
    signals: IndicatorSignal[],
    signalType: IndicatorSignal['type'],
    axisIndex: number
  ) => ({
    name,
    type: 'scatter' as const,
    xAxisIndex: axisIndex,
    yAxisIndex: axisIndex,
    symbol: 'triangle',
    symbolRotate: signalType === 'GOLDEN' ? 0 : 180,
    symbolSize: 15,
    symbolOffset: [0, signalType === 'GOLDEN' ? -8 : 8],
    data: signals
      .filter((signal) => signal.type === signalType)
      .map((signal) => ({
        name: signal.tradeDate,
        value: [signal.tradeDate, signal.value]
      })),
    itemStyle: { color: signalType === 'GOLDEN' ? '#cf2e2e' : '#16845b' },
    label: {
      show: true,
      formatter: signalType === 'GOLDEN' ? '金' : '死',
      position: signalType === 'GOLDEN' ? ('top' as const) : ('bottom' as const),
      color: signalType === 'GOLDEN' ? '#cf2e2e' : '#16845b',
      fontSize: 10,
      fontWeight: 600
    },
    tooltip: { trigger: 'item' as const, formatter: formatSignalTooltip },
    z: 8
  })

  return {
    animation: false,
    aria: {
      enabled: true,
      decal: { show: true }
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }]
    },
    legend: [
      { data: maNames, top: 2, left: 18, show: maNames.length > 0 },
      { data: ['DIF', 'DEA', 'MACD'], top: '59%', left: 18 },
      { data: ['K', 'D', 'J'], top: '76%', left: 18 }
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    grid: [
      { left: 18, right: 28, top: 40, height: '36%', containLabel: true },
      { left: 18, right: 28, top: '45%', height: '10%', containLabel: true },
      { left: 18, right: 28, top: '63%', height: '10%', containLabel: true },
      { left: 18, right: 28, top: '80%', height: '9%', containLabel: true }
    ],
    xAxis: [0, 1, 2, 3].map((gridIndex) => ({
      type: 'category' as const,
      gridIndex,
      data: dates,
      boundaryGap: true,
      axisLine: { onZero: false },
      axisLabel: { show: gridIndex === 3, hideOverlap: true },
      min: 'dataMin',
      max: 'dataMax'
    })),
    yAxis: [
      {
        scale: true,
        gridIndex: 0,
        splitArea: { show: true },
        axisLabel: { formatter: (value: number) => value.toFixed(2) }
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { formatter: formatVolumeAxis }
      },
      {
        scale: true,
        gridIndex: 2,
        splitNumber: 2,
        axisLabel: { formatter: (value: number) => value.toFixed(2) }
      },
      {
        scale: true,
        gridIndex: 3,
        splitNumber: 2,
        axisLabel: { formatter: (value: number) => value.toFixed(0) }
      }
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1, 2, 3], start: dataZoomStart, end: 100 },
      {
        type: 'slider',
        xAxisIndex: [0, 1, 2, 3],
        start: dataZoomStart,
        end: 100,
        bottom: 8,
        height: 18
      }
    ],
    series: [
      {
        name: timeframe.value === 'DAY' ? '日 K' : timeframe.value === 'WEEK' ? '周 K' : '月 K',
        type: 'candlestick',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: prices.map((item) => [
          item.openPrice,
          item.closePrice,
          item.lowPrice,
          item.highPrice
        ]),
        itemStyle: {
          color: '#cf2e2e',
          color0: '#16845b',
          borderColor: '#cf2e2e',
          borderColor0: '#16845b'
        }
      },
      ...maSeries,
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        barMaxWidth: 12,
        data: prices.map((item) =>
          item.volume === null
            ? null
            : {
                value: item.volume,
                itemStyle: { color: item.closePrice >= item.openPrice ? '#cf2e2e' : '#16845b' }
              }
        ),
        tooltip: { valueFormatter: formatVolumeValue }
      },
      {
        name: 'MACD',
        type: 'bar',
        xAxisIndex: 2,
        yAxisIndex: 2,
        barMaxWidth: 8,
        data: indicatorValues.histogram.map((value) =>
          value === null
            ? null
            : {
                value,
                itemStyle: { color: value >= 0 ? '#cf2e2e' : '#16845b' }
              }
        ),
        tooltip: { valueFormatter: formatIndicatorValue }
      },
      {
        name: 'DIF',
        type: 'line',
        xAxisIndex: 2,
        yAxisIndex: 2,
        symbol: 'none',
        connectNulls: false,
        data: indicatorValues.dif,
        tooltip: { valueFormatter: formatIndicatorValue }
      },
      {
        name: 'DEA',
        type: 'line',
        xAxisIndex: 2,
        yAxisIndex: 2,
        symbol: 'none',
        connectNulls: false,
        data: indicatorValues.dea,
        tooltip: { valueFormatter: formatIndicatorValue }
      },
      buildSignalSeries('MACD 金叉', signalValues.macd, 'GOLDEN', 2),
      buildSignalSeries('MACD 死叉', signalValues.macd, 'DEATH', 2),
      {
        name: 'K',
        type: 'line',
        xAxisIndex: 3,
        yAxisIndex: 3,
        symbol: 'none',
        connectNulls: false,
        data: indicatorValues.k,
        tooltip: { valueFormatter: formatIndicatorValue }
      },
      {
        name: 'D',
        type: 'line',
        xAxisIndex: 3,
        yAxisIndex: 3,
        symbol: 'none',
        connectNulls: false,
        data: indicatorValues.d,
        tooltip: { valueFormatter: formatIndicatorValue }
      },
      {
        name: 'J',
        type: 'line',
        xAxisIndex: 3,
        yAxisIndex: 3,
        symbol: 'none',
        connectNulls: false,
        data: indicatorValues.j,
        tooltip: { valueFormatter: formatIndicatorValue }
      },
      buildSignalSeries('KDJ 金叉', signalValues.kdj, 'GOLDEN', 3),
      buildSignalSeries('KDJ 死叉', signalValues.kdj, 'DEATH', 3)
    ]
  }
})
</script>

<style scoped>
.technical-chart__toolbar {
  display: flex;
  min-height: 40px;
  margin-bottom: 8px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.technical-chart__ma-selector,
.technical-chart__ma-option {
  display: flex;
  align-items: center;
}

.technical-chart__ma-selector {
  min-width: 0;
  flex-wrap: wrap;
  gap: 10px;
}

.technical-chart__control-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.technical-chart__ma-option {
  gap: 5px;
  font-variant-numeric: tabular-nums;
}

.technical-chart__ma-option i {
  display: inline-block;
  width: 12px;
  height: 3px;
}

@media (width <= 720px) {
  .technical-chart__toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .technical-chart__ma-selector {
    align-items: flex-start;
    flex-direction: column;
  }

  .technical-chart__ma-selector :deep(.el-checkbox-group) {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    width: 100%;
    gap: 4px 8px;
  }

  .technical-chart__ma-selector :deep(.el-checkbox) {
    margin-right: 0;
  }
}

@media (width <= 480px) {
  .technical-chart__ma-selector :deep(.el-checkbox-group) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
