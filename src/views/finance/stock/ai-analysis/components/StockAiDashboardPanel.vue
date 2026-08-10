<template>
  <div v-if="dashboard" class="stock-ai-dashboard">
    <template v-if="mode === 'overview'">
      <section class="dashboard-section dashboard-section--summary">
        <div class="section-heading">
          <div>
            <h2>分析总览</h2>
            <span>确定性指标先于 AI 解释，历史资产快照缺失会明确标记</span>
          </div>
          <el-tag :type="qualityTagType" effect="plain">
            数据质量 {{ dashboard.dataQuality.score }}
          </el-tag>
        </div>
        <div class="summary-grid">
          <div class="summary-item">
            <span>持仓代理收益</span>
            <strong :class="changeClass(dashboard.performance.currentPositionProxyReturn)">
              {{ formatPercent(dashboard.performance.currentPositionProxyReturn) }}
            </strong>
            <small>当前持仓固定权重代理，不是账户净值</small>
          </div>
          <div class="summary-item">
            <span>{{ dashboard.performance.primaryBenchmarkName || '基准' }}同期</span>
            <strong :class="changeClass(dashboard.performance.primaryBenchmarkChange)">
              {{ formatPercent(dashboard.performance.primaryBenchmarkChange) }}
            </strong>
            <small>{{ dashboard.performance.primaryBenchmarkCode || '--' }}</small>
          </div>
          <div class="summary-item">
            <span>超额收益</span>
            <strong :class="changeClass(dashboard.performance.excessReturn)">
              {{ formatPercent(dashboard.performance.excessReturn) }}
            </strong>
            <small>持仓代理收益减基准收益</small>
          </div>
          <div class="summary-item">
            <span>仓位 / 集中度</span>
            <strong>{{ formatPercent(dashboard.account.positionRatio) }}</strong>
            <small>前三大 {{ formatPercent(dashboard.account.topThreeConcentration) }}</small>
          </div>
          <div class="summary-item">
            <span>已清仓胜率</span>
            <strong>{{ formatPercent(dashboard.trades.closedWinRate) }}</strong>
            <small>盈亏比 {{ formatNumber(dashboard.trades.profitFactor) }}</small>
          </div>
          <div class="summary-item">
            <span>历史净值收益</span>
            <strong :class="changeClass(dashboard.performance.accountNetValueReturn)">
              {{ formatPercent(dashboard.performance.accountNetValueReturn) }}
            </strong>
            <small v-if="dashboard.performance.accountHistoryCount">
              {{ dashboard.performance.accountHistoryCount }} 条账户快照
            </small>
            <small v-else>保存两条以上快照后可计算</small>
          </div>
          <div class="summary-item">
            <span>账户最大回撤</span>
            <strong :class="changeClass(dashboard.performance.accountMaxDrawdown)">
              {{ formatPercent(dashboard.performance.accountMaxDrawdown) }}
            </strong>
            <small>基于账户资产快照</small>
          </div>
          <div class="summary-item summary-item--risk">
            <span>风险信号</span>
            <strong>{{ dashboard.risks.length }}</strong>
            <small>{{ dashboard.dataQuality.eventCount }} 条资讯事件</small>
          </div>
        </div>
      </section>

      <section class="dashboard-section dashboard-chart-grid">
        <div class="chart-section">
          <div class="section-heading">
            <div>
              <h3>基准对比</h3>
              <span>按分析区间汇总</span>
            </div>
          </div>
          <Echart :height="300" :options="benchmarkOptions" />
        </div>
        <div class="chart-section">
          <div class="section-heading">
            <div>
              <h3>个股超额收益</h3>
              <span>优先显示影响最大的标的</span>
            </div>
          </div>
          <Echart :height="300" :options="stockOptions" />
        </div>
      </section>

      <section class="dashboard-section">
        <div class="section-heading">
          <div>
            <h3>主要风险</h3>
            <span>可在“AI 完整报告”工作区继续询问每条信号的解释</span>
          </div>
        </div>
        <el-table :data="dashboard.risks" stripe table-layout="fixed" empty-text="暂无规则风险信号">
          <el-table-column prop="level" label="等级" width="96">
            <template #default="{ row }">
              <el-tag :type="riskTagType(row.level)" size="small" effect="plain">
                {{ riskLevelLabel(row.level) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="信号" min-width="180" />
          <el-table-column prop="detail" label="事实依据" min-width="420" show-overflow-tooltip />
          <el-table-column prop="evidenceId" label="证据" width="190" show-overflow-tooltip />
        </el-table>
      </section>
    </template>

    <template v-else-if="mode === 'stocks'">
      <section class="dashboard-section">
        <div class="section-heading">
          <div>
            <h2>个股复盘</h2>
            <span>所有数值由后端确定性计算，支持列排序</span>
          </div>
        </div>
        <el-table :data="dashboard.stocks" stripe border table-layout="fixed" max-height="620">
          <el-table-column prop="name" label="股票" min-width="150" fixed sortable>
            <template #default="{ row }">
              <div class="stock-name">{{ row.name }}</div>
              <div class="stock-code">{{ row.market }}:{{ row.code }}</div>
            </template>
          </el-table-column>
          <el-table-column
            prop="industry"
            label="行业"
            min-width="110"
            sortable
            show-overflow-tooltip
          />
          <el-table-column prop="holding" label="状态" width="88" sortable>
            <template #default="{ row }">
              <el-tag :type="row.holding ? 'success' : 'info'" size="small" effect="plain">
                {{ row.holding ? '持仓' : '已交易' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="positionRatio" label="仓位" width="92" align="right" sortable>
            <template #default="{ row }">{{ formatPercent(row.positionRatio) }}</template>
          </el-table-column>
          <el-table-column prop="periodChange" label="周期涨跌" width="110" align="right" sortable>
            <template #default="{ row }">
              <span :class="changeClass(row.periodChange)">{{
                formatPercent(row.periodChange)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="benchmarkChange" label="基准" width="106" align="right" sortable>
            <template #default="{ row }">{{ formatPercent(row.benchmarkChange) }}</template>
          </el-table-column>
          <el-table-column prop="excessReturn" label="超额" width="106" align="right" sortable>
            <template #default="{ row }">
              <span :class="changeClass(row.excessReturn)">{{
                formatPercent(row.excessReturn)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="maxDrawdown" label="最大回撤" width="110" align="right" sortable>
            <template #default="{ row }">{{ formatPercent(row.maxDrawdown) }}</template>
          </el-table-column>
          <el-table-column prop="volatility" label="日波动" width="96" align="right" sortable>
            <template #default="{ row }">{{ formatPercent(row.volatility) }}</template>
          </el-table-column>
          <el-table-column prop="tradeCount" label="交易笔数" width="100" align="right" sortable />
          <el-table-column
            prop="chaseBuyCount"
            label="追涨买入"
            width="104"
            align="right"
            sortable
          />
          <el-table-column
            prop="panicSellCount"
            label="下跌卖出"
            width="104"
            align="right"
            sortable
          />
          <el-table-column
            prop="technicalSummary"
            label="技术状态"
            min-width="300"
            show-overflow-tooltip
          />
        </el-table>
      </section>
    </template>

    <template v-else-if="mode === 'behavior'">
      <section class="dashboard-section">
        <div class="section-heading">
          <div>
            <h2>交易行为</h2>
            <span>只识别可从成交日期和日线涨跌验证的行为，不推断盘中动机</span>
          </div>
        </div>
        <div class="behavior-grid">
          <div class="behavior-metric"
            ><span>买入笔数</span><strong>{{ dashboard.trades.buyCount }}</strong
            ><small>{{ formatAmount(dashboard.trades.buyAmount) }}</small></div
          >
          <div class="behavior-metric"
            ><span>卖出笔数</span><strong>{{ dashboard.trades.sellCount }}</strong
            ><small>{{ formatAmount(dashboard.trades.sellAmount) }}</small></div
          >
          <div class="behavior-metric"
            ><span>追涨买入</span
            ><strong class="negative-number">{{ dashboard.trades.chaseBuyCount }}</strong
            ><small>当日涨幅 &gt; 3%</small></div
          >
          <div class="behavior-metric"
            ><span>下跌卖出</span
            ><strong class="negative-number">{{ dashboard.trades.panicSellCount }}</strong
            ><small>当日跌幅 &lt; -3%</small></div
          >
          <div class="behavior-metric"
            ><span>当日买卖</span><strong>{{ dashboard.trades.sameDayRoundTripCount }}</strong
            ><small>同一股票同一交易日</small></div
          >
          <div class="behavior-metric"
            ><span>交易费用</span><strong>{{ formatAmount(dashboard.trades.totalFee) }}</strong
            ><small>已导入成交记录</small></div
          >
        </div>
      </section>
      <section class="dashboard-section dashboard-chart-grid">
        <div class="chart-section">
          <div class="section-heading"
            ><div><h3>行为信号分布</h3><span>可验证规则命中次数</span></div></div
          >
          <Echart :height="300" :options="behaviorOptions" />
        </div>
        <div class="chart-section">
          <div class="section-heading"
            ><div><h3>资讯事件时间线</h3><span>不代表事件与交易的因果关系</span></div></div
          >
          <el-timeline v-if="dashboard.events?.length" class="event-timeline">
            <el-timeline-item
              v-for="event in dashboard.events.slice(0, 12)"
              :key="event.evidenceId"
              :timestamp="formatDateTime(event.publishedAt)"
            >
              <strong>{{ event.stockName || event.stockCode || '未知股票' }}</strong>
              <span class="event-type">{{ event.type || '事件' }}</span>
              <div class="event-title">{{ event.title || '--' }}</div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="分析区间没有本地资讯公告" />
        </div>
      </section>
    </template>

    <template v-else>
      <section class="dashboard-section">
        <div class="section-heading">
          <div>
            <h2>风险诊断</h2>
            <span>风险信号来自确定性规则，AI 负责解释和制定改进方案</span>
          </div>
        </div>
        <div class="risk-layout">
          <div class="risk-score">
            <div class="risk-score__value">{{ dashboard.dataQuality.score }}</div>
            <div class="risk-score__label">数据质量分</div>
            <el-progress
              :percentage="dashboard.dataQuality.score"
              :show-text="false"
              :color="qualityColor"
            />
          </div>
          <div class="risk-summary">
            <div
              ><span>行情覆盖率</span
              ><strong>{{ formatPercent(dashboard.dataQuality.marketCoverageRate) }}</strong></div
            >
            <div
              ><span>缺行情股票</span
              ><strong>{{ dashboard.dataQuality.missingMarketStockCount }}</strong></div
            >
            <div
              ><span>账户历史快照</span
              ><strong>{{
                dashboard.dataQuality.accountHistoryAvailable ? '已接入' : '缺失'
              }}</strong></div
            >
            <div
              ><span>委托/撤单</span
              ><strong>{{
                dashboard.dataQuality.orderDataAvailable ? '已接入' : '缺失'
              }}</strong></div
            >
          </div>
        </div>
        <el-alert
          v-for="(warning, warningIndex) in dashboard.dataQuality.messages || []"
          :key="`${warningIndex}-${warning}`"
          class="quality-alert"
          type="warning"
          :closable="false"
          show-icon
          :title="warning"
        />
        <el-table :data="dashboard.risks" stripe table-layout="fixed" empty-text="暂无规则风险信号">
          <el-table-column prop="level" label="等级" width="96">
            <template #default="{ row }"
              ><el-tag :type="riskTagType(row.level)" effect="plain">{{
                riskLevelLabel(row.level)
              }}</el-tag></template
            >
          </el-table-column>
          <el-table-column prop="title" label="风险信号" min-width="210" />
          <el-table-column prop="detail" label="规则事实" min-width="480" />
          <el-table-column prop="evidenceId" label="证据编号" width="200" />
        </el-table>
      </section>
    </template>
  </div>
  <el-empty v-else description="点击“计算系统分析”后显示确定性指标" />
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { StockAiAnalysisDashboardVO } from '@/api/finance/stock/ai-analysis'
import { Echart } from '@/components/Echart'

defineOptions({ name: 'FinanceStockAiDashboardPanel' })

const props = defineProps<{
  dashboard?: StockAiAnalysisDashboardVO
  mode: 'overview' | 'stocks' | 'behavior' | 'risk'
}>()

const dashboard = computed(() => props.dashboard)
const formatPercent = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value) ? '--' : `${value.toFixed(2)}%`
const formatNumber = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value) ? '--' : value.toFixed(2)
const formatAmount = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '--'
    : value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const formatDateTime = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '--'

  if (Array.isArray(value)) {
    if (value.length === 1) return formatDateTime(value[0])
    const parts = value.map((part) => Number(part))
    if (parts.length >= 3 && parts.slice(0, 6).every((part) => Number.isFinite(part))) {
      const [year, month, day, hour = 0, minute = 0] = parts
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(
        hour
      ).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
    return '--'
  }

  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '--' : formatDateParts(date)
  }

  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return '--'
    if (/^\d{10,13}$/.test(text)) return formatDateTime(Number(text))
    return text.replace('T', ' ').slice(0, 16)
  }

  if (value instanceof Date) return formatDateParts(value)
  return '--'
}

const formatDateParts = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`
const changeClass = (value: number | null | undefined) =>
  value === null || value === undefined ? '' : value >= 0 ? 'positive-number' : 'negative-number'
const riskLevelLabel = (level: string) =>
  ({ HIGH: '高', MEDIUM: '中', INFO: '提示' })[level] || level
const riskTagType = (level: string) =>
  level === 'HIGH' ? 'danger' : level === 'MEDIUM' ? 'warning' : 'info'
const qualityTagType = computed(() => {
  const score = props.dashboard?.dataQuality.score ?? 0
  return score >= 80 ? 'success' : score >= 55 ? 'warning' : 'danger'
})
const qualityColor = computed(() => {
  const score = props.dashboard?.dataQuality.score ?? 0
  return score >= 80 ? '#16845b' : score >= 55 ? '#d97706' : '#cf2e2e'
})

const benchmarkOptions = computed<EChartsOption>(() => ({
  animation: false,
  color: ['#2563eb'],
  grid: { left: 20, right: 20, top: 18, bottom: 42, containLabel: true },
  tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => `${Number(value).toFixed(2)}%` },
  xAxis: {
    type: 'category',
    data: props.dashboard?.benchmarks.map((item) => item.name) ?? [],
    axisLabel: { interval: 0 }
  },
  yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
  series: [
    {
      type: 'bar',
      barMaxWidth: 32,
      data: props.dashboard?.benchmarks.map((item) => item.periodChange) ?? []
    }
  ]
}))

const stockOptions = computed<EChartsOption>(() => {
  const stocks = [...(props.dashboard?.stocks ?? [])]
    .filter((item) => item.excessReturn !== null)
    .sort((left, right) => Math.abs(right.excessReturn ?? 0) - Math.abs(left.excessReturn ?? 0))
    .slice(0, 10)
    .reverse()
  return {
    animation: false,
    color: ['#16845b'],
    grid: { left: 20, right: 24, top: 18, bottom: 24, containLabel: true },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: unknown) => `${Number(value).toFixed(2)}%`
    },
    xAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: stocks.map((item) => item.name) },
    series: [{ type: 'bar', barMaxWidth: 18, data: stocks.map((item) => item.excessReturn) }]
  }
})

const behaviorOptions = computed<EChartsOption>(() => ({
  animation: false,
  color: ['#cf2e2e', '#d97706', '#2563eb', '#64748b'],
  grid: { left: 18, right: 18, top: 18, bottom: 28, containLabel: true },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['追涨买入', '下跌卖出', '当日买卖', '总费用'] },
  yAxis: { type: 'value' },
  series: [
    {
      type: 'bar',
      barMaxWidth: 32,
      data: [
        props.dashboard?.trades.chaseBuyCount ?? 0,
        props.dashboard?.trades.panicSellCount ?? 0,
        props.dashboard?.trades.sameDayRoundTripCount ?? 0,
        props.dashboard?.trades.totalFee ?? 0
      ]
    }
  ]
}))
</script>

<style scoped lang="scss">
.stock-ai-dashboard {
  min-width: 0;
}

.dashboard-section {
  padding: 18px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.section-heading h2,
.section-heading h3 {
  padding: 0;
  margin: 0;
  font-weight: 650;
  color: var(--el-text-color-primary);
}

.section-heading h2 {
  font-size: 16px;
}

.section-heading h3 {
  font-size: 14px;
}

.section-heading span {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-grid,
.behavior-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 1px;
  background: var(--el-border-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
}

.summary-item,
.behavior-metric {
  display: flex;
  min-height: 92px;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 10px 12px;
  background: var(--el-bg-color);
}

.summary-item > span,
.behavior-metric > span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-item strong,
.behavior-metric strong {
  font-size: 19px;
  line-height: 24px;
}

.summary-item small,
.behavior-metric small {
  min-height: 16px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.summary-item--risk strong {
  color: var(--el-color-warning-dark-2);
}

.positive-number {
  color: var(--el-color-danger);
}

.negative-number {
  color: var(--el-color-success);
}

.stock-name {
  font-weight: 600;
}

.stock-code {
  margin-top: 3px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.event-type {
  display: inline-block;
  margin-left: 8px;
  color: var(--el-color-primary);
}

.event-title {
  margin-top: 4px;
  line-height: 20px;
}

.event-timeline {
  max-height: 310px;
  padding: 4px 12px;
  overflow-y: auto;
}

.quality-alert + .quality-alert {
  margin-top: 8px;
}

.dashboard-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.chart-section {
  min-width: 0;
}

.risk-layout {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 28px;
  align-items: center;
  margin-bottom: 20px;
}

.risk-score {
  text-align: center;
}

.risk-score__value {
  font-size: 46px;
  font-weight: 700;
  line-height: 54px;
  color: var(--el-color-primary);
}

.risk-score__label {
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.risk-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  background: var(--el-border-color-lighter);
}

.risk-summary > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px;
  background: var(--el-bg-color);
}

.risk-summary span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.risk-summary strong {
  font-size: 16px;
}

@media (width <= 1000px) {
  .summary-grid,
  .behavior-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dashboard-chart-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (width <= 620px) {
  .dashboard-section {
    padding: 14px 12px;
  }

  .summary-grid,
  .behavior-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .risk-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .risk-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
