<template>
  <ContentWrap>
    <div class="capability-heading">
      <div>
        <div class="capability-heading__title">选股能力分析</div>
        <div class="capability-heading__meta">
          截止 {{ asOfDate || '--' }}，从变化原因、跟踪批次、收益结构和分组稳定性核对结果
        </div>
      </div>
      <el-tooltip content="刷新能力分析" placement="top">
        <el-button
          circle
          aria-label="刷新能力分析"
          :loading="localLoading"
          :disabled="!asOfDate"
          @click="reload"
        >
          <Icon icon="ep:refresh" />
        </el-button>
      </el-tooltip>
    </div>

    <el-empty v-if="!asOfDate" description="当前筛选范围内没有可分析的快照" />
    <div v-else v-loading="localLoading" class="capability-body">
      <el-alert
        v-if="localError"
        class="analysis-alert"
        type="error"
        :title="localError"
        show-icon
        :closable="false"
      />

      <template v-if="analysis">
        <section class="analysis-section">
          <div class="section-heading">
            <div>
              <div class="section-heading__title">成功率变化归因</div>
              <div class="section-heading__meta">
                对比 {{ analysis.previousDate || '无前序节点' }} 与
                {{ analysis.asOfDate }} 的累计结果
              </div>
            </div>
            <div class="attribution-summary">
              <span>前次 {{ formatPercent(analysis.attribution.previousSuccessRate) }}</span>
              <Icon icon="ep:right" />
              <span>当前 {{ formatPercent(analysis.attribution.currentSuccessRate) }}</span>
              <strong :class="changeClass(analysis.attribution.changePercentagePoints)">
                {{ formatPoints(analysis.attribution.changePercentagePoints) }}
              </strong>
            </div>
          </div>
          <div class="attribution-grid">
            <button
              v-for="category in analysis.attribution.categories"
              :key="category.type"
              type="button"
              class="metric-button attribution-item"
              :disabled="category.trackIds.length === 0"
              @click="openDetail(category.label, category.trackIds)"
            >
              <span>{{ category.label }}</span>
              <strong>{{ category.count }}</strong>
              <small>查看逐股</small>
            </button>
          </div>
        </section>

        <section class="analysis-section">
          <div class="section-heading">
            <div>
              <div class="section-heading__title">跟踪批次表现</div>
              <div class="section-heading__meta">
                D0 必须存在跟踪日涨幅，后续节点只纳入具备完整有效交易日的股票
              </div>
            </div>
          </div>
          <div class="cohort-table-wrap">
            <el-table
              :data="analysis.cohorts"
              stripe
              table-layout="fixed"
              empty-text="暂无跟踪批次"
            >
              <el-table-column
                prop="trackingStartDate"
                label="跟踪批次"
                width="122"
                fixed
                sortable
              />
              <el-table-column prop="stockCount" label="股票数" width="88" align="right" sortable>
                <template #default="{ row }">
                  <el-button
                    link
                    type="primary"
                    @click="openDetail(`${row.trackingStartDate} 批次`, row.trackIds)"
                  >
                    {{ row.stockCount }}
                  </el-button>
                </template>
              </el-table-column>
              <el-table-column
                v-for="horizon in cohortHorizons"
                :key="horizon"
                :label="horizon"
                min-width="132"
                align="right"
              >
                <template #default="{ row }">
                  <el-button
                    v-if="findCohortMetric(row, horizon)?.sampleCount"
                    link
                    type="primary"
                    @click="openCohortDetail(row, horizon)"
                  >
                    {{ formatPercent(findCohortMetric(row, horizon)?.successRate) }}
                    <small> / {{ findCohortMetric(row, horizon)?.sampleCount }}</small>
                  </el-button>
                  <span v-else>--</span>
                </template>
              </el-table-column>
              <el-table-column
                prop="averageCumulativeChangePercent"
                label="批次平均累计"
                min-width="140"
                align="right"
                sortable
              >
                <template #default="{ row }">
                  <el-button
                    link
                    type="primary"
                    :disabled="row.trackIds.length === 0"
                    @click="openDetail(`${row.trackingStartDate} 批次累计`, row.trackIds)"
                  >
                    <span :class="changeClass(row.averageCumulativeChangePercent)">
                      {{ formatPercent(row.averageCumulativeChangePercent) }}
                    </span>
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </section>

        <section class="analysis-section distribution-quality-grid">
          <div class="distribution-panel">
            <div class="section-heading">
              <div>
                <div class="section-heading__title">收益分布</div>
                <div class="section-heading__meta">保留已结束跟踪样本，柱体和极值均可下钻</div>
              </div>
              <div class="distribution-summary">
                <span>平均 {{ formatPercent(analysis.distribution.averageChangePercent) }}</span>
                <span>中位数 {{ formatPercent(analysis.distribution.medianChangePercent) }}</span>
              </div>
            </div>
            <Echart
              v-if="analysis.distribution.sampleCount > 0"
              :height="280"
              :options="distributionChartOptions"
              @chart-click="handleDistributionClick"
            />
            <el-empty v-else description="暂无累计有效样本" />
            <div class="extreme-strip">
              <button
                type="button"
                class="metric-button extreme-item"
                :disabled="analysis.distribution.maximumTrackIds.length === 0"
                @click="openDetail('最大上涨', analysis.distribution.maximumTrackIds)"
              >
                <span>最大上涨</span>
                <strong class="price-up">{{
                  formatPercent(analysis.distribution.maximumChangePercent)
                }}</strong>
              </button>
              <button
                type="button"
                class="metric-button extreme-item"
                :disabled="analysis.distribution.minimumTrackIds.length === 0"
                @click="openDetail('最大下跌', analysis.distribution.minimumTrackIds)"
              >
                <span>最大下跌</span>
                <strong class="price-down">{{
                  formatPercent(analysis.distribution.minimumChangePercent)
                }}</strong>
              </button>
            </div>
          </div>

          <div class="quality-panel">
            <div class="section-heading">
              <div>
                <div class="section-heading__title">样本可靠性</div>
                <div class="section-heading__meta">
                  最新本地数据 {{ analysis.quality.latestLocalDataDate || '--' }}
                </div>
              </div>
              <el-tag :type="reliabilityTagType(analysis.quality.reliabilityLevel)" effect="plain">
                {{ reliabilityLabel(analysis.quality.reliabilityLevel) }}
              </el-tag>
            </div>
            <div class="wilson-band">
              <span>累计成功率 95% Wilson 区间</span>
              <strong>
                {{ formatPercent(analysis.quality.wilsonLowerPercent) }} 至
                {{ formatPercent(analysis.quality.wilsonUpperPercent) }}
              </strong>
            </div>
            <div class="quality-grid">
              <button
                v-for="metric in qualityMetrics"
                :key="metric.key"
                type="button"
                class="metric-button quality-item"
                :disabled="metric.trackIds.length === 0"
                @click="openDetail(metric.label, metric.trackIds)"
              >
                <span>{{ metric.label }}</span>
                <strong>{{ metric.value }}</strong>
              </button>
            </div>
          </div>
        </section>

        <section class="analysis-section">
          <div class="section-heading">
            <div>
              <div class="section-heading__title">分组能力对比</div>
              <div class="section-heading__meta"
                >多分组股票会分别计入对应分组，用于比较选股来源和方法</div
              >
            </div>
          </div>
          <div class="group-table-wrap">
            <el-table :data="analysis.groups" stripe table-layout="fixed" empty-text="暂无股票分组">
              <el-table-column prop="groupName" label="分组" min-width="132" fixed sortable />
              <el-table-column prop="stockCount" label="股票数" width="90" align="right" sortable />
              <el-table-column
                prop="validSampleCount"
                label="有效样本"
                width="100"
                align="right"
                sortable
              />
              <el-table-column
                prop="dailySuccessRate"
                label="当日成功率"
                width="124"
                align="right"
                sortable
              >
                <template #default="{ row }">{{ formatPercent(row.dailySuccessRate) }}</template>
              </el-table-column>
              <el-table-column
                prop="tracking5SuccessRate"
                label="跟踪 5 日"
                width="122"
                align="right"
                sortable
              >
                <template #default="{ row }">{{
                  formatPercent(row.tracking5SuccessRate)
                }}</template>
              </el-table-column>
              <el-table-column
                prop="cumulativeSuccessRate"
                label="累计成功率"
                width="122"
                align="right"
                sortable
              >
                <template #default="{ row }">{{
                  formatPercent(row.cumulativeSuccessRate)
                }}</template>
              </el-table-column>
              <el-table-column
                prop="averageCumulativeChangePercent"
                label="平均累计涨幅"
                width="138"
                align="right"
                sortable
              >
                <template #default="{ row }">
                  <span :class="changeClass(row.averageCumulativeChangePercent)">
                    {{ formatPercent(row.averageCumulativeChangePercent) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="missingCount" label="缺失" width="82" align="right" sortable />
              <el-table-column label="操作" width="74" align="center" fixed="right">
                <template #default="{ row }">
                  <el-tooltip content="查看分组逐股明细" placement="top">
                    <el-button
                      link
                      type="primary"
                      @click="openDetail(`${row.groupName} 分组`, row.trackIds)"
                    >
                      <Icon icon="ep:view" />
                    </el-button>
                  </el-tooltip>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </section>

        <section class="analysis-section analysis-section--last">
          <div class="section-heading benchmark-heading">
            <div>
              <div class="section-heading__title">市场基准对比</div>
              <div class="section-heading__meta">每只股票按自己的跟踪闭区间计算指数与超额表现</div>
            </div>
            <div class="benchmark-controls">
              <el-select v-model="benchmark" class="benchmark-select" aria-label="选择市场基准">
                <el-option label="沪深 300" value="CSI300" />
                <el-option label="上证指数" value="SSE_COMPOSITE" />
                <el-option label="深证成指" value="SZSE_COMPONENT" />
              </el-select>
              <el-tooltip content="刷新市场基准" placement="top">
                <el-button
                  circle
                  aria-label="刷新市场基准"
                  :loading="benchmarkLoading"
                  @click="loadBenchmark"
                >
                  <Icon icon="ep:refresh" />
                </el-button>
              </el-tooltip>
            </div>
          </div>
          <el-alert
            v-if="benchmarkError"
            class="analysis-alert"
            type="warning"
            :title="benchmarkError"
            show-icon
            :closable="false"
          />
          <div v-loading="benchmarkLoading" class="benchmark-body">
            <template v-if="benchmarkResult?.data">
              <div class="benchmark-meta">
                <span
                  >{{ benchmarkResult.data.benchmarkName }} ·
                  {{ benchmarkResult.data.benchmarkSymbol }}</span
                >
                <span>来源 {{ benchmarkResult.provider || '--' }}</span>
                <span
                  >有效 {{ benchmarkResult.data.validSampleCount }} /
                  {{ benchmarkResult.data.stockSampleCount }}</span
                >
                <span v-if="benchmarkResult.data.missingSampleCount > 0">
                  缺失 {{ benchmarkResult.data.missingSampleCount }}
                </span>
              </div>
              <el-alert
                v-if="benchmarkVerdict"
                class="benchmark-verdict"
                :type="benchmarkVerdict.type"
                :title="benchmarkVerdict.title"
                :description="benchmarkVerdict.description"
                show-icon
                :closable="false"
              />
              <div class="benchmark-metrics">
                <div class="benchmark-metric">
                  <span>股票池平均</span>
                  <strong :class="changeClass(benchmarkResult.data.averageStockChangePercent)">
                    {{ formatPercent(benchmarkResult.data.averageStockChangePercent) }}
                  </strong>
                </div>
                <div class="benchmark-metric">
                  <span>基准平均</span>
                  <strong :class="changeClass(benchmarkResult.data.averageBenchmarkChangePercent)">
                    {{ formatPercent(benchmarkResult.data.averageBenchmarkChangePercent) }}
                  </strong>
                </div>
                <div class="benchmark-metric">
                  <span>平均超额</span>
                  <strong :class="changeClass(benchmarkResult.data.averageExcessChangePercent)">
                    {{ formatPercent(benchmarkResult.data.averageExcessChangePercent) }}
                  </strong>
                </div>
                <div class="benchmark-metric">
                  <span>跑赢比例</span>
                  <strong>{{ formatPercent(benchmarkResult.data.outperformRate) }}</strong>
                </div>
                <button
                  type="button"
                  class="metric-button benchmark-metric benchmark-metric--action"
                  :disabled="benchmarkTrackIds.length === 0"
                  @click="
                    openBenchmarkDetail(
                      `${benchmarkResult.data.benchmarkName} 全部对比`,
                      benchmarkTrackIds
                    )
                  "
                >
                  <span>有效比较</span>
                  <strong>{{ benchmarkResult.data.validSampleCount }}</strong>
                  <small>查看逐股收益差</small>
                </button>
              </div>
              <div class="benchmark-quadrants">
                <button
                  v-for="quadrant in benchmarkQuadrants"
                  :key="quadrant.key"
                  type="button"
                  class="metric-button benchmark-quadrant"
                  :disabled="quadrant.trackIds.length === 0"
                  @click="
                    openBenchmarkDetail(
                      `${benchmarkResult.data.benchmarkName} · ${quadrant.label}`,
                      quadrant.trackIds
                    )
                  "
                >
                  <span>{{ quadrant.label }}</span>
                  <strong>{{ quadrant.count }}</strong>
                  <small>查看逐股对比</small>
                </button>
              </div>
            </template>
            <el-empty v-else description="暂无市场基准数据" />
          </div>
        </section>
      </template>
    </div>
  </ContentWrap>

  <el-dialog
    v-model="detailVisible"
    :title="`${detailTitle} · 逐股明细`"
    width="min(1280px, calc(100vw - 32px))"
    destroy-on-close
  >
    <div class="detail-toolbar">
      <div v-if="detailMode === 'BENCHMARK'" class="detail-summary">
        <span
          >当前显示 <strong>{{ filteredBenchmarkDetails.length }}</strong> 支</span
        >
        <span
          >跑赢
          <strong class="price-up">{{ benchmarkDetailOverview.outperformCount }}</strong></span
        >
        <span
          >落后 <strong class="price-down">{{ benchmarkDetailOverview.lagCount }}</strong></span
        >
        <span>
          平均超额
          <strong :class="changeClass(benchmarkDetailOverview.averageExcess)">
            {{ formatPercent(benchmarkDetailOverview.averageExcess) }}
          </strong>
        </span>
      </div>
      <div v-else class="detail-summary">
        <span
          >当前显示 <strong>{{ sortedDetailFacts.length }}</strong> 支</span
        >
        <span
          >上涨 <strong class="price-up">{{ detailOverview.winCount }}</strong></span
        >
        <span
          >下跌 <strong class="price-down">{{ detailOverview.lossCount }}</strong></span
        >
        <span
          >平均
          <strong :class="changeClass(detailOverview.average)">{{
            formatPercent(detailOverview.average)
          }}</strong></span
        >
      </div>
      <div class="detail-filters">
        <el-input
          v-model="detailKeyword"
          clearable
          placeholder="股票、代码或分组"
          :prefix-icon="Search"
        />
        <el-select
          v-if="detailMode === 'BENCHMARK'"
          v-model="benchmarkOutcomeFilter"
          aria-label="筛选基准比较结果"
        >
          <el-option label="全部结果" value="ALL" />
          <el-option label="跑赢基准" value="OUTPERFORM" />
          <el-option label="落后基准" value="LAG" />
          <el-option label="基准缺失" value="MISSING" />
        </el-select>
        <el-select v-else v-model="detailResultFilter" aria-label="筛选累计结果">
          <el-option label="全部结果" value="ALL" />
          <el-option label="上涨" value="WIN" />
          <el-option label="下跌" value="LOSS" />
          <el-option label="平盘" value="FLAT" />
          <el-option label="数据缺失" value="MISSING" />
        </el-select>
        <el-select
          v-if="detailMode === 'CAPABILITY'"
          v-model="detailStatusFilter"
          aria-label="筛选跟踪状态"
        >
          <el-option label="全部状态" value="ALL" />
          <el-option label="当前有效" value="ACTIVE" />
          <el-option label="已结束" value="ENDED" />
        </el-select>
      </div>
    </div>
    <el-table
      v-if="detailMode === 'BENCHMARK'"
      :data="filteredBenchmarkDetails"
      stripe
      table-layout="fixed"
      max-height="600"
      empty-text="当前条件没有基准对比明细"
    >
      <el-table-column prop="name" label="股票名称" min-width="120" fixed sortable />
      <el-table-column prop="code" label="股票代码" width="116" sortable />
      <el-table-column prop="market" label="市场" width="88" sortable />
      <el-table-column prop="trackingStartDate" label="开始跟踪" width="116" sortable />
      <el-table-column prop="comparisonEndDate" label="比较截止" width="116" sortable />
      <el-table-column
        prop="stockChangePercent"
        label="个股收益"
        width="108"
        align="right"
        sortable
      >
        <template #default="{ row }">
          <span :class="changeClass(row.stockChangePercent)">
            {{ formatPercent(row.stockChangePercent) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        prop="benchmarkChangePercent"
        label="基准收益"
        width="108"
        align="right"
        sortable
      >
        <template #default="{ row }">
          <span :class="changeClass(row.benchmarkChangePercent)">
            {{ formatPercent(row.benchmarkChangePercent) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        prop="excessChangePercent"
        label="超额收益"
        width="108"
        align="right"
        sortable
      >
        <template #default="{ row }">
          <strong :class="changeClass(row.excessChangePercent)">
            {{ formatPercent(row.excessChangePercent) }}
          </strong>
        </template>
      </el-table-column>
      <el-table-column prop="outperform" label="比较结果" width="104" align="center" sortable>
        <template #default="{ row }">
          <el-tag v-if="row.outperform === true" type="danger" effect="plain">跑赢</el-tag>
          <el-tag v-else-if="row.outperform === false" type="success" effect="plain"> 落后 </el-tag>
          <span v-else>--</span>
        </template>
      </el-table-column>
      <el-table-column prop="missingReason" label="数据说明" min-width="210" sortable>
        <template #default="{ row }">{{ row.missingReason || '--' }}</template>
      </el-table-column>
    </el-table>
    <el-table
      v-else
      :data="sortedDetailFacts"
      stripe
      table-layout="fixed"
      max-height="600"
      empty-text="当前节点没有逐股明细"
      @sort-change="handleDetailSortChange"
    >
      <el-table-column prop="name" label="股票名称" min-width="120" fixed sortable="custom" />
      <el-table-column prop="symbol" label="股票代码" width="128" sortable="custom" />
      <el-table-column prop="groupNames" label="分组" min-width="160" sortable="custom">
        <template #default="{ row }">{{ row.groupNames.join('、') || '--' }}</template>
      </el-table-column>
      <el-table-column prop="trackingStartDate" label="开始跟踪" width="116" sortable="custom" />
      <el-table-column prop="trackingEndDate" label="结束跟踪" width="116" sortable="custom">
        <template #default="{ row }">{{ row.trackingEndDate || '持续跟踪' }}</template>
      </el-table-column>
      <el-table-column
        prop="currentDailyChangePercent"
        label="当日涨幅"
        width="124"
        align="right"
        sortable="custom"
      >
        <template #default="{ row }">
          <div class="daily-change-cell">
            <span :class="changeClass(displayDailyChange(row))">
              {{ formatPercent(displayDailyChange(row)) }}
            </span>
            <small
              v-if="row.currentDailyChangePercent === null && row.latestDailyChangePercent !== null"
            >
              {{ row.latestDailyDate }}
            </small>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="tracking5ChangePercent"
        label="跟踪 5 日"
        width="112"
        align="right"
        sortable="custom"
      >
        <template #default="{ row }"
          ><span :class="changeClass(row.tracking5ChangePercent)">{{
            formatPercent(row.tracking5ChangePercent)
          }}</span></template
        >
      </el-table-column>
      <el-table-column
        prop="tracking10ChangePercent"
        label="跟踪 10 日"
        width="118"
        align="right"
        sortable="custom"
      >
        <template #default="{ row }"
          ><span :class="changeClass(row.tracking10ChangePercent)">{{
            formatPercent(row.tracking10ChangePercent)
          }}</span></template
        >
      </el-table-column>
      <el-table-column
        prop="cumulativeChangePercent"
        label="当前累计"
        width="108"
        align="right"
        sortable="custom"
      >
        <template #default="{ row }"
          ><span :class="changeClass(row.cumulativeChangePercent)">{{
            formatPercent(row.cumulativeChangePercent)
          }}</span></template
        >
      </el-table-column>
      <el-table-column
        prop="previousCumulativeChangePercent"
        label="前次累计"
        width="108"
        align="right"
        sortable="custom"
      >
        <template #default="{ row }"
          ><span :class="changeClass(row.previousCumulativeChangePercent)">{{
            formatPercent(row.previousCumulativeChangePercent)
          }}</span></template
        >
      </el-table-column>
      <el-table-column
        prop="validTradingDays"
        label="有效交易日"
        width="112"
        align="right"
        sortable="custom"
      />
      <el-table-column
        prop="cumulativeResult"
        label="累计结果"
        width="96"
        align="center"
        sortable="custom"
      >
        <template #default="{ row }">
          <el-tag
            v-if="row.cumulativeResult"
            :type="resultTagType(row.cumulativeResult)"
            effect="plain"
          >
            {{ resultLabel(row.cumulativeResult) }}
          </el-tag>
          <span v-else>--</span>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="detailVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { ECElementEvent } from 'echarts/core'
import { Search } from '@element-plus/icons-vue'
import {
  MarketDataResult,
  StockApi,
  StockBenchmark,
  StockBenchmarkComparisonVO,
  StockBenchmarkDetailVO,
  StockCapabilityAnalysisVO,
  StockCapabilityCohortVO,
  StockCapabilityFactVO,
  StockReliabilityLevel,
  StockStatisticsResult
} from '@/api/finance/stock'

defineOptions({ name: 'StockCapabilityAnalysisPanel' })

const props = defineProps<{
  asOfDate?: string
  refreshKey?: number
}>()

type SortOrder = 'ascending' | 'descending' | null
type DetailSort = { prop: string; order: SortOrder }
type DetailResultFilter = 'ALL' | StockStatisticsResult | 'MISSING'
type DetailStatusFilter = 'ALL' | 'ACTIVE' | 'ENDED'
type DetailMode = 'CAPABILITY' | 'BENCHMARK'
type BenchmarkOutcomeFilter = 'ALL' | 'OUTPERFORM' | 'LAG' | 'MISSING'

const cohortHorizons = ['D0', 'D1', 'D3', 'D5', 'D10']
const analysis = ref<StockCapabilityAnalysisVO>()
const localLoading = ref(false)
const localError = ref('')
const benchmark = ref<StockBenchmark>('CSI300')
const benchmarkLoading = ref(false)
const benchmarkError = ref('')
const benchmarkResult = ref<MarketDataResult<StockBenchmarkComparisonVO>>()
const detailVisible = ref(false)
const detailTitle = ref('')
const detailTrackIds = ref<number[]>([])
const detailMode = ref<DetailMode>('CAPABILITY')
const detailKeyword = ref('')
const detailResultFilter = ref<DetailResultFilter>('ALL')
const detailStatusFilter = ref<DetailStatusFilter>('ALL')
const benchmarkOutcomeFilter = ref<BenchmarkOutcomeFilter>('ALL')
const detailSort = ref<DetailSort>({ prop: '', order: null })

const startedFacts = computed(
  () =>
    analysis.value?.stocks.filter(
      (fact) => fact.trackingStartDate && fact.trackingStartDate <= analysis.value!.asOfDate
    ) ?? []
)

const qualityMetrics = computed(() => {
  if (!analysis.value) return []
  const facts = analysis.value.stocks
  return [
    {
      key: 'pool',
      label: '个股池',
      value: analysis.value.quality.poolStockCount,
      trackIds: facts.map((fact) => fact.trackId)
    },
    {
      key: 'started',
      label: '已开始',
      value: analysis.value.quality.startedCount,
      trackIds: startedFacts.value.map((fact) => fact.trackId)
    },
    {
      key: 'active',
      label: '当前有效',
      value: analysis.value.quality.currentActiveCount,
      trackIds: facts.filter((fact) => fact.activeAsOf).map((fact) => fact.trackId)
    },
    {
      key: 'ended',
      label: '已结束',
      value: analysis.value.quality.endedCount,
      trackIds: facts
        .filter((fact) => fact.trackingEndDate && fact.trackingEndDate < analysis.value!.asOfDate)
        .map((fact) => fact.trackId)
    },
    {
      key: 'valid',
      label: '累计有效',
      value: analysis.value.quality.cumulativeValidCount,
      trackIds: facts
        .filter((fact) => fact.cumulativeChangePercent !== null)
        .map((fact) => fact.trackId)
    },
    {
      key: 'daily-missing',
      label: '当日缺失',
      value: analysis.value.quality.dailyMissingCount,
      trackIds: facts
        .filter((fact) => fact.activeAsOf && fact.currentDailyChangePercent === null)
        .map((fact) => fact.trackId)
    },
    {
      key: 'd0-missing',
      label: '跟踪日缺失',
      value: analysis.value.quality.d0MissingCount,
      trackIds: startedFacts.value.filter((fact) => !fact.d0Available).map((fact) => fact.trackId)
    },
    {
      key: 'under-5',
      label: '不足 5 日',
      value: analysis.value.quality.insufficient5Count,
      trackIds: startedFacts.value
        .filter((fact) => fact.validTradingDays < 5)
        .map((fact) => fact.trackId)
    },
    {
      key: 'under-10',
      label: '不足 10 日',
      value: analysis.value.quality.insufficient10Count,
      trackIds: startedFacts.value
        .filter((fact) => fact.validTradingDays < 10)
        .map((fact) => fact.trackId)
    }
  ]
})

const distributionChartOptions = computed<EChartsOption>(() => ({
  grid: { left: 20, right: 18, top: 18, bottom: 20, containLabel: true },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  xAxis: {
    type: 'category',
    data: analysis.value?.distribution.buckets.map((bucket) => bucket.label) ?? [],
    axisLabel: { interval: 0 }
  },
  yAxis: {
    type: 'value',
    name: '股票数',
    minInterval: 1,
    splitLine: { lineStyle: { color: '#e5e7eb' } }
  },
  series: [
    {
      id: 'capability-distribution',
      type: 'bar',
      cursor: 'pointer',
      barMaxWidth: 48,
      data:
        analysis.value?.distribution.buckets.map((bucket, index) => ({
          value: bucket.count,
          itemStyle: { color: ['#b42318', '#d97706', '#287f71', '#166534'][index] }
        })) ?? []
    }
  ]
}))

const benchmarkTrackIds = computed(
  () => benchmarkResult.value?.data?.details.map((detail) => detail.trackId) ?? []
)

const benchmarkQuadrants = computed(() => {
  const details =
    benchmarkResult.value?.data?.details.filter(
      (detail) => detail.excessChangePercent !== null && detail.outperform !== null
    ) ?? []
  const definitions = [
    {
      key: 'up-outperform',
      label: '上涨且跑赢',
      match: (detail: StockBenchmarkDetailVO) =>
        detail.stockChangePercent > 0 && detail.outperform === true
    },
    {
      key: 'up-lag',
      label: '上涨但落后',
      match: (detail: StockBenchmarkDetailVO) =>
        detail.stockChangePercent > 0 && detail.outperform === false
    },
    {
      key: 'not-up-outperform',
      label: '未涨但跑赢',
      match: (detail: StockBenchmarkDetailVO) =>
        detail.stockChangePercent <= 0 && detail.outperform === true
    },
    {
      key: 'not-up-lag',
      label: '未涨且落后',
      match: (detail: StockBenchmarkDetailVO) =>
        detail.stockChangePercent <= 0 && detail.outperform === false
    }
  ]
  return definitions.map((definition) => {
    const matched = details.filter(definition.match)
    return {
      key: definition.key,
      label: definition.label,
      count: matched.length,
      trackIds: matched.map((detail) => detail.trackId)
    }
  })
})

const benchmarkVerdict = computed(() => {
  const data = benchmarkResult.value?.data
  if (
    !data ||
    data.averageExcessChangePercent === null ||
    data.outperformRate === null ||
    data.validSampleCount === 0
  ) {
    return null
  }
  const averageExcess = data.averageExcessChangePercent
  const broadOutperformance = data.outperformRate >= 50
  const description = `股票池平均 ${formatPercent(data.averageStockChangePercent)}，${data.benchmarkName}平均 ${formatPercent(data.averageBenchmarkChangePercent)}，平均超额 ${formatPercent(averageExcess)}，跑赢比例 ${formatPercent(data.outperformRate)}。`
  if (averageExcess > 0 && broadOutperformance) {
    return { type: 'success' as const, title: '当前样本体现了较广泛的超额选股能力', description }
  }
  if (averageExcess > 0) {
    return { type: 'warning' as const, title: '超额收益主要由少数股票贡献', description }
  }
  if ((data.averageStockChangePercent ?? 0) > 0) {
    return { type: 'warning' as const, title: '股票池虽然上涨，但整体没有跑赢市场', description }
  }
  return { type: 'error' as const, title: '当前样本暂未体现超额选股能力', description }
})

const selectedBenchmarkDetails = computed(() => {
  const selected = new Set(detailTrackIds.value)
  return benchmarkResult.value?.data?.details.filter((detail) => selected.has(detail.trackId)) ?? []
})

const filteredBenchmarkDetails = computed(() => {
  const keyword = detailKeyword.value.trim().toLocaleLowerCase()
  return selectedBenchmarkDetails.value.filter((detail) => {
    const matchesKeyword =
      !keyword ||
      `${detail.name} ${detail.code} ${detail.market}`.toLocaleLowerCase().includes(keyword)
    const matchesOutcome =
      benchmarkOutcomeFilter.value === 'ALL' ||
      (benchmarkOutcomeFilter.value === 'MISSING'
        ? detail.excessChangePercent === null
        : benchmarkOutcomeFilter.value === 'OUTPERFORM'
          ? detail.outperform === true
          : detail.outperform === false && detail.excessChangePercent !== null)
    return matchesKeyword && matchesOutcome
  })
})

const benchmarkDetailOverview = computed(() => {
  const valid = filteredBenchmarkDetails.value.filter(
    (detail): detail is StockBenchmarkDetailVO & { excessChangePercent: number } =>
      detail.excessChangePercent !== null
  )
  return {
    outperformCount: valid.filter((detail) => detail.outperform === true).length,
    lagCount: valid.filter((detail) => detail.outperform === false).length,
    averageExcess:
      valid.length > 0
        ? valid.reduce((sum, detail) => sum + detail.excessChangePercent, 0) / valid.length
        : null
  }
})

const selectedDetailFacts = computed(() => {
  if (!analysis.value) return []
  const selected = new Set(detailTrackIds.value)
  return analysis.value.stocks.filter((fact) => selected.has(fact.trackId))
})

const filteredDetailFacts = computed(() => {
  const keyword = detailKeyword.value.trim().toLocaleLowerCase()
  return selectedDetailFacts.value.filter((fact) => {
    const matchesKeyword =
      !keyword ||
      `${fact.name} ${fact.symbol} ${fact.groupNames.join(' ')}`
        .toLocaleLowerCase()
        .includes(keyword)
    const matchesResult =
      detailResultFilter.value === 'ALL' ||
      (detailResultFilter.value === 'MISSING'
        ? fact.cumulativeResult === null
        : fact.cumulativeResult === detailResultFilter.value)
    const ended = Boolean(
      fact.trackingEndDate && analysis.value && fact.trackingEndDate < analysis.value.asOfDate
    )
    const matchesStatus =
      detailStatusFilter.value === 'ALL' ||
      (detailStatusFilter.value === 'ACTIVE' ? fact.activeAsOf : ended)
    return matchesKeyword && matchesResult && matchesStatus
  })
})

const sortedDetailFacts = computed(() => {
  if (!detailSort.value.prop || !detailSort.value.order) return filteredDetailFacts.value
  return [...filteredDetailFacts.value].sort((left, right) =>
    compareFactRows(left, right, detailSort.value)
  )
})

const detailOverview = computed(() => {
  const validChanges = sortedDetailFacts.value
    .map((fact) => fact.cumulativeChangePercent)
    .filter((value): value is number => value !== null && Number.isFinite(value))
  return {
    winCount: sortedDetailFacts.value.filter((fact) => fact.cumulativeResult === 'WIN').length,
    lossCount: sortedDetailFacts.value.filter((fact) => fact.cumulativeResult === 'LOSS').length,
    average:
      validChanges.length > 0
        ? validChanges.reduce((sum, value) => sum + value, 0) / validChanges.length
        : null
  }
})

const loadAnalysis = async () => {
  if (!props.asOfDate) {
    analysis.value = undefined
    return
  }
  localLoading.value = true
  localError.value = ''
  try {
    analysis.value = await StockApi.getCapabilityAnalysis(props.asOfDate)
  } catch (error) {
    analysis.value = undefined
    localError.value = error instanceof Error ? error.message : '选股能力分析加载失败'
  } finally {
    localLoading.value = false
  }
}

const loadBenchmark = async () => {
  if (!props.asOfDate) {
    benchmarkResult.value = undefined
    return
  }
  benchmarkLoading.value = true
  benchmarkError.value = ''
  try {
    benchmarkResult.value = await StockApi.getBenchmarkComparison(props.asOfDate, benchmark.value)
    if (benchmarkResult.value.status === 'UNAVAILABLE' || benchmarkResult.value.message) {
      benchmarkError.value = benchmarkResult.value.message || '市场基准暂不可用'
    }
  } catch (error) {
    benchmarkResult.value = undefined
    benchmarkError.value = error instanceof Error ? error.message : '市场基准加载失败'
  } finally {
    benchmarkLoading.value = false
  }
}

const reload = async () => {
  await Promise.all([loadAnalysis(), loadBenchmark()])
}

const findCohortMetric = (cohort: StockCapabilityCohortVO, horizon: string) =>
  cohort.horizons.find((metric) => metric.horizon === horizon)

const openCohortDetail = (cohort: StockCapabilityCohortVO, horizon: string) => {
  const metric = findCohortMetric(cohort, horizon)
  if (!metric) return
  openDetail(`${cohort.trackingStartDate} 批次 ${horizon}`, metric.trackIds)
}

const openDetail = (title: string, trackIds: number[]) => {
  if (trackIds.length === 0) return
  detailMode.value = 'CAPABILITY'
  detailTitle.value = title
  detailTrackIds.value = [...new Set(trackIds)]
  detailKeyword.value = ''
  detailResultFilter.value = 'ALL'
  detailStatusFilter.value = 'ALL'
  detailSort.value = { prop: '', order: null }
  detailVisible.value = true
}

const openBenchmarkDetail = (title: string, trackIds: number[]) => {
  if (trackIds.length === 0) return
  detailMode.value = 'BENCHMARK'
  detailTitle.value = title
  detailTrackIds.value = [...new Set(trackIds)]
  detailKeyword.value = ''
  benchmarkOutcomeFilter.value = 'ALL'
  detailVisible.value = true
}

const handleDistributionClick = (event: ECElementEvent) => {
  if (event.componentType !== 'series' || typeof event.dataIndex !== 'number') return
  const bucket = analysis.value?.distribution.buckets[event.dataIndex]
  if (bucket) openDetail(`收益分布 ${bucket.label}`, bucket.trackIds)
}

const handleDetailSortChange = ({ prop, order }: DetailSort) => {
  detailSort.value = { prop: prop || '', order }
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

const compareFactRows = (
  left: StockCapabilityFactVO,
  right: StockCapabilityFactVO,
  sort: DetailSort
) => {
  if (!sort.order) return 0
  if (sort.prop === 'currentDailyChangePercent') {
    return compareNumber(displayDailyChange(left), displayDailyChange(right), sort.order)
  }
  if (sort.prop === 'groupNames') {
    return compareText(left.groupNames.join('、'), right.groupNames.join('、'), sort.order)
  }
  const textProps = new Set([
    'name',
    'symbol',
    'trackingStartDate',
    'trackingEndDate',
    'cumulativeResult'
  ])
  if (textProps.has(sort.prop)) {
    const leftValue = Reflect.get(left, sort.prop)
    const rightValue = Reflect.get(right, sort.prop)
    return compareText(
      typeof leftValue === 'string' ? leftValue : null,
      typeof rightValue === 'string' ? rightValue : null,
      sort.order
    )
  }
  const numberProps = new Set([
    'currentDailyChangePercent',
    'tracking5ChangePercent',
    'tracking10ChangePercent',
    'cumulativeChangePercent',
    'previousCumulativeChangePercent',
    'validTradingDays'
  ])
  if (numberProps.has(sort.prop)) {
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

const formatPercent = (value?: number | null) =>
  value === undefined || value === null ? '--' : `${value.toFixed(2)}%`

const displayDailyChange = (fact: StockCapabilityFactVO) =>
  fact.currentDailyChangePercent ?? fact.latestDailyChangePercent

const formatPoints = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : `${value > 0 ? '+' : ''}${value.toFixed(2)} 个百分点`

const changeClass = (value?: number | null) => {
  if (value === undefined || value === null || value === 0) return 'price-flat'
  return value > 0 ? 'price-up' : 'price-down'
}

const resultLabel = (result: StockStatisticsResult) =>
  result === 'WIN' ? '上涨' : result === 'LOSS' ? '下跌' : '平盘'

const resultTagType = (result: StockStatisticsResult) =>
  result === 'WIN' ? 'danger' : result === 'LOSS' ? 'success' : 'info'

const reliabilityLabel = (level: StockReliabilityLevel) => {
  const labels: Record<StockReliabilityLevel, string> = {
    NONE: '暂无有效样本',
    LOW: '低可靠性',
    MEDIUM: '中可靠性',
    HIGH: '高可靠性'
  }
  return labels[level]
}

const reliabilityTagType = (level: StockReliabilityLevel) => {
  if (level === 'HIGH') return 'success'
  if (level === 'MEDIUM') return 'warning'
  return 'info'
}

watch(
  () => [props.asOfDate, props.refreshKey],
  () => reload(),
  { immediate: true }
)
watch(benchmark, loadBenchmark)

defineExpose({ refresh: reload })
</script>

<style scoped>
.capability-heading,
.section-heading,
.attribution-summary,
.distribution-summary,
.benchmark-controls,
.benchmark-meta,
.detail-toolbar,
.detail-summary,
.detail-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.capability-heading,
.section-heading,
.detail-toolbar {
  justify-content: space-between;
}

.capability-heading {
  gap: 16px;
}

.capability-heading__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.capability-heading__meta,
.section-heading__meta {
  margin-top: 3px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.capability-body {
  min-height: 220px;
  margin-top: 14px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.analysis-alert {
  margin-top: 14px;
}

.analysis-section {
  padding: 22px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.analysis-section--last {
  padding-bottom: 0;
  border-bottom: 0;
}

.section-heading {
  gap: 14px;
  margin-bottom: 14px;
}

.section-heading__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.attribution-summary,
.distribution-summary,
.benchmark-meta,
.detail-summary {
  gap: 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.attribution-summary strong,
.detail-summary strong {
  font-size: 15px;
}

.attribution-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}

.metric-button {
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.metric-button:disabled {
  cursor: default;
  opacity: 0.55;
}

.metric-button:not(:disabled):hover {
  background: var(--el-fill-color-light);
}

.attribution-item {
  display: flex;
  min-width: 0;
  min-height: 98px;
  padding: 14px 16px;
  flex-direction: column;
  justify-content: center;
  border-left: 1px solid var(--el-border-color-lighter);
}

.attribution-item:first-child {
  border-left: 0;
}

.attribution-item span,
.attribution-item small,
.extreme-item span,
.quality-item span,
.benchmark-metric span,
.benchmark-metric small {
  color: var(--el-text-color-secondary);
}

.attribution-item strong {
  margin: 3px 0;
  font-size: 24px;
  color: var(--el-text-color-primary);
}

.cohort-table-wrap,
.group-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.cohort-table-wrap :deep(.el-table) {
  min-width: 960px;
}

.group-table-wrap :deep(.el-table) {
  min-width: 1050px;
}

.distribution-quality-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(360px, 0.75fr);
  gap: 24px;
}

.quality-panel {
  padding-left: 24px;
  border-left: 1px solid var(--el-border-color-lighter);
}

.extreme-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.extreme-item {
  display: flex;
  min-height: 64px;
  padding: 10px 14px;
  flex-direction: column;
  justify-content: center;
}

.extreme-item + .extreme-item {
  border-left: 1px solid var(--el-border-color-lighter);
}

.extreme-item strong {
  margin-top: 4px;
  font-size: 18px;
}

.wilson-band {
  padding: 14px 0;
  margin-bottom: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.wilson-band span,
.wilson-band strong {
  display: block;
}

.wilson-band span {
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.wilson-band strong {
  font-size: 20px;
  color: var(--el-text-color-primary);
}

.quality-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.quality-item {
  display: flex;
  min-height: 76px;
  padding: 10px 12px;
  flex-direction: column;
  justify-content: center;
  border-right: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.quality-item:nth-child(3n) {
  border-right: 0;
}

.quality-item:nth-last-child(-n + 3) {
  border-bottom: 0;
}

.quality-item strong {
  margin-top: 3px;
  font-size: 20px;
  color: var(--el-text-color-primary);
}

.benchmark-heading,
.benchmark-controls {
  align-items: flex-start;
}

.benchmark-controls,
.detail-filters {
  gap: 8px;
}

.benchmark-select {
  width: 148px;
}

.benchmark-body {
  min-height: 150px;
}

.benchmark-meta {
  padding: 10px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.benchmark-verdict {
  margin-bottom: 12px;
}

.benchmark-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}

.benchmark-metric {
  display: flex;
  min-width: 0;
  min-height: 92px;
  padding: 13px 15px;
  flex-direction: column;
  justify-content: center;
  border-left: 1px solid var(--el-border-color-lighter);
}

.benchmark-metric:first-child {
  border-left: 0;
}

.benchmark-metric strong {
  margin-top: 4px;
  overflow: hidden;
  font-size: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.benchmark-metric small {
  margin-top: 3px;
}

.benchmark-quadrants {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin-top: 12px;
  overflow: hidden;
  background: var(--el-border-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.benchmark-quadrant {
  display: flex;
  min-width: 0;
  min-height: 76px;
  padding: 10px 14px;
  flex-direction: column;
  justify-content: center;
  background: var(--el-bg-color);
}

.benchmark-quadrant span,
.benchmark-quadrant small {
  color: var(--el-text-color-secondary);
}

.benchmark-quadrant strong {
  margin: 3px 0;
  font-size: 20px;
  color: var(--el-text-color-primary);
}

.detail-toolbar {
  gap: 12px;
  padding-bottom: 12px;
}

.detail-filters :deep(.el-input) {
  width: 220px;
}

.detail-filters :deep(.el-select) {
  width: 130px;
}

.daily-change-cell {
  display: flex;
  min-height: 38px;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  line-height: 18px;
}

.daily-change-cell small {
  font-size: 10px;
  color: var(--el-text-color-placeholder);
}

.price-up {
  color: #b42318;
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

@media (width <= 1080px) {
  .attribution-grid,
  .benchmark-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .attribution-item:nth-child(4),
  .benchmark-metric:nth-child(4) {
    border-left: 0;
  }

  .distribution-quality-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .quality-panel {
    padding-top: 22px;
    padding-left: 0;
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 0;
  }
}

@media (width <= 720px) {
  .capability-heading,
  .section-heading,
  .detail-toolbar {
    align-items: stretch;
  }

  .attribution-summary,
  .distribution-summary,
  .benchmark-controls,
  .detail-filters {
    width: 100%;
  }

  .attribution-grid,
  .benchmark-metrics,
  .benchmark-quadrants,
  .quality-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .attribution-item:nth-child(odd),
  .benchmark-metric:nth-child(odd),
  .quality-item:nth-child(odd) {
    border-right: 1px solid var(--el-border-color-lighter);
    border-left: 0;
  }

  .attribution-item:nth-child(even),
  .benchmark-metric:nth-child(even),
  .quality-item:nth-child(even) {
    border-right: 0;
    border-left: 0;
  }

  .benchmark-select,
  .detail-filters :deep(.el-input),
  .detail-filters :deep(.el-select) {
    width: 100%;
  }

  .detail-filters {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
