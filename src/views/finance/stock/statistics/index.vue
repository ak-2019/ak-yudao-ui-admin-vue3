<template>
  <StockWorkspaceNav />
  <ContentWrap>
    <div class="workspace-heading">
      <div>
        <div class="workspace-heading__title">每日综合统计</div>
        <div class="workspace-heading__meta">按交易日观察选股结果，趋势节点可直接查看逐股明细</div>
      </div>
      <el-button
        :loading="rebuildLoading"
        v-hasPermi="['finance:stock-statistics:query']"
        @click="handleRebuild"
      >
        <Icon icon="ep:refresh" class="mr-5px" />
        重建历史
      </el-button>
    </div>

    <div class="query-band">
      <el-button-group class="quick-range">
        <el-button :type="quickRange === '7d' ? 'primary' : 'default'" @click="setQuickRange(7)">
          近 7 日
        </el-button>
        <el-button :type="quickRange === '30d' ? 'primary' : 'default'" @click="setQuickRange(30)">
          近 30 日
        </el-button>
        <el-button :type="quickRange === 'all' ? 'primary' : 'default'" @click="setAllRange">
          全部
        </el-button>
      </el-button-group>
      <el-date-picker
        v-model="dateRange"
        class="date-range-picker"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        range-separator="至"
        clearable
        :shortcuts="financeDateRangeShortcuts"
        @change="handleDateRangeChange"
      />
      <el-button type="primary" :loading="loading" @click="handleSearch">
        <Icon icon="ep:search" class="mr-5px" />
        查询
      </el-button>
      <el-tooltip content="清空日期范围" placement="top">
        <el-button circle aria-label="清空日期范围" :disabled="!dateRange" @click="handleReset">
          <Icon icon="ep:refresh-left" />
        </el-button>
      </el-tooltip>
    </div>

    <div class="snapshot-meta">
      <span>最新快照 {{ latestSnapshot?.snapshotDate || '--' }}</span>
      <span>跟踪区间 {{ formatDateRange(latestSnapshot) }}</span>
    </div>
    <div class="horizon-band">
      <div v-for="metric in horizonMetrics" :key="metric.key" class="horizon-metric">
        <span class="horizon-metric__label">{{ metric.label }}</span>
        <strong :class="metric.className">{{ metric.value }}</strong>
        <span class="horizon-metric__meta">{{ metric.meta }}</span>
      </div>
    </div>
    <div class="metric-groups">
      <section class="metric-group metric-group--daily">
        <div class="metric-group__heading">
          <span class="metric-group__label">每日口径</span>
          <span class="metric-group__hint">仅判断快照当日涨跌</span>
        </div>
        <div class="metric-grid">
          <div class="metric-item metric-item--primary">
            <span class="metric-item__label">成功率</span>
            <strong :class="changeClass(latestSnapshot?.dailyWinRate)">
              {{ formatPercent(latestSnapshot?.dailyWinRate) }}
            </strong>
          </div>
          <div class="metric-item">
            <span class="metric-item__label">有效股票</span>
            <strong>{{ latestSnapshot?.dailySampleCount ?? '--' }}</strong>
          </div>
          <div class="metric-item">
            <span class="metric-item__label">上涨</span>
            <strong class="price-up">{{ latestSnapshot?.dailyWinCount ?? '--' }}</strong>
          </div>
          <div class="metric-item">
            <span class="metric-item__label">下跌</span>
            <strong class="price-down">{{ latestSnapshot?.dailyLossCount ?? '--' }}</strong>
          </div>
          <div class="metric-item">
            <span class="metric-item__label">平盘</span>
            <strong>{{ latestSnapshot?.dailyFlatCount ?? '--' }}</strong>
          </div>
        </div>
      </section>
      <section class="metric-group metric-group--cumulative">
        <div class="metric-group__heading">
          <span class="metric-group__label">累计口径</span>
          <span class="metric-group__hint">从各股跟踪日逐日累加</span>
        </div>
        <div class="metric-grid">
          <div class="metric-item metric-item--primary">
            <span class="metric-item__label">成功率</span>
            <strong :class="changeClass(latestSnapshot?.winRate)">
              {{ formatPercent(latestSnapshot?.winRate) }}
            </strong>
          </div>
          <div class="metric-item">
            <span class="metric-item__label">有效股票</span>
            <strong>{{ latestSnapshot?.sampleCount ?? '--' }}</strong>
          </div>
          <div class="metric-item">
            <span class="metric-item__label">上涨</span>
            <strong class="price-up">{{ latestSnapshot?.winCount ?? '--' }}</strong>
          </div>
          <div class="metric-item">
            <span class="metric-item__label">下跌</span>
            <strong class="price-down">{{ latestSnapshot?.lossCount ?? '--' }}</strong>
          </div>
          <div class="metric-item">
            <span class="metric-item__label">平盘</span>
            <strong>{{ latestSnapshot?.flatCount ?? '--' }}</strong>
          </div>
        </div>
      </section>
    </div>
  </ContentWrap>

  <StockCapabilityAnalysisPanel
    :as-of-date="latestSnapshot?.snapshotDate"
    :refresh-key="capabilityRefreshKey"
  />

  <StockAccountSnapshotPanel />

  <ContentWrap>
    <div class="section-heading">
      <div>
        <div class="section-heading__title">短期成功率趋势</div>
        <div class="section-heading__meta"
          >每日结果反映即时表现，5 日与 20 日加权结果反映短期稳定性</div
        >
      </div>
      <div v-if="latestSnapshot" class="trend-current">
        <span>{{ latestSnapshot.snapshotDate }}</span>
        <span
          >每日
          <strong :class="changeClass(latestSnapshot.dailyWinRate)">{{
            formatPercent(latestSnapshot.dailyWinRate)
          }}</strong></span
        >
        <span
          >近 5 日
          <strong :class="changeClass(latestRolling5.winRate)">{{
            formatPercent(latestRolling5.winRate)
          }}</strong></span
        >
        <span
          >近 20 日
          <strong :class="changeClass(latestRolling20.winRate)">{{
            formatPercent(latestRolling20.winRate)
          }}</strong></span
        >
      </div>
    </div>
    <div v-loading="loading" class="chart-area">
      <Echart
        v-if="trend.length > 0"
        :height="360"
        :options="shortTermChartOptions"
        @chart-click="handleShortTermChartClick"
      />
      <el-empty v-else description="暂无统计快照" />
    </div>
  </ContentWrap>

  <ContentWrap>
    <div class="analysis-grid">
      <section class="analysis-panel">
        <div class="section-heading">
          <div>
            <div class="section-heading__title">长期累计表现</div>
            <div class="section-heading__meta">累计成功率结合有效股票数观察长期能力</div>
          </div>
          <div v-if="latestSnapshot" class="trend-current">
            <span
              >累计
              <strong :class="changeClass(latestSnapshot.winRate)">{{
                formatPercent(latestSnapshot.winRate)
              }}</strong></span
            >
            <span>{{ latestSnapshot.sampleCount }} 支股票</span>
          </div>
        </div>
        <div v-loading="loading" class="chart-area chart-area--compact">
          <Echart
            v-if="trend.length > 0"
            :height="320"
            :options="longTermChartOptions"
            @chart-click="handleLongTermChartClick"
          />
          <el-empty v-else description="暂无累计快照" />
        </div>
      </section>
      <section class="analysis-panel">
        <div class="section-heading">
          <div>
            <div class="section-heading__title">每日结果构成</div>
            <div class="section-heading__meta">上涨、下跌和平盘数量解释每日成功率变化</div>
          </div>
          <div v-if="latestSnapshot" class="trend-current">
            <span class="price-up">上涨 {{ latestSnapshot.dailyWinCount }}</span>
            <span class="price-down">下跌 {{ latestSnapshot.dailyLossCount }}</span>
            <span>平盘 {{ latestSnapshot.dailyFlatCount }}</span>
          </div>
        </div>
        <div v-loading="loading" class="chart-area chart-area--compact">
          <Echart
            v-if="trend.length > 0"
            :height="320"
            :options="compositionChartOptions"
            @chart-click="handleCompositionChartClick"
          />
          <el-empty v-else description="暂无每日结果" />
        </div>
      </section>
    </div>
  </ContentWrap>

  <ContentWrap>
    <div class="section-heading">
      <div>
        <div class="section-heading__title">每日明细</div>
        <div class="section-heading__meta"
          >当前显示 {{ sortedTrend.length }} / {{ trend.length }} 个快照</div
        >
      </div>
      <div class="detail-filters">
        <el-input
          v-model="snapshotKeyword"
          class="snapshot-search"
          clearable
          placeholder="搜索快照日期"
          :prefix-icon="Search"
        />
        <el-select v-model="snapshotResultFilter" class="result-filter" placeholder="包含结果">
          <el-option label="全部结果" value="ALL" />
          <el-option label="包含上涨" value="WIN" />
          <el-option label="包含下跌" value="LOSS" />
          <el-option label="包含平盘" value="FLAT" />
        </el-select>
      </div>
    </div>
    <div v-if="selectedSnapshotDates.length > 0" class="selection-bar">
      <div class="selection-bar__summary">
        <Icon icon="ep:select" />
        已选择 <strong>{{ selectedSnapshotDates.length }}</strong> 个快照
      </div>
      <div class="selection-bar__actions">
        <el-button
          type="primary"
          :loading="batchRebuildLoading"
          v-hasPermi="['finance:stock-statistics:query']"
          @click="handleBatchRebuild"
        >
          <Icon icon="ep:refresh" class="mr-5px" />
          批量重建
        </el-button>
        <el-button @click="clearSnapshotSelection">取消选择</el-button>
      </div>
    </div>
    <el-table
      ref="snapshotTableRef"
      v-loading="loading"
      :data="sortedTrend"
      row-key="snapshotDate"
      stripe
      table-layout="fixed"
      max-height="560"
      empty-text="暂无统计快照"
      @selection-change="handleSnapshotSelectionChange"
      @sort-change="handleTrendSortChange"
    >
      <el-table-column type="selection" width="48" fixed reserve-selection />
      <el-table-column prop="snapshotDate" label="快照日期" width="120" fixed sortable="custom" />
      <el-table-column
        prop="dailyWinRate"
        label="每日成功率"
        width="120"
        align="right"
        sortable="custom"
      >
        <template #default="{ row }">
          <span :class="changeClass(row.dailyWinRate)">{{ formatPercent(row.dailyWinRate) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="dailySampleCount"
        label="每日样本"
        width="104"
        align="right"
        sortable="custom"
      />
      <el-table-column
        prop="dailyWinCount"
        label="每日上涨"
        width="104"
        align="right"
        sortable="custom"
      />
      <el-table-column
        prop="dailyLossCount"
        label="每日下跌"
        width="104"
        align="right"
        sortable="custom"
      />
      <el-table-column
        prop="dailyFlatCount"
        label="每日平盘"
        width="104"
        align="right"
        sortable="custom"
      />
      <el-table-column
        prop="winRate"
        label="累计成功率"
        width="120"
        align="right"
        sortable="custom"
      >
        <template #default="{ row }">
          <span :class="changeClass(row.winRate)">{{ formatPercent(row.winRate) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="sampleCount"
        label="累计样本"
        width="104"
        align="right"
        sortable="custom"
      />
      <el-table-column
        prop="winCount"
        label="累计上涨"
        width="104"
        align="right"
        sortable="custom"
      />
      <el-table-column
        prop="lossCount"
        label="累计下跌"
        width="104"
        align="right"
        sortable="custom"
      />
      <el-table-column
        prop="flatCount"
        label="累计平盘"
        width="104"
        align="right"
        sortable="custom"
      />
      <el-table-column prop="trackingRange" label="跟踪统计区间" min-width="220" sortable="custom">
        <template #default="{ row }">{{ formatDateRange(row) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="148" align="center" fixed="right">
        <template #default="{ row }">
          <div class="row-actions">
            <el-tooltip content="查看每日逐股明细" placement="top">
              <el-button
                link
                type="primary"
                aria-label="查看每日逐股明细"
                @click="openSnapshotDetail(row.snapshotDate, 'DAILY')"
              >
                <Icon icon="ep:calendar" />
              </el-button>
            </el-tooltip>
            <el-tooltip content="查看累计逐股明细" placement="top">
              <el-button
                link
                type="primary"
                aria-label="查看累计逐股明细"
                @click="openSnapshotDetail(row.snapshotDate, 'CUMULATIVE')"
              >
                <Icon icon="ep:trend-charts" />
              </el-button>
            </el-tooltip>
            <el-tooltip content="重建该日快照" placement="top">
              <el-button
                link
                type="primary"
                aria-label="重建该日快照"
                :loading="rebuildDateLoading === row.snapshotDate"
                :disabled="Boolean(rebuildDateLoading)"
                v-hasPermi="['finance:stock-statistics:query']"
                @click="handleRebuildDate(row.snapshotDate)"
              >
                <Icon icon="ep:refresh" />
              </el-button>
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </ContentWrap>

  <el-dialog
    v-model="rollingVisible"
    :title="`近 ${rollingWindow} 个交易日加权明细`"
    width="min(860px, calc(100vw - 32px))"
    destroy-on-close
  >
    <div class="rolling-overview">
      <span>
        加权成功率
        <strong :class="changeClass(rollingSummary.winRate)">{{
          formatPercent(rollingSummary.winRate)
        }}</strong>
      </span>
      <span
        >股票日样本 <strong>{{ rollingSummary.sampleCount }}</strong></span
      >
      <span
        >交易日 <strong>{{ rollingSummary.tradingDayCount }}</strong></span
      >
      <span>{{ formatRollingRange(rollingSummary) }}</span>
    </div>
    <el-table
      :data="rollingDetailRows"
      stripe
      table-layout="fixed"
      max-height="480"
      empty-text="暂无滚动窗口明细"
    >
      <el-table-column prop="snapshotDate" label="交易日" width="126" fixed />
      <el-table-column label="每日成功率" min-width="126" align="right">
        <template #default="{ row }">
          <span :class="changeClass(row.dailyWinRate)">{{ formatPercent(row.dailyWinRate) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="dailySampleCount" label="有效股票" min-width="104" align="right" />
      <el-table-column prop="dailyWinCount" label="上涨" min-width="80" align="right" />
      <el-table-column prop="dailyLossCount" label="下跌" min-width="80" align="right" />
      <el-table-column prop="dailyFlatCount" label="平盘" min-width="80" align="right" />
      <el-table-column label="操作" width="72" align="center" fixed="right">
        <template #default="{ row }">
          <el-tooltip content="查看该日逐股明细" placement="top">
            <el-button
              link
              type="primary"
              aria-label="查看该日逐股明细"
              :disabled="row.dailySampleCount === 0"
              @click="openRollingDailyDetail(row.snapshotDate)"
            >
              <Icon icon="ep:view" />
            </el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="rollingVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="detailVisible"
    :title="`${detailDate || '--'} ${detailTypeLabel}逐股明细`"
    width="min(1040px, calc(100vw - 32px))"
    destroy-on-close
  >
    <div class="dialog-toolbar">
      <div class="detail-overview">
        <span
          >上涨 <strong class="price-up">{{ detailOverview.winCount }}</strong></span
        >
        <span
          >下跌 <strong class="price-down">{{ detailOverview.lossCount }}</strong></span
        >
        <span
          >平均
          <strong :class="changeClass(detailOverview.averageChangePercent)">{{
            formatPercent(detailOverview.averageChangePercent)
          }}</strong></span
        >
      </div>
      <div class="detail-filters">
        <el-input
          v-model="detailKeyword"
          class="detail-search"
          clearable
          placeholder="股票名称或代码"
          :prefix-icon="Search"
        />
        <el-select v-model="detailResultFilter" class="result-filter">
          <el-option label="全部结果" value="ALL" />
          <el-option label="上涨" value="WIN" />
          <el-option label="下跌" value="LOSS" />
          <el-option label="平盘" value="FLAT" />
        </el-select>
      </div>
    </div>
    <el-table
      v-loading="detailLoading"
      :data="sortedSnapshotDetails"
      stripe
      table-layout="fixed"
      max-height="560"
      empty-text="该日期暂无有效股票明细"
      @sort-change="handleDetailSortChange"
    >
      <el-table-column prop="name" label="股票名称" min-width="120" fixed sortable="custom" />
      <el-table-column prop="symbol" label="股票代码" width="128" sortable="custom" />
      <el-table-column prop="trackingRange" label="跟踪区间" min-width="220" sortable="custom">
        <template #default="{ row }">
          {{ row.trackingStartDate }} 至 {{ row.trackingEndDate || '持续跟踪' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="statisticsRange"
        :label="detailType === 'DAILY' ? '统计日期' : '累计区间'"
        min-width="200"
        sortable="custom"
      >
        <template #default="{ row }">
          <template v-if="detailType === 'DAILY'">{{ row.lastTradeDate }}</template>
          <template v-else>{{ row.firstTradeDate }} 至 {{ row.lastTradeDate }}</template>
        </template>
      </el-table-column>
      <el-table-column
        v-if="detailType === 'CUMULATIVE'"
        label="起始收盘"
        width="112"
        align="right"
        prop="firstClosePrice"
        sortable="custom"
      >
        <template #default="{ row }">{{ formatPrice(row.firstClosePrice) }}</template>
      </el-table-column>
      <el-table-column
        prop="lastClosePrice"
        :label="detailType === 'DAILY' ? '当日收盘' : '截止收盘'"
        width="112"
        align="right"
        sortable="custom"
      >
        <template #default="{ row }">{{ formatPrice(row.lastClosePrice) }}</template>
      </el-table-column>
      <el-table-column
        prop="changePercent"
        :label="detailChangeLabel"
        width="176"
        align="right"
        sortable="custom"
      >
        <template #default="{ row }">
          <span :class="changeClass(row.changePercent)">
            {{ formatPercent(row.changePercent) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        prop="result"
        label="结果"
        width="112"
        align="center"
        fixed="right"
        sortable="custom"
      >
        <template #default="{ row }">
          <el-tag :type="resultTagType(row.result)" effect="plain">
            {{ resultLabels[row.result] }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button
        :loading="rebuildDateLoading === detailDate"
        :disabled="Boolean(rebuildDateLoading) || !detailDate"
        v-hasPermi="['finance:stock-statistics:query']"
        @click="detailDate && handleRebuildDate(detailDate)"
      >
        <Icon icon="ep:refresh" class="mr-5px" />
        重建当日
      </el-button>
      <el-button @click="detailVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type { EChartsOption } from 'echarts'
import type { ECElementEvent } from 'echarts/core'
import { Search } from '@element-plus/icons-vue'
import { financeDateRangeShortcuts } from '@/views/finance/utils/dateShortcuts'
import StockCapabilityAnalysisPanel from './components/StockCapabilityAnalysisPanel.vue'
import {
  StockApi,
  StockStatisticsResult,
  StockStatisticsSnapshotDetailVO,
  StockStatisticsSnapshotVO,
  StockStatisticsTrendParams,
  StockStatisticsType
} from '@/api/finance/stock'
import StockWorkspaceNav from '../components/StockWorkspaceNav.vue'
import StockAccountSnapshotPanel from './components/StockAccountSnapshotPanel.vue'

defineOptions({ name: 'FinanceStockStatistics' })

type DateRange = [string, string]
type SortOrder = 'ascending' | 'descending' | null
type DetailSort = { prop: string; order: SortOrder }
type TrendSort = { prop: string; order: SortOrder }
type SnapshotTableRef = { clearSelection: () => void }
type QuickRange = '7d' | '30d' | 'all' | 'custom'
type ResultFilter = 'ALL' | StockStatisticsResult
type RollingMetric = {
  startDate: string | null
  endDate: string | null
  tradingDayCount: number
  sampleCount: number
  winCount: number
  lossCount: number
  flatCount: number
  winRate: number | null
}

const seriesNames: Record<StockStatisticsType, string> = {
  DAILY: '每日成功率',
  CUMULATIVE: '累计成功率'
}
const rollingSeriesNames = {
  5: '近 5 日加权成功率',
  20: '近 20 日加权成功率'
} as const
const cumulativeSampleSeriesName = '累计有效股票'
const compositionSeriesNames = {
  WIN: '每日上涨',
  LOSS: '每日下跌',
  FLAT: '每日平盘'
} as const

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六']
const formatSnapshotAxisDate = (date: string) => {
  const value = dayjs(date)
  return `${value.format('MM-DD')} 周${weekdayLabels[value.day()]}`
}

const message = useMessage()
const loading = ref(false)
const rebuildLoading = ref(false)
const rebuildDateLoading = ref<string>()
const batchRebuildLoading = ref(false)
const capabilityRefreshKey = ref(0)
const dateRange = ref<DateRange>()
const quickRange = ref<QuickRange>('all')
const query = reactive<StockStatisticsTrendParams>({})
const allTrend = ref<StockStatisticsSnapshotVO[]>([])
const trend = ref<StockStatisticsSnapshotVO[]>([])
const snapshotKeyword = ref('')
const snapshotResultFilter = ref<ResultFilter>('ALL')
const selectedSnapshotDates = ref<string[]>([])
const snapshotTableRef = ref<SnapshotTableRef>()
const trendSort = ref<TrendSort>({ prop: '', order: null })
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailDate = ref('')
const detailType = ref<StockStatisticsType>('CUMULATIVE')
const snapshotDetails = ref<StockStatisticsSnapshotDetailVO[]>([])
const detailKeyword = ref('')
const detailResultFilter = ref<ResultFilter>('ALL')
const detailSort = ref<DetailSort>({ prop: '', order: null })
const rollingVisible = ref(false)
const rollingWindow = ref<5 | 20>(5)
const rollingEndDate = ref('')

const resultLabels: Record<StockStatisticsResult, string> = {
  WIN: '上涨',
  LOSS: '下跌',
  FLAT: '平盘'
}

const latestSnapshot = computed(() => trend.value[trend.value.length - 1])
const emptyRollingMetric = (): RollingMetric => ({
  startDate: null,
  endDate: null,
  tradingDayCount: 0,
  sampleCount: 0,
  winCount: 0,
  lossCount: 0,
  flatCount: 0,
  winRate: null
})

const getRollingWindowRows = (
  rows: StockStatisticsSnapshotVO[],
  endDate: string | undefined,
  windowSize: number
) => {
  if (!endDate) return []
  const endIndex = rows.findIndex((item) => item.snapshotDate === endDate)
  if (endIndex < 0) return []
  return rows.slice(Math.max(0, endIndex - windowSize + 1), endIndex + 1)
}

const calculateRollingMetric = (
  rows: StockStatisticsSnapshotVO[],
  endDate: string | undefined,
  windowSize: number
): RollingMetric => {
  const windowRows = getRollingWindowRows(rows, endDate, windowSize)
  if (windowRows.length === 0) return emptyRollingMetric()
  const totals = windowRows.reduce(
    (result, item) => ({
      sampleCount: result.sampleCount + item.dailySampleCount,
      winCount: result.winCount + item.dailyWinCount,
      lossCount: result.lossCount + item.dailyLossCount,
      flatCount: result.flatCount + item.dailyFlatCount
    }),
    { sampleCount: 0, winCount: 0, lossCount: 0, flatCount: 0 }
  )
  return {
    startDate: windowRows[0]?.snapshotDate ?? null,
    endDate: windowRows[windowRows.length - 1]?.snapshotDate ?? null,
    tradingDayCount: windowRows.length,
    ...totals,
    winRate:
      totals.sampleCount > 0
        ? Number(((totals.winCount / totals.sampleCount) * 100).toFixed(2))
        : null
  }
}

const latestRolling5 = computed(() =>
  calculateRollingMetric(allTrend.value, latestSnapshot.value?.snapshotDate, 5)
)
const latestRolling20 = computed(() =>
  calculateRollingMetric(allTrend.value, latestSnapshot.value?.snapshotDate, 20)
)
const rollingDetailRows = computed(() =>
  getRollingWindowRows(allTrend.value, rollingEndDate.value, rollingWindow.value)
)
const rollingSummary = computed(() =>
  calculateRollingMetric(allTrend.value, rollingEndDate.value, rollingWindow.value)
)
const shortLongGap = computed(() => {
  const shortRate = latestRolling5.value.winRate
  const longRate = latestSnapshot.value?.winRate
  if (shortRate === null || longRate === null || longRate === undefined) return null
  return Number((shortRate - longRate).toFixed(2))
})
const horizonMetrics = computed(() => [
  {
    key: 'daily',
    label: '当日成功率',
    value: formatPercent(latestSnapshot.value?.dailyWinRate),
    meta: latestSnapshot.value ? `${latestSnapshot.value.dailySampleCount} 支有效股票` : '暂无快照',
    className: changeClass(latestSnapshot.value?.dailyWinRate)
  },
  {
    key: 'rolling-5',
    label: '近 5 日加权',
    value: formatPercent(latestRolling5.value.winRate),
    meta: `${latestRolling5.value.tradingDayCount} 个交易日 · ${latestRolling5.value.sampleCount} 个股票日`,
    className: changeClass(latestRolling5.value.winRate)
  },
  {
    key: 'rolling-20',
    label: '近 20 日加权',
    value: formatPercent(latestRolling20.value.winRate),
    meta: `${latestRolling20.value.tradingDayCount} 个交易日 · ${latestRolling20.value.sampleCount} 个股票日`,
    className: changeClass(latestRolling20.value.winRate)
  },
  {
    key: 'cumulative',
    label: '累计成功率',
    value: formatPercent(latestSnapshot.value?.winRate),
    meta: latestSnapshot.value ? `${latestSnapshot.value.sampleCount} 支有效股票` : '暂无快照',
    className: changeClass(latestSnapshot.value?.winRate)
  },
  {
    key: 'gap',
    label: '短期相对长期',
    value: formatPercentagePoint(shortLongGap.value),
    meta: '近 5 日减累计口径',
    className: changeClass(shortLongGap.value)
  }
])
const detailTypeLabel = computed(() => `${seriesNames[detailType.value]} · `)
const detailChangeLabel = computed(() =>
  detailType.value === 'DAILY' ? '当日涨跌幅' : '累计涨跌幅（逐日求和）'
)
const detailOverview = computed(() => {
  const changes = snapshotDetails.value
    .map((item) => item.changePercent)
    .filter(
      (value): value is number => value !== null && value !== undefined && Number.isFinite(value)
    )
  return {
    winCount: snapshotDetails.value.filter((item) => item.result === 'WIN').length,
    lossCount: snapshotDetails.value.filter((item) => item.result === 'LOSS').length,
    averageChangePercent:
      changes.length > 0 ? changes.reduce((sum, value) => sum + value, 0) / changes.length : null
  }
})

const filteredSnapshotDetails = computed(() => {
  const keyword = detailKeyword.value.trim().toLocaleLowerCase()
  return snapshotDetails.value.filter((item) => {
    const matchesKeyword =
      !keyword || `${item.name} ${item.symbol}`.toLocaleLowerCase().includes(keyword)
    const matchesResult =
      detailResultFilter.value === 'ALL' || item.result === detailResultFilter.value
    return matchesKeyword && matchesResult
  })
})

const sortedSnapshotDetails = computed(() => {
  if (!detailSort.value.prop || !detailSort.value.order) return filteredSnapshotDetails.value
  return [...filteredSnapshotDetails.value].sort((left, right) =>
    compareDetailRows(left, right, detailSort.value)
  )
})

const filteredTrend = computed(() => {
  const keyword = snapshotKeyword.value.trim()
  return trend.value.filter((item) => {
    if (keyword && !item.snapshotDate.includes(keyword)) return false
    if (snapshotResultFilter.value === 'ALL') return true
    if (snapshotResultFilter.value === 'WIN') {
      return item.dailyWinCount > 0 || item.winCount > 0
    }
    if (snapshotResultFilter.value === 'LOSS') {
      return item.dailyLossCount > 0 || item.lossCount > 0
    }
    return item.dailyFlatCount > 0 || item.flatCount > 0
  })
})

const sortedTrend = computed(() => {
  if (!trendSort.value.prop || !trendSort.value.order) return filteredTrend.value
  return [...filteredTrend.value].sort((left, right) =>
    compareTrendRows(left, right, trendSort.value)
  )
})

const percentTooltipFormatter = (value: unknown) =>
  value === null || value === undefined ? '--' : `${value}%`

const shortTermChartOptions = computed<EChartsOption>(() => ({
  legend: {
    top: 0,
    data: [seriesNames.DAILY, rollingSeriesNames[5], rollingSeriesNames[20]]
  },
  grid: {
    left: 24,
    right: 28,
    top: 54,
    bottom: 28,
    containLabel: true
  },
  tooltip: {
    trigger: 'axis',
    valueFormatter: percentTooltipFormatter
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: trend.value.map((item) => formatSnapshotAxisDate(item.snapshotDate)),
    axisLabel: { hideOverlap: true }
  },
  yAxis: {
    type: 'value',
    name: '成功率（%）',
    min: 0,
    max: 100,
    axisLabel: { formatter: '{value}%' },
    splitLine: { lineStyle: { color: '#e5e7eb' } }
  },
  series: [
    {
      id: 'daily-success-rate',
      name: seriesNames.DAILY,
      type: 'line',
      smooth: true,
      showSymbol: true,
      symbolSize: 7,
      cursor: 'pointer',
      connectNulls: false,
      lineStyle: { width: 2, color: '#2563eb' },
      itemStyle: { color: '#2563eb' },
      data: trend.value.map((item) => item.dailyWinRate)
    },
    {
      id: 'rolling-5-success-rate',
      name: rollingSeriesNames[5],
      type: 'line',
      smooth: true,
      showSymbol: true,
      symbolSize: 6,
      cursor: 'pointer',
      connectNulls: false,
      lineStyle: { width: 2, color: '#b7791f' },
      itemStyle: { color: '#b7791f' },
      data: trend.value.map(
        (item) => calculateRollingMetric(allTrend.value, item.snapshotDate, 5).winRate
      )
    },
    {
      id: 'rolling-20-success-rate',
      name: rollingSeriesNames[20],
      type: 'line',
      smooth: true,
      showSymbol: true,
      symbolSize: 6,
      cursor: 'pointer',
      connectNulls: false,
      lineStyle: { width: 2, color: '#16845b' },
      itemStyle: { color: '#16845b' },
      data: trend.value.map(
        (item) => calculateRollingMetric(allTrend.value, item.snapshotDate, 20).winRate
      )
    }
  ]
}))

const longTermChartOptions = computed<EChartsOption>(() => ({
  legend: { top: 0, data: [seriesNames.CUMULATIVE, cumulativeSampleSeriesName] },
  grid: { left: 18, right: 18, top: 54, bottom: 28, containLabel: true },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: trend.value.map((item) => formatSnapshotAxisDate(item.snapshotDate)),
    axisLabel: { hideOverlap: true }
  },
  yAxis: [
    {
      type: 'value',
      name: '成功率',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#e5e7eb' } }
    },
    {
      type: 'value',
      name: '股票数',
      minInterval: 1,
      splitLine: { show: false }
    }
  ],
  series: [
    {
      id: 'cumulative-sample-count',
      name: cumulativeSampleSeriesName,
      type: 'bar',
      yAxisIndex: 1,
      barMaxWidth: 22,
      cursor: 'pointer',
      itemStyle: { color: '#8b96a5', opacity: 0.55 },
      tooltip: { valueFormatter: (value) => `${value ?? '--'} 支` },
      data: trend.value.map((item) => item.sampleCount)
    },
    {
      id: 'cumulative-success-rate',
      name: seriesNames.CUMULATIVE,
      type: 'line',
      yAxisIndex: 0,
      smooth: true,
      showSymbol: true,
      symbolSize: 7,
      cursor: 'pointer',
      connectNulls: false,
      lineStyle: { width: 2, color: '#cf2e2e' },
      itemStyle: { color: '#cf2e2e' },
      tooltip: { valueFormatter: percentTooltipFormatter },
      data: trend.value.map((item) => item.winRate)
    }
  ]
}))

const compositionChartOptions = computed<EChartsOption>(() => ({
  legend: {
    top: 0,
    data: [compositionSeriesNames.WIN, compositionSeriesNames.LOSS, compositionSeriesNames.FLAT]
  },
  grid: { left: 18, right: 18, top: 54, bottom: 28, containLabel: true },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  xAxis: {
    type: 'category',
    data: trend.value.map((item) => formatSnapshotAxisDate(item.snapshotDate)),
    axisLabel: { hideOverlap: true }
  },
  yAxis: {
    type: 'value',
    name: '股票数',
    minInterval: 1,
    splitLine: { lineStyle: { color: '#e5e7eb' } }
  },
  series: [
    {
      id: 'daily-win-count',
      name: compositionSeriesNames.WIN,
      type: 'bar',
      stack: 'daily-result',
      cursor: 'pointer',
      itemStyle: { color: '#cf2e2e' },
      data: trend.value.map((item) => item.dailyWinCount)
    },
    {
      id: 'daily-loss-count',
      name: compositionSeriesNames.LOSS,
      type: 'bar',
      stack: 'daily-result',
      cursor: 'pointer',
      itemStyle: { color: '#16845b' },
      data: trend.value.map((item) => item.dailyLossCount)
    },
    {
      id: 'daily-flat-count',
      name: compositionSeriesNames.FLAT,
      type: 'bar',
      stack: 'daily-result',
      cursor: 'pointer',
      itemStyle: { color: '#8b96a5' },
      data: trend.value.map((item) => item.dailyFlatCount)
    }
  ]
}))

const loadTrend = async () => {
  selectedSnapshotDates.value = []
  snapshotTableRef.value?.clearSelection()
  loading.value = true
  try {
    allTrend.value = (await StockApi.getStatisticsSnapshotTrend()).sort((left, right) =>
      left.snapshotDate.localeCompare(right.snapshotDate)
    )
    trend.value = allTrend.value.filter(
      (item) =>
        (!query.beginDate || item.snapshotDate >= query.beginDate) &&
        (!query.endDate || item.snapshotDate <= query.endDate)
    )
  } finally {
    loading.value = false
  }
}

const applyDateRange = () => {
  query.beginDate = dateRange.value?.[0]
  query.endDate = dateRange.value?.[1]
}

const handleSearch = async () => {
  applyDateRange()
  await loadTrend()
}

const setQuickRange = async (days: 7 | 30) => {
  quickRange.value = days === 7 ? '7d' : '30d'
  dateRange.value = [
    dayjs()
      .subtract(days - 1, 'day')
      .format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD')
  ]
  await handleSearch()
}

const setAllRange = async () => {
  quickRange.value = 'all'
  await handleReset()
}

const handleDateRangeChange = () => {
  quickRange.value = dateRange.value ? 'custom' : 'all'
}

const handleReset = async () => {
  quickRange.value = 'all'
  dateRange.value = undefined
  query.beginDate = undefined
  query.endDate = undefined
  await loadTrend()
}

const handleRebuild = async () => {
  await message.confirm('确定按每只股票的跟踪起止日期重建当前用户的全部历史快照吗？')
  rebuildLoading.value = true
  try {
    const count = await StockApi.rebuildStatisticsSnapshots()
    message.success(`已重建 ${count} 个每日快照`)
    await loadTrend()
    capabilityRefreshKey.value += 1
  } finally {
    rebuildLoading.value = false
  }
}

const openSnapshotDetail = async (snapshotDate: string, statisticsType: StockStatisticsType) => {
  detailDate.value = snapshotDate
  detailType.value = statisticsType
  detailVisible.value = true
  detailLoading.value = true
  detailSort.value = { prop: '', order: null }
  detailKeyword.value = ''
  detailResultFilter.value = 'ALL'
  snapshotDetails.value = []
  try {
    snapshotDetails.value = await StockApi.getSnapshotDetails(snapshotDate, statisticsType)
  } finally {
    detailLoading.value = false
  }
}

const handleDetailSortChange = ({ prop, order }: DetailSort) => {
  detailSort.value = { prop: prop || '', order }
}

const handleTrendSortChange = ({ prop, order }: TrendSort) => {
  trendSort.value = { prop: prop || '', order }
}

const handleSnapshotSelectionChange = (rows: StockStatisticsSnapshotVO[]) => {
  selectedSnapshotDates.value = rows.map((row) => row.snapshotDate)
}

const clearSnapshotSelection = () => {
  selectedSnapshotDates.value = []
  snapshotTableRef.value?.clearSelection()
}

function compareNullable<T>(
  left: T | null | undefined,
  right: T | null | undefined,
  order: Exclude<SortOrder, null>,
  compare: (leftValue: T, rightValue: T) => number
) {
  if (left === null || left === undefined) return right === null || right === undefined ? 0 : 1
  if (right === null || right === undefined) return -1
  const result = compare(left, right)
  return order === 'ascending' ? result : -result
}

const compareText = (
  left: string | null | undefined,
  right: string | null | undefined,
  order: Exclude<SortOrder, null>
) => compareNullable(left, right, order, (a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))

const compareNumber = (
  left: number | null | undefined,
  right: number | null | undefined,
  order: Exclude<SortOrder, null>
) => compareNullable(left, right, order, (a, b) => a - b)

const compareDetailRows = (
  left: StockStatisticsSnapshotDetailVO,
  right: StockStatisticsSnapshotDetailVO,
  sort: DetailSort
) => {
  if (!sort.order) return 0
  if (sort.prop === 'name') return compareText(left.name, right.name, sort.order)
  if (sort.prop === 'symbol') return compareText(left.symbol, right.symbol, sort.order)
  if (sort.prop === 'trackingRange') {
    return (
      compareText(left.trackingStartDate, right.trackingStartDate, sort.order) ||
      compareText(left.trackingEndDate, right.trackingEndDate, sort.order)
    )
  }
  if (sort.prop === 'statisticsRange') {
    const primary = detailType.value === 'DAILY' ? 'lastTradeDate' : 'firstTradeDate'
    return (
      compareText(left[primary], right[primary], sort.order) ||
      compareText(left.lastTradeDate, right.lastTradeDate, sort.order)
    )
  }
  if (sort.prop === 'firstClosePrice') {
    return compareNumber(left.firstClosePrice, right.firstClosePrice, sort.order)
  }
  if (sort.prop === 'lastClosePrice') {
    return compareNumber(left.lastClosePrice, right.lastClosePrice, sort.order)
  }
  if (sort.prop === 'changePercent') {
    return compareNumber(left.changePercent, right.changePercent, sort.order)
  }
  if (sort.prop === 'result') {
    const resultOrder: Record<StockStatisticsResult, number> = { LOSS: -1, FLAT: 0, WIN: 1 }
    return compareNumber(resultOrder[left.result], resultOrder[right.result], sort.order)
  }
  return 0
}

const compareTrendRows = (
  left: StockStatisticsSnapshotVO,
  right: StockStatisticsSnapshotVO,
  sort: TrendSort
) => {
  if (!sort.order) return 0
  if (sort.prop === 'snapshotDate') {
    return compareText(left.snapshotDate, right.snapshotDate, sort.order)
  }
  if (sort.prop === 'trackingRange') {
    return (
      compareText(left.startDate, right.startDate, sort.order) ||
      compareText(left.endDate, right.endDate, sort.order)
    )
  }
  const numericProps = new Set([
    'dailyWinRate',
    'dailySampleCount',
    'dailyWinCount',
    'dailyLossCount',
    'dailyFlatCount',
    'winRate',
    'sampleCount',
    'winCount',
    'lossCount',
    'flatCount'
  ])
  if (numericProps.has(sort.prop)) {
    const leftValue = Reflect.get(left, sort.prop)
    const rightValue = Reflect.get(right, sort.prop)
    return compareNumber(
      typeof leftValue === 'number' ? leftValue : null,
      typeof rightValue === 'number' ? rightValue : null,
      sort.order
    )
  }
  return 0
}

const getClickedSnapshot = (event: ECElementEvent) => {
  if (event.componentType !== 'series' || typeof event.dataIndex !== 'number') return
  return trend.value[event.dataIndex]
}

const openRollingDetail = (snapshotDate: string, windowSize: 5 | 20) => {
  rollingEndDate.value = snapshotDate
  rollingWindow.value = windowSize
  rollingVisible.value = true
}

const openRollingDailyDetail = async (snapshotDate: string) => {
  rollingVisible.value = false
  await nextTick()
  await openSnapshotDetail(snapshotDate, 'DAILY')
}

const handleShortTermChartClick = (event: ECElementEvent) => {
  const snapshot = getClickedSnapshot(event)
  if (!snapshot) return
  if (event.seriesName === seriesNames.DAILY) {
    if (snapshot.dailyWinRate !== null && snapshot.dailyWinRate !== undefined) {
      openSnapshotDetail(snapshot.snapshotDate, 'DAILY')
    }
    return
  }
  if (event.seriesName === rollingSeriesNames[5]) {
    openRollingDetail(snapshot.snapshotDate, 5)
  } else if (event.seriesName === rollingSeriesNames[20]) {
    openRollingDetail(snapshot.snapshotDate, 20)
  }
}

const handleLongTermChartClick = (event: ECElementEvent) => {
  const snapshot = getClickedSnapshot(event)
  if (!snapshot || snapshot.sampleCount === 0) return
  openSnapshotDetail(snapshot.snapshotDate, 'CUMULATIVE')
}

const handleCompositionChartClick = (event: ECElementEvent) => {
  const snapshot = getClickedSnapshot(event)
  if (!snapshot || snapshot.dailySampleCount === 0) return
  openSnapshotDetail(snapshot.snapshotDate, 'DAILY')
}

const handleRebuildDate = async (snapshotDate: string) => {
  await message.confirm(`确定重建 ${snapshotDate} 的综合统计快照吗？其他日期不会被修改。`)
  rebuildDateLoading.value = snapshotDate
  try {
    await StockApi.rebuildSnapshotDate(snapshotDate)
    message.success(`${snapshotDate} 快照已重建`)
    await loadTrend()
    capabilityRefreshKey.value += 1
    await openSnapshotDetail(snapshotDate, detailType.value)
  } finally {
    rebuildDateLoading.value = undefined
  }
}

const handleBatchRebuild = async () => {
  const snapshotDates = [...selectedSnapshotDates.value].sort()
  if (snapshotDates.length === 0) return
  await message.confirm(
    `确认批量重建选中的 ${snapshotDates.length} 个每日快照吗？其他日期不会被修改。`
  )
  batchRebuildLoading.value = true
  try {
    const result = await StockApi.rebuildStatisticsSnapshotsBatch({ snapshotDates })
    message.success(
      `批量重建完成：重建 ${result.rebuiltCount} 个，跳过非交易日 ${result.skippedCount} 个`
    )
    const shouldRefreshDetail =
      detailVisible.value && Boolean(detailDate.value) && snapshotDates.includes(detailDate.value)
    await loadTrend()
    capabilityRefreshKey.value += 1
    if (shouldRefreshDetail) await openSnapshotDetail(detailDate.value, detailType.value)
  } finally {
    batchRebuildLoading.value = false
  }
}

watch([snapshotKeyword, snapshotResultFilter], clearSnapshotSelection)

const formatPercent = (value?: number | null) =>
  value === undefined || value === null ? '--' : `${value.toFixed(2)}%`

const formatPercentagePoint = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : `${value > 0 ? '+' : ''}${value.toFixed(2)} 个百分点`

const formatPrice = (value?: number | null) =>
  value === undefined || value === null ? '--' : value.toFixed(2)

const formatDateRange = (snapshot?: StockStatisticsSnapshotVO) => {
  if (!snapshot?.startDate || !snapshot.endDate) return '--'
  return `${snapshot.startDate} 至 ${snapshot.endDate}`
}

const formatRollingRange = (metric: RollingMetric) => {
  if (!metric.startDate || !metric.endDate) return '--'
  return `${metric.startDate} 至 ${metric.endDate}`
}

const changeClass = (value?: number | null) => {
  if (value === undefined || value === null || value === 0) return 'price-flat'
  return value > 0 ? 'price-up' : 'price-down'
}

const resultTagType = (result: StockStatisticsResult) => {
  if (result === 'WIN') return 'danger'
  if (result === 'LOSS') return 'success'
  return 'info'
}

onMounted(loadTrend)
</script>

<style scoped>
.workspace-heading,
.query-band,
.snapshot-meta,
.section-heading,
.trend-current,
.detail-filters,
.selection-bar,
.selection-bar__summary,
.selection-bar__actions,
.row-actions,
.dialog-toolbar,
.detail-overview,
.rolling-overview {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.workspace-heading,
.section-heading,
.selection-bar,
.dialog-toolbar {
  justify-content: space-between;
}

.workspace-heading {
  gap: 16px;
}

.workspace-heading__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.workspace-heading__meta {
  margin-top: 3px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.query-band {
  gap: 10px;
  padding: 14px 0;
  margin-top: 14px;
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.quick-range {
  flex: none;
}

.date-range-picker {
  width: 320px;
}

.snapshot-meta {
  gap: 14px;
  margin: 12px 0 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.horizon-band {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}

.horizon-metric {
  display: flex;
  min-width: 0;
  min-height: 94px;
  padding: 14px 16px;
  flex-direction: column;
  justify-content: center;
  border-left: 1px solid var(--el-border-color-lighter);
}

.horizon-metric:first-child {
  border-left: 0;
}

.horizon-metric__label,
.horizon-metric__meta {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.horizon-metric__label {
  margin-bottom: 5px;
  font-size: 12px;
}

.horizon-metric strong {
  overflow: hidden;
  font-size: 22px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.horizon-metric__meta {
  margin-top: 5px;
  font-size: 11px;
}

.metric-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}

.metric-group {
  min-width: 0;
  padding: 15px 16px 16px;
}

.metric-group + .metric-group {
  border-left: 1px solid var(--el-border-color-light);
}

.metric-group--daily {
  box-shadow: inset 3px 0 #2563eb;
}

.metric-group--cumulative {
  box-shadow: inset 3px 0 #cf2e2e;
}

.metric-group__heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 13px;
}

.metric-group__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.metric-group__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.metric-grid {
  display: grid;
  grid-template-columns: 1.35fr repeat(4, minmax(58px, 1fr));
  align-items: end;
}

.metric-item {
  display: flex;
  min-width: 0;
  min-height: 48px;
  padding: 0 12px;
  flex-direction: column;
  justify-content: flex-end;
  border-left: 1px solid var(--el-border-color-lighter);
}

.metric-item:first-child {
  padding-left: 0;
  border-left: 0;
}

.metric-item__label {
  margin-bottom: 5px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.metric-item strong {
  overflow: hidden;
  font-size: 18px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.metric-item--primary strong {
  font-size: 26px;
}

.section-heading {
  min-height: 32px;
  justify-content: space-between;
  margin-bottom: 12px;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.analysis-panel {
  min-width: 0;
  padding-right: 20px;
}

.analysis-panel + .analysis-panel {
  padding-right: 0;
  padding-left: 20px;
  border-left: 1px solid var(--el-border-color-lighter);
}

.section-heading__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.section-heading__meta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.trend-current {
  gap: 14px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.trend-current strong {
  margin-left: 3px;
  font-size: 15px;
}

.detail-filters {
  gap: 8px;
}

.snapshot-search,
.detail-search {
  width: 210px;
}

.result-filter {
  width: 128px;
}

.selection-bar {
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 12px;
  color: var(--el-color-primary-dark-2);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 4px;
}

.selection-bar__summary,
.selection-bar__actions,
.row-actions,
.detail-overview {
  gap: 8px;
}

.row-actions {
  justify-content: center;
  flex-wrap: nowrap;
}

.row-actions .el-button {
  width: 28px;
  height: 28px;
  padding: 0;
  margin-left: 0;
}

.dialog-toolbar {
  gap: 12px;
  padding-bottom: 12px;
}

.detail-overview {
  gap: 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.detail-overview strong {
  margin-left: 3px;
  font-size: 15px;
}

.rolling-overview {
  gap: 18px;
  padding: 0 0 14px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.rolling-overview strong {
  margin-left: 3px;
  font-size: 15px;
}

.chart-area {
  min-height: 360px;
}

.chart-area--compact {
  min-height: 320px;
}

.price-up {
  color: #cf2e2e;
  font-variant-numeric: tabular-nums;
}

.price-down {
  color: #16845b;
  font-variant-numeric: tabular-nums;
}

.price-flat {
  color: var(--el-text-color-regular);
  font-variant-numeric: tabular-nums;
}

@media (width <= 720px) {
  .workspace-heading,
  .query-band,
  .section-heading,
  .dialog-toolbar {
    align-items: stretch;
  }

  .workspace-heading > .el-button,
  .query-band > .el-button:not(.is-circle),
  .date-range-picker,
  .detail-filters,
  .snapshot-search,
  .detail-search,
  .result-filter {
    width: 100%;
  }

  .query-band .el-button,
  .selection-bar .el-button {
    margin-left: 0;
  }

  .quick-range {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
  }

  .quick-range .el-button {
    width: 100%;
    margin-left: 0;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 0;
  }

  .horizon-band {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .horizon-metric {
    min-height: 86px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .horizon-metric:nth-child(odd) {
    border-left: 0;
  }

  .horizon-metric:nth-child(-n + 2) {
    border-top: 0;
  }

  .horizon-metric:last-child {
    grid-column: span 2;
  }

  .metric-item {
    padding: 0 10px;
  }

  .metric-item--primary {
    grid-column: span 2;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .metric-item:nth-child(2),
  .metric-item:nth-child(4) {
    padding-left: 0;
    border-left: 0;
  }

  .trend-current,
  .detail-filters,
  .selection-bar__actions {
    width: 100%;
  }

  .selection-bar__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-filters {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (width <= 980px) {
  .analysis-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .analysis-panel {
    padding-right: 0;
  }

  .analysis-panel + .analysis-panel {
    padding-top: 20px;
    padding-left: 0;
    margin-top: 20px;
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 0;
  }

  .metric-groups {
    grid-template-columns: minmax(0, 1fr);
  }

  .metric-group + .metric-group {
    border-top: 1px solid var(--el-border-color-light);
    border-left: 0;
  }
}
</style>
