<template>
  <el-drawer v-model="visible" size="86%" destroy-on-close class="stock-detail-drawer">
    <template #header>
      <div v-if="track" class="drawer-title">
        <div>
          <div class="drawer-title__name">{{ track.name }}</div>
          <div class="drawer-title__meta"
            >{{ track.symbol }} · {{ marketLabels[track.market] }}</div
          >
        </div>
        <el-tag effect="plain">跟踪编号 {{ track.id }}</el-tag>
      </div>
    </template>

    <el-tabs v-if="track" v-model="activeTab" class="detail-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="手工记录" name="manual">
        <div class="tracking-period" :class="`tracking-period--${trackingStatus.key}`">
          <div class="tracking-period__summary">
            <div class="tracking-period__state">
              <span class="tracking-period__state-icon">
                <Icon :icon="trackingStatus.icon" />
              </span>
              <div>
                <div class="tracking-period__eyebrow">当前跟踪状态</div>
                <el-tag :type="trackingStatus.type" effect="dark" round>
                  {{ trackingStatus.label }}
                </el-tag>
              </div>
            </div>
            <div class="tracking-period__dates">
              <div class="tracking-period__date">
                <span>开始跟踪</span>
                <strong>{{ track.trackingStartDate || '未设置' }}</strong>
              </div>
              <Icon icon="ep:right" class="tracking-period__arrow" />
              <div class="tracking-period__date">
                <span>结束跟踪</span>
                <strong>{{ track.trackingEndDate || '持续跟踪' }}</strong>
              </div>
            </div>
          </div>
          <div class="tracking-period__controls">
            <el-date-picker
              v-model="trackingPeriodForm.trackingStartDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="开始日期"
              clearable
              :disabled-date="disableTrackingStartDate"
            />
            <span class="tracking-period__separator">至</span>
            <el-date-picker
              v-model="trackingPeriodForm.trackingEndDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="持续跟踪"
              clearable
              :disabled-date="disableTrackingEndDate"
            />
            <el-button
              type="primary"
              :loading="trackingPeriodLoading"
              :disabled="
                Boolean(!trackingPeriodForm.trackingStartDate && trackingPeriodForm.trackingEndDate)
              "
              v-hasPermi="['finance:stock-track:update']"
              @click="saveTrackingPeriod"
            >
              <Icon icon="ep:check" class="mr-5px" />
              保存日期
            </el-button>
            <el-button
              type="danger"
              plain
              :loading="trackingPeriodLoading"
              :disabled="!track.trackingStartDate && !track.trackingEndDate"
              v-hasPermi="['finance:stock-track:update']"
              @click="clearTrackingPeriod"
            >
              <Icon icon="ep:circle-close" class="mr-5px" />
              清空日期
            </el-button>
          </div>
        </div>
        <div class="section-heading">
          <div>
            <el-tag type="info" effect="plain">手工录入</el-tag>
            <span class="section-hint">本页数据由当前用户维护</span>
          </div>
          <div class="section-actions">
            <el-button v-hasPermi="['finance:stock-daily-price:create']" @click="openHistoryImport">
              <Icon icon="ep:download" class="mr-5px" />
              导入历史行情
            </el-button>
            <el-button
              type="primary"
              v-hasPermi="['finance:stock-daily-price:create']"
              @click="openDailyPriceForm('create')"
            >
              <Icon icon="ep:plus" class="mr-5px" />
              新增记录
            </el-button>
            <el-tooltip content="刷新手工记录" placement="top">
              <el-button
                circle
                aria-label="刷新手工记录"
                :loading="dailyLoading"
                @click="loadDailyPrices"
              >
                <Icon icon="ep:refresh" />
              </el-button>
            </el-tooltip>
          </div>
        </div>
        <el-table
          v-loading="dailyLoading"
          :data="dailyPrices"
          stripe
          table-layout="fixed"
          empty-text="暂无手工价格记录"
        >
          <el-table-column label="交易日期" prop="tradeDate" min-width="120" />
          <el-table-column label="开盘" min-width="120" align="right">
            <template #default="{ row }">{{ formatPrice(row.openPrice) }}</template>
          </el-table-column>
          <el-table-column label="收盘" min-width="120" align="right">
            <template #default="{ row }">{{ formatPrice(row.closePrice) }}</template>
          </el-table-column>
          <el-table-column label="当日涨幅" min-width="112" align="right">
            <template #default="{ row }">
              <span :class="changeClass(row.dailyChangePercent)">
                {{ formatPercent(row.dailyChangePercent) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="最高" min-width="120" align="right">
            <template #default="{ row }">{{ formatPrice(row.highPrice) }}</template>
          </el-table-column>
          <el-table-column label="最低" min-width="120" align="right">
            <template #default="{ row }">{{ formatPrice(row.lowPrice) }}</template>
          </el-table-column>
          <el-table-column label="成交量（手）" min-width="140" align="right">
            <template #default="{ row }">{{ formatVolume(row.volume) }}</template>
          </el-table-column>
          <el-table-column label="来源" min-width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="dailyPriceSourceTypes[row.source]" effect="plain">
                {{ dailyPriceSourceLabels[row.source] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="168">
            <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="96" align="center" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-tooltip content="编辑手工记录" placement="top">
                  <el-button
                    link
                    type="primary"
                    aria-label="编辑手工记录"
                    v-hasPermi="['finance:stock-daily-price:update']"
                    @click="openDailyPriceForm('update', row)"
                  >
                    <Icon icon="ep:edit" />
                  </el-button>
                </el-tooltip>
                <el-tooltip content="删除手工记录" placement="top">
                  <el-button
                    link
                    type="danger"
                    aria-label="删除手工记录"
                    v-hasPermi="['finance:stock-daily-price:delete']"
                    @click="deleteDailyPrice(row)"
                  >
                    <Icon icon="ep:delete" />
                  </el-button>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <Pagination
          v-show="dailyTotal > 0"
          v-model:page="dailyQuery.pageNo"
          v-model:limit="dailyQuery.pageSize"
          :total="dailyTotal"
          @pagination="loadDailyPrices"
        />
      </el-tab-pane>

      <el-tab-pane label="K 线" name="kline">
        <div class="kline-toolbar">
          <el-date-picker
            v-model="chartDateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            range-separator="至"
            clearable
          />
          <el-button type="primary" :loading="chartLoading" @click="loadChart">
            <Icon icon="ep:search" class="mr-5px" />
            查询
          </el-button>
          <el-button :disabled="!chartDateRange" @click="resetChartRange">
            <Icon icon="ep:refresh-left" class="mr-5px" />
            重置
          </el-button>
        </div>
        <div v-loading="chartLoading" class="kline-chart-area">
          <StockTechnicalAnalysisChart v-if="chartPrices.length > 0" :data="chartPrices" />
          <el-empty v-else description="暂无本地 K 线数据" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="行情" name="quote">
        <MarketResultHeader
          label="外部行情"
          :result="quoteResult"
          :loading="quoteLoading"
          @refresh="loadQuote"
        />
        <el-empty v-if="!quoteResult?.data" :description="resultMessage(quoteResult)" />
        <el-descriptions v-else :column="3" border class="detail-descriptions">
          <el-descriptions-item label="最新价">
            <span :class="changeClass(quoteResult.data.changeAmount)">
              {{ formatPrice(quoteResult.data.latestPrice) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="涨跌额">
            <span :class="changeClass(quoteResult.data.changeAmount)">
              {{ formatSigned(quoteResult.data.changeAmount, 4) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="涨跌幅">
            <span :class="changeClass(quoteResult.data.changePercent)">
              {{ formatPercent(quoteResult.data.changePercent) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="开盘">{{
            formatPrice(quoteResult.data.openPrice)
          }}</el-descriptions-item>
          <el-descriptions-item label="最高">{{
            formatPrice(quoteResult.data.highPrice)
          }}</el-descriptions-item>
          <el-descriptions-item label="最低">{{
            formatPrice(quoteResult.data.lowPrice)
          }}</el-descriptions-item>
          <el-descriptions-item label="前收">{{
            formatPrice(quoteResult.data.previousClosePrice)
          }}</el-descriptions-item>
          <el-descriptions-item label="交易状态">
            {{ tradingStatusLabels[quoteResult.data.tradingStatus] }}
          </el-descriptions-item>
          <el-descriptions-item label="数据时间">
            {{ formatDateTime(quoteResult.data.dataTime) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-tab-pane>

      <el-tab-pane label="资讯公告" name="information">
        <div class="section-heading">
          <div class="information-filters">
            <el-segmented
              v-model="informationType"
              :options="informationOptions"
              @change="handleInformationTypeChange"
            />
            <el-input
              v-model="informationQuery.keyword"
              clearable
              placeholder="搜索标题、来源或摘要"
              @keyup.enter="handleInformationSearch"
              @clear="handleInformationSearch"
            >
              <template #prefix><Icon icon="ep:search" /></template>
            </el-input>
          </div>
          <div class="section-actions">
            <span class="section-hint">
              {{ informationResult?.data?.total ?? 0 }} 条 · 最近同步
              {{ formatDateTime(informationResult?.fetchedAt) }}
            </span>
            <el-tooltip content="从行情源增量同步当前股票" placement="top">
              <el-button
                circle
                aria-label="同步资讯公告"
                :loading="informationSyncing"
                @click="syncInformation"
              >
                <Icon icon="ep:refresh" />
              </el-button>
            </el-tooltip>
          </div>
        </div>
        <MarketResultMeta :result="informationResult" label="本地同步资讯" />
        <el-table
          v-loading="informationLoading"
          :data="informationResult?.data?.list ?? []"
          stripe
          table-layout="fixed"
          empty-text="暂无资讯或公告"
        >
          <el-table-column label="发布时间" min-width="168">
            <template #default="{ row }">{{ formatDateTime(row.publishedAt) }}</template>
          </el-table-column>
          <el-table-column label="来源" prop="source" min-width="120" />
          <el-table-column label="类型" min-width="120">
            <template #default="{ row }">
              {{ row.announcementType || informationTypeLabels[row.type] }}
            </template>
          </el-table-column>
          <el-table-column label="标题" min-width="340" show-overflow-tooltip>
            <template #default="{ row }">
              <el-link :href="row.url" target="_blank" type="primary" :underline="false">
                {{ row.title }}
              </el-link>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="(informationResult?.data?.total ?? 0) > 0" class="information-pagination">
          <el-pagination
            v-model:current-page="informationQuery.pageNo"
            v-model:page-size="informationQuery.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="informationResult?.data?.total ?? 0"
            layout="total, sizes, prev, pager, next"
            background
            @size-change="handleInformationPageSizeChange"
            @current-change="loadInformation"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="研报" name="reports">
        <MarketResultHeader
          label="外部研报"
          :result="reportResult"
          :loading="reportLoading"
          @refresh="loadReports"
        />
        <el-table
          v-loading="reportLoading"
          :data="reportResult?.data?.list ?? []"
          stripe
          table-layout="fixed"
          empty-text="暂无研报"
        >
          <el-table-column label="报告日期" prop="reportDate" min-width="120" />
          <el-table-column label="机构" prop="institution" min-width="140" />
          <el-table-column label="评级" min-width="100">
            <template #default="{ row }">{{ row.rating || '--' }}</template>
          </el-table-column>
          <el-table-column label="作者" min-width="120">
            <template #default="{ row }">{{ row.author || '--' }}</template>
          </el-table-column>
          <el-table-column label="标题" min-width="340" show-overflow-tooltip>
            <template #default="{ row }">
              <el-link :href="row.url" target="_blank" type="primary" :underline="false">
                {{ row.title }}
              </el-link>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="基本面" name="fundamental">
        <MarketResultHeader
          label="外部基本面"
          :result="fundamentalResult"
          :loading="fundamentalLoading"
          @refresh="loadFundamental"
        />
        <el-empty v-if="!fundamentalResult?.data" :description="resultMessage(fundamentalResult)" />
        <el-tabs v-else v-model="fundamentalSubTab" class="fundamental-tabs">
          <el-tab-pane label="概览" name="overview">
            <el-descriptions :column="3" border class="detail-descriptions">
              <el-descriptions-item label="总市值">
                {{ formatLargeAmount(fundamentalResult.data.totalMarketValue) }}
              </el-descriptions-item>
              <el-descriptions-item label="流通市值">
                {{ formatLargeAmount(fundamentalResult.data.circulatingMarketValue) }}
              </el-descriptions-item>
              <el-descriptions-item label="市盈率 TTM">
                <span :class="{ 'loss-value': fundamentalResult.data.lossMaking }">
                  {{ formatNullable(fundamentalResult.data.peTtm) }}
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="营业收入">
                {{ formatLargeAmount(fundamentalResult.data.revenue) }}
              </el-descriptions-item>
              <el-descriptions-item label="营收同比">
                {{ formatPercent(fundamentalResult.data.revenueYearOnYear) }}
              </el-descriptions-item>
              <el-descriptions-item label="归母净利润">
                {{ formatLargeAmount(fundamentalResult.data.netProfit) }}
              </el-descriptions-item>
              <el-descriptions-item label="净利润同比">
                {{ formatPercent(fundamentalResult.data.netProfitYearOnYear) }}
              </el-descriptions-item>
              <el-descriptions-item label="报告期">
                {{ fundamentalResult.data.reportPeriod || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="报告类型">
                {{ fundamentalResult.data.reportType || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="股东人数">
                {{ formatInteger(fundamentalResult.data.shareholderCount) }}
              </el-descriptions-item>
              <el-descriptions-item label="股东人数变化">
                {{ formatPercent(fundamentalResult.data.shareholderChangePercent) }}
              </el-descriptions-item>
              <el-descriptions-item label="统计日期">
                {{ fundamentalResult.data.shareholderStatisticsDate || '--' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          <el-tab-pane label="业绩详情" name="performance">
            <FundamentalPerformanceChart :data="fundamentalResult.data.performances ?? []" />
            <el-table
              :data="fundamentalResult.data.performances ?? []"
              stripe
              table-layout="fixed"
              max-height="520"
              empty-text="暂无业绩数据"
            >
              <el-table-column prop="reportPeriod" label="报告期" width="118" fixed />
              <el-table-column prop="reportType" label="报告类型" min-width="130" />
              <el-table-column label="营业收入" width="142" align="right">
                <template #default="{ row }">{{ formatLargeAmount(row.revenue) }}</template>
              </el-table-column>
              <el-table-column label="营收同比" width="112" align="right">
                <template #default="{ row }">{{ formatPercent(row.revenueYearOnYear) }}</template>
              </el-table-column>
              <el-table-column label="营收环比" width="112" align="right">
                <template #default="{ row }">
                  {{ formatPercent(row.revenueQuarterOnQuarter) }}
                </template>
              </el-table-column>
              <el-table-column label="归母净利润" width="142" align="right">
                <template #default="{ row }">{{ formatLargeAmount(row.netProfit) }}</template>
              </el-table-column>
              <el-table-column label="净利润同比" width="120" align="right">
                <template #default="{ row }">{{ formatPercent(row.netProfitYearOnYear) }}</template>
              </el-table-column>
              <el-table-column label="净利润环比" width="120" align="right">
                <template #default="{ row }">
                  {{ formatPercent(row.netProfitQuarterOnQuarter) }}
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="股东人数" name="shareholder-count">
            <ShareholderCountChart :data="fundamentalResult.data.shareholderCounts ?? []" />
            <el-table
              :data="fundamentalResult.data.shareholderCounts ?? []"
              stripe
              table-layout="fixed"
              max-height="520"
              empty-text="暂无股东人数数据"
            >
              <el-table-column prop="statisticsDate" label="统计日期" width="140" />
              <el-table-column label="股东人数" width="160" align="right">
                <template #default="{ row }">{{ formatInteger(row.shareholderCount) }}</template>
              </el-table-column>
              <el-table-column label="较上期变化" width="160" align="right">
                <template #default="{ row }">{{ formatPercent(row.changePercent) }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="十大股东" name="top-shareholders">
            <el-table
              :data="fundamentalResult.data.topShareholders ?? []"
              stripe
              table-layout="fixed"
              max-height="520"
              empty-text="暂无十大股东数据"
            >
              <el-table-column prop="rank" label="排名" width="72" align="center" fixed />
              <el-table-column
                prop="shareholderName"
                label="股东名称"
                min-width="240"
                show-overflow-tooltip
              />
              <el-table-column prop="shareholderNature" label="股东性质" width="130">
                <template #default="{ row }">{{ row.shareholderNature || '--' }}</template>
              </el-table-column>
              <el-table-column label="持股数量" width="150" align="right">
                <template #default="{ row }">{{ formatInteger(row.holdingShares) }}</template>
              </el-table-column>
              <el-table-column label="持股比例" width="112" align="right">
                <template #default="{ row }">{{ formatPercent(row.holdingRatio) }}</template>
              </el-table-column>
              <el-table-column label="持股变化" width="140" align="right">
                <template #default="{ row }">
                  {{ row.holdingChangeDescription || formatInteger(row.holdingChangeShares) }}
                </template>
              </el-table-column>
              <el-table-column label="变化比例" width="112" align="right">
                <template #default="{ row }">
                  {{ formatPercent(row.holdingChangePercent) }}
                </template>
              </el-table-column>
              <el-table-column prop="reportPeriod" label="报告期" width="118" />
              <el-table-column prop="sharesType" label="股份类型" width="120">
                <template #default="{ row }">{{ row.sharesType || '--' }}</template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>
    </el-tabs>

    <el-alert
      class="drawer-disclaimer"
      type="warning"
      :closable="false"
      show-icon
      title="数据仅供参考，不构成投资建议。外部数据可能存在延迟、缓存或暂不可用状态。"
    />
    <DailyPriceForm ref="dailyPriceFormRef" @success="handleDailyPriceChanged" />
    <HistoryImportDialog ref="historyImportDialogRef" @success="handleDailyPriceChanged" />
  </el-drawer>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import {
  FinanceMarket,
  MarketDataResult,
  PagedResult,
  StockApi,
  StockDailyPriceSource,
  StockDailyPriceVO,
  StockFundamentalVO,
  StockInformationLocalVO,
  StockInformationType,
  StockQuoteVO,
  StockResearchReportVO,
  StockTradingStatus,
  StockTrackVO
} from '@/api/finance/stock'
import DailyPriceForm from './DailyPriceForm.vue'
import FundamentalPerformanceChart from './FundamentalPerformanceChart.vue'
import HistoryImportDialog from './HistoryImportDialog.vue'
import MarketResultHeader from './MarketResultHeader.vue'
import MarketResultMeta from './MarketResultMeta.vue'
import ShareholderCountChart from './ShareholderCountChart.vue'
import StockTechnicalAnalysisChart from './StockTechnicalAnalysisChart.vue'

defineOptions({ name: 'FinanceStockDetailDrawer' })

type DetailTab = 'manual' | 'kline' | 'quote' | 'information' | 'reports' | 'fundamental'
type DailyPriceFormType = 'create' | 'update'
type ChartDateRange = [string, string]

const message = useMessage()
const visible = ref(false)
const activeTab = ref<DetailTab>('manual')
const track = ref<StockTrackVO>()
const dailyPriceFormRef = ref<InstanceType<typeof DailyPriceForm>>()
const historyImportDialogRef = ref<InstanceType<typeof HistoryImportDialog>>()
const emit = defineEmits<{
  changed: []
}>()

const dailyLoading = ref(false)
const dailyPrices = ref<StockDailyPriceVO[]>([])
const dailyTotal = ref(0)
const dailyQuery = reactive({ pageNo: 1, pageSize: 10 })
const trackingPeriodLoading = ref(false)
const trackingPeriodForm = reactive({
  trackingStartDate: undefined as string | undefined,
  trackingEndDate: undefined as string | undefined
})
const trackingStatus = computed(() => {
  if (!track.value?.trackingStartDate) {
    return { key: 'pending', label: '未开始跟踪', icon: 'ep:clock', type: 'info' as const }
  }
  if (track.value.trackingEndDate) {
    return {
      key: 'ended',
      label: '已结束跟踪',
      icon: 'ep:circle-check',
      type: 'warning' as const
    }
  }
  return {
    key: 'active',
    label: '持续跟踪',
    icon: 'ep:trend-charts',
    type: 'success' as const
  }
})
const chartLoading = ref(false)
const chartDateRange = ref<ChartDateRange>()
const chartPrices = ref<StockDailyPriceVO[]>([])

const quoteLoading = ref(false)
const quoteResult = ref<MarketDataResult<StockQuoteVO>>()
const informationLoading = ref(false)
const informationSyncing = ref(false)
const informationType = ref<StockInformationType>('NEWS')
const informationResult = ref<MarketDataResult<PagedResult<StockInformationLocalVO>>>()
const informationQuery = reactive({ pageNo: 1, pageSize: 20, keyword: '' })
let informationRequestVersion = 0
const reportLoading = ref(false)
const reportResult = ref<MarketDataResult<PagedResult<StockResearchReportVO>>>()
const fundamentalLoading = ref(false)
const fundamentalResult = ref<MarketDataResult<StockFundamentalVO>>()
const fundamentalSubTab = ref('overview')

const informationOptions = [
  { label: '新闻', value: 'NEWS' },
  { label: '公告', value: 'ANNOUNCEMENT' }
]

const informationTypeLabels: Record<StockInformationType, string> = {
  NEWS: '新闻',
  ANNOUNCEMENT: '公告'
}

const dailyPriceSourceLabels: Record<StockDailyPriceSource, string> = {
  MANUAL: '手工录入',
  EASTMONEY: '东方财富',
  TENCENT: '腾讯行情'
}

const dailyPriceSourceTypes: Record<StockDailyPriceSource, 'info' | 'warning' | 'success'> = {
  MANUAL: 'info',
  EASTMONEY: 'warning',
  TENCENT: 'success'
}

const marketLabels: Record<FinanceMarket, string> = {
  SSE: '上海证券交易所',
  SZSE: '深圳证券交易所',
  BSE: '北京证券交易所'
}

const tradingStatusLabels: Record<StockTradingStatus, string> = {
  TRADING: '交易中',
  CLOSED: '已收盘',
  SUSPENDED: '停牌',
  NOT_OPEN: '未开盘',
  UNAVAILABLE: '不可用'
}

const unavailableResult = <T,>(message: string): MarketDataResult<T> => ({
  status: 'UNAVAILABLE',
  provider: null,
  sourceTime: null,
  fetchedAt: new Date().toISOString(),
  data: null,
  message
})

const loadDailyPrices = async () => {
  if (!track.value) return
  dailyLoading.value = true
  try {
    const data = await StockApi.getDailyPricePage({
      trackId: track.value.id,
      pageNo: dailyQuery.pageNo,
      pageSize: dailyQuery.pageSize
    })
    dailyPrices.value = data.list
    dailyTotal.value = data.total
  } finally {
    dailyLoading.value = false
  }
}

const loadChart = async () => {
  if (!track.value) return
  chartLoading.value = true
  try {
    chartPrices.value = await StockApi.getChartList({
      trackId: track.value.id,
      beginDate: chartDateRange.value?.[0],
      endDate: chartDateRange.value?.[1]
    })
  } finally {
    chartLoading.value = false
  }
}

const resetChartRange = async () => {
  chartDateRange.value = undefined
  await loadChart()
}

const handleTabChange = (name: string | number) => {
  if (name === 'kline' && chartPrices.value.length === 0) loadChart()
}

const disableTrackingStartDate = (date: Date) => dayjs(date).isAfter(dayjs(), 'day')

const disableTrackingEndDate = (date: Date) =>
  !trackingPeriodForm.trackingStartDate ||
  disableTrackingStartDate(date) ||
  dayjs(date).isBefore(dayjs(trackingPeriodForm.trackingStartDate), 'day')

watch(
  () => trackingPeriodForm.trackingStartDate,
  (value) => {
    if (!value) trackingPeriodForm.trackingEndDate = undefined
  }
)

const saveTrackingPeriod = async () => {
  if (!track.value) return
  if (!trackingPeriodForm.trackingStartDate && trackingPeriodForm.trackingEndDate) {
    message.warning('设置结束日期前必须先选择开始日期')
    return
  }
  if (
    trackingPeriodForm.trackingEndDate &&
    dayjs(trackingPeriodForm.trackingEndDate).isBefore(trackingPeriodForm.trackingStartDate, 'day')
  ) {
    message.warning('结束日期不能早于开始日期')
    return
  }
  trackingPeriodLoading.value = true
  try {
    await StockApi.updateTrackingPeriod({
      id: track.value.id,
      trackingStartDate: trackingPeriodForm.trackingStartDate || null,
      trackingEndDate: trackingPeriodForm.trackingEndDate || null
    })
    track.value.trackingStartDate = trackingPeriodForm.trackingStartDate || null
    track.value.trackingEndDate = trackingPeriodForm.trackingEndDate || null
    message.success(trackingPeriodForm.trackingStartDate ? '跟踪日期已更新' : '跟踪日期已清空')
    emit('changed')
  } finally {
    trackingPeriodLoading.value = false
  }
}

const clearTrackingPeriod = async () => {
  if (!track.value) return
  await message.confirm('确认清空该股票的跟踪日期吗？清空后将不再参与成功率统计。')
  trackingPeriodLoading.value = true
  try {
    await StockApi.updateTrackingPeriod({
      id: track.value.id,
      trackingStartDate: null,
      trackingEndDate: null
    })
    track.value.trackingStartDate = null
    track.value.trackingEndDate = null
    trackingPeriodForm.trackingStartDate = undefined
    trackingPeriodForm.trackingEndDate = undefined
    message.success('跟踪日期已清空')
    emit('changed')
  } finally {
    trackingPeriodLoading.value = false
  }
}

const openDailyPriceForm = (type: DailyPriceFormType, record?: StockDailyPriceVO) => {
  if (!track.value) return
  dailyPriceFormRef.value?.open(type, track.value.id, record)
}

const openHistoryImport = () => {
  if (!track.value) return
  historyImportDialogRef.value?.open(track.value)
}

const handleDailyPriceChanged = async () => {
  dailyQuery.pageNo = 1
  await Promise.all([loadDailyPrices(), loadChart()])
  emit('changed')
}

const deleteDailyPrice = async (record: StockDailyPriceVO) => {
  await message.delConfirm(`确定删除 ${record.tradeDate} 的手工价格记录吗？`)
  await StockApi.deleteDailyPrice(record.id)
  message.success('每日价格已删除')
  await handleDailyPriceChanged()
}

const loadQuote = async () => {
  if (!track.value) return
  quoteLoading.value = true
  try {
    quoteResult.value = await StockApi.getQuote(track.value.id)
  } catch {
    quoteResult.value = unavailableResult('行情加载失败')
  } finally {
    quoteLoading.value = false
  }
}

const loadInformation = async () => {
  if (!track.value) return
  const currentVersion = ++informationRequestVersion
  informationLoading.value = true
  try {
    const nextResult = await StockApi.getLocalInformationPage({
      trackId: track.value.id,
      type: informationType.value,
      keyword: informationQuery.keyword.trim() || undefined,
      pageNo: informationQuery.pageNo,
      pageSize: informationQuery.pageSize
    })
    if (currentVersion === informationRequestVersion) {
      informationResult.value = nextResult
    }
  } catch {
    if (currentVersion === informationRequestVersion) {
      if (!informationResult.value) {
        informationResult.value = unavailableResult('本地资讯加载失败')
      }
      message.error('本地资讯加载失败，已保留当前结果')
    }
  } finally {
    if (currentVersion === informationRequestVersion) {
      informationLoading.value = false
    }
  }
}

const syncInformation = async () => {
  if (!track.value) return
  informationSyncing.value = true
  try {
    const summary = await StockApi.syncTrackInformation({
      trackId: track.value.id,
      type: informationType.value
    })
    if (summary.failed > 0) {
      message.warning('同步失败，已保留现有本地资讯')
    } else {
      message.success(`同步完成：新增 ${summary.inserted} 条，更新 ${summary.updated} 条`)
    }
    informationQuery.pageNo = 1
    await loadInformation()
  } catch {
    message.error('同步失败，已保留现有本地资讯')
  } finally {
    informationSyncing.value = false
  }
}

const handleInformationTypeChange = () => {
  informationQuery.pageNo = 1
  void loadInformation()
}

const handleInformationSearch = () => {
  informationQuery.pageNo = 1
  void loadInformation()
}

const handleInformationPageSizeChange = () => {
  informationQuery.pageNo = 1
  void loadInformation()
}

const loadReports = async () => {
  if (!track.value) return
  reportLoading.value = true
  try {
    reportResult.value = await StockApi.getResearchReportPage({
      trackId: track.value.id,
      pageNo: 1,
      pageSize: 20
    })
  } catch {
    reportResult.value = unavailableResult('研报加载失败')
  } finally {
    reportLoading.value = false
  }
}

const loadFundamental = async () => {
  if (!track.value) return
  fundamentalLoading.value = true
  try {
    fundamentalResult.value = await StockApi.getFundamental(track.value.id)
  } catch {
    fundamentalResult.value = unavailableResult('基本面加载失败')
  } finally {
    fundamentalLoading.value = false
  }
}

const open = (value: StockTrackVO) => {
  informationRequestVersion++
  track.value = value
  trackingPeriodForm.trackingStartDate = value.trackingStartDate || undefined
  trackingPeriodForm.trackingEndDate = value.trackingEndDate || undefined
  activeTab.value = 'manual'
  informationType.value = 'NEWS'
  informationQuery.pageNo = 1
  informationQuery.keyword = ''
  informationResult.value = undefined
  fundamentalSubTab.value = 'overview'
  dailyQuery.pageNo = 1
  chartDateRange.value = undefined
  chartPrices.value = []
  visible.value = true
  loadDailyPrices()
  loadChart()
  loadQuote()
  loadInformation()
  loadReports()
  loadFundamental()
}

const formatPrice = (value?: number | null) =>
  value === undefined || value === null ? '--' : value.toFixed(2)

const formatSigned = (value: number | null, digits: number) =>
  value === null ? '--' : `${value > 0 ? '+' : ''}${value.toFixed(digits)}`

const formatPercent = (value?: number | null) =>
  value === undefined || value === null ? '--' : `${value.toFixed(2)}%`

const formatVolume = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : value.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const formatNullable = (value?: number | null) =>
  value === undefined || value === null ? '--' : value.toLocaleString('zh-CN')

const formatInteger = (value?: number | null) =>
  value === undefined || value === null ? '--' : value.toLocaleString('zh-CN')

const formatLargeAmount = (value?: number | null) => {
  if (value === undefined || value === null) return '--'
  if (Math.abs(value) >= 100000000) return `${(value / 100000000).toFixed(2)} 亿元`
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(2)} 万元`
  return `${value.toFixed(2)} 元`
}

const formatDateTime = (value?: string | null) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '--'

const changeClass = (value?: number | null) => {
  if (value === undefined || value === null || value === 0) return 'price-flat'
  return value > 0 ? 'price-up' : 'price-down'
}

const resultMessage = <T,>(result?: MarketDataResult<T>) =>
  result?.message || (result?.status === 'UNAVAILABLE' ? '外部数据暂不可用' : '暂无数据')

defineExpose({ open, loadDailyPrices })
</script>

<style scoped>
.drawer-title,
.section-heading,
.row-actions {
  display: flex;
  align-items: center;
}

.drawer-title,
.section-heading {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.drawer-title {
  width: 100%;
  padding-right: 16px;
}

.drawer-title__name {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.drawer-title__meta,
.section-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.section-hint {
  margin-left: 8px;
}

.section-heading {
  min-height: 40px;
  margin-bottom: 12px;
}

.section-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.tracking-period {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) auto;
  padding: 14px 16px;
  margin-bottom: 14px;
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-lighter);
  border-left: 4px solid var(--el-color-info);
  border-radius: 6px;
  align-items: center;
  gap: 18px;
}

.tracking-period--active {
  background: var(--el-color-success-light-9);
  border-left-color: var(--el-color-success);
}

.tracking-period--ended {
  background: var(--el-color-warning-light-9);
  border-left-color: var(--el-color-warning);
}

.tracking-period__summary,
.tracking-period__state,
.tracking-period__dates,
.tracking-period__date,
.tracking-period__controls {
  display: flex;
  align-items: center;
}

.tracking-period__summary {
  min-width: 0;
  gap: 24px;
}

.tracking-period__state {
  flex: 0 0 auto;
  gap: 10px;
}

.tracking-period__state-icon {
  display: inline-flex;
  width: 34px;
  height: 34px;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 50%;
  align-items: center;
  justify-content: center;
}

.tracking-period__eyebrow,
.tracking-period__date span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.tracking-period__eyebrow {
  margin-bottom: 4px;
}

.tracking-period__dates {
  min-width: 0;
  gap: 12px;
}

.tracking-period__date {
  min-width: 112px;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}

.tracking-period__date strong {
  font-size: 14px;
  color: var(--el-text-color-primary);
  font-variant-numeric: tabular-nums;
}

.tracking-period__arrow {
  flex: 0 0 auto;
  color: var(--el-text-color-placeholder);
}

.tracking-period__controls {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.tracking-period__controls :deep(.el-date-editor) {
  width: 148px;
}

.tracking-period__separator {
  color: var(--el-text-color-secondary);
}

.detail-tabs {
  min-height: 480px;
}

.detail-descriptions {
  margin-top: 12px;
}

.fundamental-tabs {
  margin-top: 10px;
}

.kline-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.information-filters {
  display: flex;
  min-width: min(520px, 100%);
  align-items: center;
  gap: 10px;
}

.information-filters :deep(.el-input) {
  width: min(280px, 42vw);
}

.information-pagination {
  display: flex;
  margin-top: 14px;
  justify-content: flex-end;
  overflow-x: auto;
}

.row-actions {
  justify-content: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.row-actions .el-button {
  width: 28px;
  height: 28px;
  padding: 0;
  margin-left: 0;
}

.kline-chart-area {
  min-height: 720px;
}

.drawer-disclaimer {
  margin-top: 20px;
}

.price-up,
.loss-value {
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
  :deep(.stock-detail-drawer) {
    width: 100% !important;
  }

  .drawer-title,
  .section-heading {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .tracking-period {
    grid-template-columns: minmax(0, 1fr);
  }

  .tracking-period__summary,
  .tracking-period__dates {
    align-items: flex-start;
    flex-direction: column;
  }

  .tracking-period__summary {
    gap: 14px;
  }

  .tracking-period__dates {
    width: 100%;
    gap: 8px;
  }

  .tracking-period__date {
    width: 100%;
  }

  .tracking-period__arrow {
    display: none;
  }

  .tracking-period__controls {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
    justify-content: stretch;
  }

  .tracking-period__controls :deep(.el-date-editor) {
    width: 100%;
    min-width: 0;
  }

  .tracking-period__separator {
    display: none;
  }

  .tracking-period__controls .el-button,
  .section-actions .el-button {
    width: 100%;
    margin-left: 0;
  }

  .section-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .section-actions .el-tooltip__trigger {
    width: 100%;
  }

  .kline-toolbar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .information-filters {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    width: 100%;
  }

  .information-filters :deep(.el-input) {
    width: 100%;
  }

  .information-pagination {
    justify-content: flex-start;
  }

  .kline-toolbar :deep(.el-date-editor) {
    width: 100%;
    grid-column: span 2;
  }

  .kline-toolbar .el-button {
    width: 100%;
    margin-left: 0;
  }

  :deep(.el-descriptions__body .el-descriptions__table) {
    min-width: 640px;
  }
}
</style>
