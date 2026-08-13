<template>
  <section class="capability-panel">
    <header class="panel-heading">
      <div>
        <h2>长期决策能力</h2>
        <p>只读取已保存的综合复盘快照，五维分数、超额收益与数据覆盖率保留当期口径。</p>
      </div>
      <el-button circle :loading="loading" title="刷新能力趋势" @click="loadData">
        <Icon icon="ep:refresh" />
      </el-button>
    </header>

    <div v-loading="loading" class="panel-body">
      <el-empty v-if="!trend.points.length" description="至少完成一次综合复盘后生成能力趋势" />
      <template v-else>
        <div class="summary-strip">
          <div>
            <span>历史节点</span>
            <strong>{{ trend.points.length }}</strong>
          </div>
          <div>
            <span>最新五维均分</span>
            <strong>{{ formatScore(latest?.averageScore) }}</strong>
          </div>
          <div>
            <span>最新超额收益</span>
            <strong :class="changeClass(latest?.excessReturn)">
              {{ formatPercent(latest?.excessReturn) }}
            </strong>
          </div>
          <div>
            <span>数据覆盖率</span>
            <strong>{{ formatRatio(latest?.coverageRate) }}</strong>
          </div>
          <div>
            <span>数据质量</span>
            <strong>{{ latest?.dataQualityScore ?? '--' }}</strong>
          </div>
        </div>

        <div v-if="latest?.lowSample" class="sample-warning">
          <Icon icon="ep:warning" />
          当前存在低样本维度，分数用于发现变化方向，不作为稳定能力结论。
        </div>

        <div class="trend-chart">
          <Echart :height="340" :options="chartOptions" @chart-click="handleChartClick" />
        </div>

        <div class="pattern-grid">
          <section class="pattern-section pattern-section--risk">
            <div class="section-title">
              <div>
                <strong>重复错误</strong>
                <span>至少在两个历史节点重复出现</span>
              </div>
              <el-tag type="danger" effect="plain">系统聚合</el-tag>
            </div>
            <button
              v-for="item in trend.repeatedErrors"
              :key="item.text"
              type="button"
              class="pattern-row"
              @click="openPattern(item)"
            >
              <span>{{ item.text }}</span>
              <strong>{{ item.occurrenceCount }} 次</strong>
              <small>{{ formatPatternRange(item) }}</small>
              <Icon icon="ep:right" />
            </button>
            <el-empty
              v-if="!trend.repeatedErrors.length"
              :image-size="52"
              description="暂未形成重复错误模式"
            />
          </section>

          <section class="pattern-section pattern-section--positive">
            <div class="section-title">
              <div>
                <strong>稳定正向行为</strong>
                <span>跨周期重复出现的有效动作</span>
              </div>
              <el-tag type="success" effect="plain">系统聚合</el-tag>
            </div>
            <button
              v-for="item in trend.positiveBehaviors"
              :key="item.text"
              type="button"
              class="pattern-row"
              @click="openPattern(item)"
            >
              <span>{{ item.text }}</span>
              <strong>{{ item.occurrenceCount }} 次</strong>
              <small>{{ formatPatternRange(item) }}</small>
              <Icon icon="ep:right" />
            </button>
            <el-empty
              v-if="!trend.positiveBehaviors.length"
              :image-size="52"
              description="暂未形成稳定正向模式"
            />
          </section>
        </div>

        <div class="history-table">
          <div class="section-title">
            <div>
              <strong>历史节点</strong>
              <span>点击日期恢复当时的系统分析和 AI 报告</span>
            </div>
          </div>
          <el-table :data="[...trend.points].reverse()" stripe table-layout="fixed">
            <el-table-column prop="endDate" label="复盘日期" width="116" sortable>
              <template #default="{ row }">
                <el-button link type="primary" @click="emit('open-history', row.conversationId)">
                  {{ row.endDate }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column
              prop="averageScore"
              label="五维均分"
              width="108"
              align="right"
              sortable
            >
              <template #default="{ row }">{{ formatScore(row.averageScore) }}</template>
            </el-table-column>
            <el-table-column
              v-for="dimension in dimensions"
              :key="dimension.key"
              :label="dimension.label"
              min-width="92"
              align="right"
            >
              <template #default="{ row }">
                <span
                  :class="{ 'low-sample-score': row.scoreStatuses[dimension.key] === 'LOW_SAMPLE' }"
                >
                  {{ formatScore(row.scores[dimension.key]) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column
              prop="excessReturn"
              label="超额收益"
              width="110"
              align="right"
              sortable
            >
              <template #default="{ row }">
                <span :class="changeClass(row.excessReturn)">{{
                  formatPercent(row.excessReturn)
                }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="coverageRate" label="覆盖率" width="100" align="right" sortable>
              <template #default="{ row }">{{ formatRatio(row.coverageRate) }}</template>
            </el-table-column>
            <el-table-column prop="episodeCount" label="回合数" width="90" align="right" sortable />
          </el-table>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { ECElementEvent } from 'echarts/core'
import { Echart } from '@/components/Echart'
import {
  StockAiAnalysisApi,
  type StockAiBehaviorPatternVO,
  type StockAiCapabilityDimension,
  type StockAiCapabilityTrendVO
} from '@/api/finance/stock/ai-analysis'

defineOptions({ name: 'StockAiCapabilityTrend' })

const emit = defineEmits<{
  'open-history': [conversationId: number]
}>()

const emptyTrend = (): StockAiCapabilityTrendVO => ({
  points: [],
  repeatedErrors: [],
  positiveBehaviors: []
})
const dimensions: Array<{ key: StockAiCapabilityDimension; label: string; color: string }> = [
  { key: 'STOCK_SELECTION', label: '选股', color: '#287f71' },
  { key: 'ENTRY', label: '入场', color: '#2563eb' },
  { key: 'EXIT', label: '退出', color: '#b45309' },
  { key: 'POSITION', label: '仓位', color: '#7c3aed' },
  { key: 'DISCIPLINE', label: '纪律', color: '#be123c' }
]

const loading = ref(false)
const trend = ref<StockAiCapabilityTrendVO>(emptyTrend())
const latest = computed(() => trend.value.points.at(-1))

const chartOptions = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: dimensions.map((item) => item.label), top: 4 },
  grid: { left: 40, right: 26, top: 48, bottom: 42, containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: trend.value.points.map((item) => item.endDate.slice(5)),
    axisLabel: { hideOverlap: true }
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 100,
    splitNumber: 5,
    axisLabel: { formatter: '{value}' },
    splitLine: { lineStyle: { color: '#e5e7eb' } }
  },
  series: dimensions.map((dimension) => ({
    id: dimension.key,
    name: dimension.label,
    type: 'line',
    connectNulls: false,
    smooth: false,
    symbolSize: 8,
    lineStyle: { width: 2, color: dimension.color },
    itemStyle: { color: dimension.color },
    data: trend.value.points.map((item) => item.scores[dimension.key] ?? null)
  }))
}))

const loadData = async () => {
  loading.value = true
  try {
    trend.value = (await StockAiAnalysisApi.getCapabilityTrend()) || emptyTrend()
  } finally {
    loading.value = false
  }
}

const handleChartClick = (event: ECElementEvent) => {
  if (typeof event.dataIndex !== 'number') return
  const point = trend.value.points[event.dataIndex]
  if (point) emit('open-history', point.conversationId)
}

const openPattern = (item: StockAiBehaviorPatternVO) => {
  const conversationId = item.conversationIds.at(-1)
  if (conversationId) emit('open-history', conversationId)
}

const formatScore = (value: number | null | undefined) =>
  value === null || value === undefined ? '--' : Number(value).toFixed(1)
const formatPercent = (value: number | null | undefined) =>
  value === null || value === undefined ? '--' : `${Number(value).toFixed(2)}%`
const formatRatio = (value: number | null | undefined) =>
  value === null || value === undefined ? '--' : `${(Number(value) * 100).toFixed(1)}%`
const changeClass = (value: number | null | undefined) => ({
  'is-positive': value !== null && value !== undefined && value > 0,
  'is-negative': value !== null && value !== undefined && value < 0
})
const formatPatternRange = (item: StockAiBehaviorPatternVO) =>
  item.firstDate && item.lastDate ? `${item.firstDate} 至 ${item.lastDate}` : '历史综合复盘'

onMounted(loadData)

defineExpose({ reload: loadData })
</script>

<style scoped lang="scss">
.capability-panel {
  margin-top: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.panel-heading,
.section-title,
.pattern-row,
.sample-warning {
  display: flex;
  align-items: center;
}

.panel-heading {
  justify-content: space-between;
  min-height: 72px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.panel-heading h2,
.section-title strong {
  margin: 0;
  font-size: 15px;
  letter-spacing: 0;
}

.panel-heading p,
.section-title span {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.panel-body {
  min-height: 240px;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.summary-strip > div {
  display: flex;
  flex-direction: column;
  min-height: 72px;
  padding: 12px 16px;
  border-left: 1px solid var(--el-border-color-lighter);
}

.summary-strip > div:first-child {
  border-left: 0;
}

.summary-strip span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-strip strong {
  margin-top: 5px;
  font-size: 20px;
}

.sample-warning {
  gap: 7px;
  min-height: 38px;
  padding: 0 16px;
  font-size: 12px;
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-9);
}

.trend-chart {
  padding: 12px 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.pattern-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.pattern-section {
  min-width: 0;
  padding: 14px 16px;
}

.pattern-section + .pattern-section {
  border-left: 1px solid var(--el-border-color-lighter);
}

.section-title {
  justify-content: space-between;
  gap: 12px;
  min-height: 38px;
  margin-bottom: 8px;
}

.section-title > div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pattern-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto 16px;
  gap: 10px;
  width: 100%;
  min-height: 42px;
  padding: 7px 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.pattern-row:first-of-type {
  border-top: 0;
}

.pattern-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pattern-row small {
  color: var(--el-text-color-secondary);
}

.pattern-section--risk .pattern-row strong {
  color: var(--el-color-danger);
}

.pattern-section--positive .pattern-row strong {
  color: var(--el-color-success);
}

.history-table {
  padding: 14px 16px 16px;
}

.low-sample-score {
  color: var(--el-color-warning-dark-2);
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}

.is-positive {
  color: var(--el-color-danger);
}

.is-negative {
  color: var(--el-color-success);
}

@media (width <= 900px) {
  .summary-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-strip > div:nth-child(odd) {
    border-left: 0;
  }

  .summary-strip > div {
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .pattern-grid {
    grid-template-columns: 1fr;
  }

  .pattern-section + .pattern-section {
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 0;
  }

  .pattern-row {
    grid-template-columns: minmax(0, 1fr) auto 16px;
  }

  .pattern-row small {
    display: none;
  }
}
</style>
