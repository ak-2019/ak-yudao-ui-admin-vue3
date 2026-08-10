import request from '@/config/axios'

export type FinanceMarket = 'SSE' | 'SZSE' | 'BSE'
export type MarketDataStatus = 'REALTIME' | 'DELAYED' | 'CACHED' | 'UNAVAILABLE'
export type StockInformationType = 'NEWS' | 'ANNOUNCEMENT' | 'RESEARCH'
export type StockTradingStatus = 'TRADING' | 'CLOSED' | 'SUSPENDED' | 'NOT_OPEN' | 'UNAVAILABLE'
export type StockDailyPriceSource = 'MANUAL' | 'EASTMONEY' | 'TENCENT'

export interface StockSearchParams {
  keyword: string
  market?: FinanceMarket
}

export interface StockSearchVO {
  id: number
  symbol: string
  market: FinanceMarket
  marketName: string
  code: string
  name: string
  status: number
  statusName: string
}

export interface StockMarketSearchVO {
  stockId: number | null
  symbol: string
  market: FinanceMarket
  marketName: string
  code: string
  name: string
  pinyin: string | null
  provider: string
  local: boolean
  tracked: boolean
}

export interface StockMarketCreateVO {
  market: FinanceMarket
  code: string
  groupId?: number
}

export interface StockTrackCreateVO {
  stockId: number
  groupId?: number
}

export interface StockTrackVO {
  id: number
  stockId: number
  symbol: string
  market: FinanceMarket
  code: string
  name: string
  groupIds: number[]
  groupNames: string[]
  tagIds: number[]
  tags: StockTagVO[]
  province: string | null
  city: string | null
  industry: string | null
  trackingStartDate: string | null
  trackingEndDate: string | null
  createTime: string
}

export interface StockTrackPeriodUpdateVO {
  id: number
  trackingStartDate: string | null
  trackingEndDate: string | null
}

export interface StockTrackPeriodBatchUpdateVO {
  trackIds: number[]
  trackingStartDate: string | null
  trackingEndDate: string | null
}

export interface StockGroupVO {
  id: number
  name: string
  sort: number
  fixed: boolean
  systemKey: 'ALL' | 'WATCHLIST' | 'POSITION' | null
  createTime: string
}

export interface StockGroupCreateVO {
  name: string
  sort?: number
}

export interface StockGroupUpdateVO extends StockGroupCreateVO {
  id: number
}

export interface StockGroupAssignVO {
  trackId: number
  groupIds: number[]
}

export type StockGroupBatchAssignMode = 'ADD' | 'REMOVE'

export interface StockGroupBatchAssignVO {
  trackIds: number[]
  groupIds: number[]
  mode: StockGroupBatchAssignMode
}

export interface StockTagVO {
  id: number
  name: string
  color: string
  sort: number
  createTime: string
}

export interface StockWorkspaceBootstrapVO {
  groups: StockGroupVO[]
  tags: StockTagVO[]
  tracks: StockTrackVO[]
}

export interface StockTagCreateVO {
  name: string
  color: string
  sort?: number
}

export interface StockTagUpdateVO extends StockTagCreateVO {
  id: number
}

export type StockTagAssignMode = 'ADD' | 'REMOVE' | 'REPLACE'

export interface StockTagAssignVO {
  trackIds: number[]
  tagIds: number[]
  newTagNames?: string[]
  mode: StockTagAssignMode
}

export interface StockIndustrySyncVO {
  requestedCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
}

export interface StockIndustrySyncParams {
  trackIds: number[]
}

export interface StockDailyPriceBaseVO {
  tradeDate: string
  openPrice: number
  closePrice: number
  highPrice: number
  lowPrice: number
  volume?: number | null
}

export interface StockDailyPriceCreateVO extends StockDailyPriceBaseVO {
  trackId: number
}

export interface StockDailyPriceUpdateVO extends StockDailyPriceBaseVO {
  id: number
}

export interface StockDailyPriceVO extends StockDailyPriceBaseVO {
  id: number
  trackId: number
  source: StockDailyPriceSource
  dailyChangePercent: number | null
  createTime: string
  updateTime: string
}

export interface StockDailyPriceHistoryParams {
  trackId: number
  beginDate: string
  endDate: string
}

export interface StockDailyPriceHistoryImportParams extends StockDailyPriceHistoryParams {
  overwriteDates: string[]
}

export interface StockDailyPriceHistoryItemVO extends StockDailyPriceBaseVO {
  exists: boolean
  existingSource: StockDailyPriceSource | null
  canOverwrite: boolean
  canBackfillVolume: boolean
}

export interface StockDailyPriceHistoryPreviewVO {
  fetchedCount: number
  importableCount: number
  overwritableCount: number
  backfillableCount: number
  skippedCount: number
  items: StockDailyPriceHistoryItemVO[]
}

export interface StockDailyPriceHistoryImportVO {
  fetchedCount: number
  importedCount: number
  updatedCount: number
  backfilledCount: number
  skippedCount: number
}

export interface StockDailyPricePageParams extends PageParam {
  trackId: number
  beginDate?: string
  endDate?: string
}

export interface StockWinRateParams {
  beginDate?: string
  endDate?: string
}

export interface StockWinRateVO {
  sampleCount: number
  winCount: number
  lossCount: number
  flatCount: number
  winRate: number | null
  startDate: string | null
  endDate: string | null
}

export interface StockStatisticsSnapshotPageParams extends PageParam {
  beginDate?: string
  endDate?: string
}

export interface StockStatisticsTrendParams {
  beginDate?: string
  endDate?: string
}

export interface StockStatisticsSnapshotBatchRebuildVO {
  snapshotDates: string[]
}

export interface StockStatisticsSnapshotBatchRebuildResultVO {
  requestedCount: number
  rebuiltCount: number
  skippedCount: number
}

export interface StockStatisticsSnapshotVO {
  id: number
  snapshotDate: string
  dailySampleCount: number
  dailyWinCount: number
  dailyLossCount: number
  dailyFlatCount: number
  dailyWinRate: number | null
  sampleCount: number
  winCount: number
  lossCount: number
  flatCount: number
  winRate: number | null
  startDate: string | null
  endDate: string | null
  createTime: string
  updateTime: string
}

export type StockStatisticsResult = 'WIN' | 'LOSS' | 'FLAT'
export type StockStatisticsType = 'DAILY' | 'CUMULATIVE'
export type StockReliabilityLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
export type StockBenchmark = 'CSI300' | 'SSE_COMPOSITE' | 'SZSE_COMPONENT'

export interface StockStatisticsSnapshotDetailVO {
  snapshotDate: string
  statisticsType: StockStatisticsType
  trackId: number
  stockId: number
  symbol: string
  market: FinanceMarket
  code: string
  name: string
  trackingStartDate: string
  trackingEndDate: string | null
  firstTradeDate: string
  lastTradeDate: string
  firstClosePrice: number
  lastClosePrice: number
  changePercent: number
  result: StockStatisticsResult
}

export interface StockCapabilityFactVO {
  trackId: number
  stockId: number
  market: FinanceMarket
  code: string
  name: string
  symbol: string
  trackingStartDate: string | null
  trackingEndDate: string | null
  groupIds: number[]
  groupNames: string[]
  activeAsOf: boolean
  d0Available: boolean
  firstValidDate: string | null
  lastValidDate: string | null
  validTradingDays: number
  currentDailyChangePercent: number | null
  currentDailyResult: StockStatisticsResult | null
  latestDailyDate: string | null
  latestDailyChangePercent: number | null
  tracking5ChangePercent: number | null
  tracking5Result: StockStatisticsResult | null
  tracking10ChangePercent: number | null
  tracking10Result: StockStatisticsResult | null
  cumulativeChangePercent: number | null
  cumulativeResult: StockStatisticsResult | null
  previousCumulativeChangePercent: number | null
  previousCumulativeResult: StockStatisticsResult | null
}

export interface StockCapabilityMetricVO {
  horizon: string
  dayOffset: number
  sampleCount: number
  winCount: number
  lossCount: number
  flatCount: number
  successRate: number | null
  averageChangePercent: number | null
  trackIds: number[]
}

export interface StockCapabilityCohortVO {
  trackingStartDate: string
  stockCount: number
  horizons: StockCapabilityMetricVO[]
  averageCumulativeChangePercent: number | null
  trackIds: number[]
}

export interface StockCapabilityAttributionCategoryVO {
  type: 'NEW' | 'TURNED_WIN' | 'TURNED_LOSS' | 'EXITED_OR_MISSING' | 'UNCHANGED'
  label: string
  count: number
  trackIds: number[]
}

export interface StockCapabilityAttributionVO {
  currentDate: string
  previousDate: string | null
  currentSampleCount: number
  previousSampleCount: number
  currentSuccessRate: number | null
  previousSuccessRate: number | null
  changePercentagePoints: number | null
  categories: StockCapabilityAttributionCategoryVO[]
}

export interface StockCapabilityDistributionBucketVO {
  key: 'GT_3' | 'ZERO_TO_3' | 'NEG_3_TO_ZERO' | 'LT_NEG_3'
  label: string
  count: number
  trackIds: number[]
}

export interface StockCapabilityDistributionVO {
  sampleCount: number
  averageChangePercent: number | null
  medianChangePercent: number | null
  maximumChangePercent: number | null
  maximumTrackIds: number[]
  minimumChangePercent: number | null
  minimumTrackIds: number[]
  buckets: StockCapabilityDistributionBucketVO[]
}

export interface StockCapabilityGroupVO {
  groupId: number
  groupName: string
  systemKey: 'ALL' | 'WATCHLIST' | 'POSITION' | null
  fixed: boolean
  stockCount: number
  validSampleCount: number
  dailySuccessRate: number | null
  tracking5SuccessRate: number | null
  cumulativeSuccessRate: number | null
  averageCumulativeChangePercent: number | null
  missingCount: number
  trackIds: number[]
}

export interface StockCapabilityQualityVO {
  poolStockCount: number
  startedCount: number
  currentActiveCount: number
  endedCount: number
  cumulativeValidCount: number
  dailyMissingCount: number
  d0MissingCount: number
  insufficient5Count: number
  insufficient10Count: number
  latestLocalDataDate: string | null
  reliabilityLevel: StockReliabilityLevel
  wilsonLowerPercent: number | null
  wilsonUpperPercent: number | null
}

export interface StockCapabilityAnalysisVO {
  asOfDate: string
  previousDate: string | null
  stocks: StockCapabilityFactVO[]
  cohorts: StockCapabilityCohortVO[]
  attribution: StockCapabilityAttributionVO
  distribution: StockCapabilityDistributionVO
  groups: StockCapabilityGroupVO[]
  quality: StockCapabilityQualityVO
}

export interface StockBenchmarkDetailVO {
  trackId: number
  stockId: number
  market: FinanceMarket
  code: string
  name: string
  trackingStartDate: string
  comparisonEndDate: string
  stockChangePercent: number
  benchmarkChangePercent: number | null
  excessChangePercent: number | null
  outperform: boolean | null
  missingReason: string | null
}

export interface StockBenchmarkComparisonVO {
  benchmark: StockBenchmark
  benchmarkName: string
  benchmarkSymbol: string
  asOfDate: string
  stockSampleCount: number
  validSampleCount: number
  missingSampleCount: number
  averageStockChangePercent: number | null
  averageBenchmarkChangePercent: number | null
  averageExcessChangePercent: number | null
  outperformCount: number
  outperformRate: number | null
  details: StockBenchmarkDetailVO[]
}

export interface StockDailyPriceChartParams {
  trackId: number
  beginDate?: string
  endDate?: string
}

export interface StockPriceChangeVO {
  trackId: number
  recordCount: number
  fiveDayChangePercent: number | null
  tenDayChangePercent: number | null
  trackingCumulativeChangePercent: number | null
}

export interface MarketDataResult<T> {
  status: MarketDataStatus
  provider: string | null
  sourceTime: string | null
  fetchedAt: string
  data: T | null
  message: string | null
}

export interface StockQuoteVO {
  market: FinanceMarket
  code: string
  openPrice: number
  latestPrice: number
  highPrice: number
  lowPrice: number
  previousClosePrice: number
  changeAmount: number
  changePercent: number
  tradingStatus: StockTradingStatus
  source: string
  dataTime: string
  fetchedAt: string
  dataStatus: MarketDataStatus
}

export interface TradingCalendarVO {
  market: FinanceMarket
  tradeDate: string
  tradingDay: boolean
}

export interface StockInformationVO {
  type: StockInformationType
  title: string
  source: string
  announcementType: string | null
  publishedAt: string
  summary: string | null
  url: string
}

export interface StockInformationLocalVO extends StockInformationVO {
  id: number
  trackId: number | null
  stockId: number
  market: FinanceMarket
  code: string
  stockName: string
  provider: string
  fetchedAt: string
}

export interface StockInformationSyncVO {
  requested: number
  succeeded: number
  failed: number
  fetched: number
  inserted: number
  updated: number
  latestFetchedAt: string | null
}

export interface StockResearchReportVO {
  title: string
  institution: string
  rating: string | null
  author: string | null
  reportDate: string
  summary: string | null
  url: string
}

export interface StockPerformanceVO {
  reportPeriod: string | null
  reportType: string | null
  revenue: number | null
  revenueYearOnYear: number | null
  revenueQuarterOnQuarter: number | null
  netProfit: number | null
  netProfitYearOnYear: number | null
  netProfitQuarterOnQuarter: number | null
  updatedAt: string | null
}

export interface StockShareholderCountVO {
  statisticsDate: string | null
  shareholderCount: number | null
  changePercent: number | null
}

export interface StockTopShareholderVO {
  rank: number | null
  shareholderName: string | null
  shareholderNature: string | null
  holdingShares: number | null
  holdingRatio: number | null
  holdingChangeShares: number | null
  holdingChangePercent: number | null
  holdingChangeDescription: string | null
  reportPeriod: string | null
  sharesType: string | null
}

export interface StockFundamentalVO {
  totalMarketValue: number | null
  circulatingMarketValue: number | null
  peTtm: number | null
  lossMaking: boolean | null
  valuationDate: string | null
  revenue: number | null
  revenueYearOnYear: number | null
  netProfit: number | null
  netProfitYearOnYear: number | null
  reportPeriod: string | null
  reportType: string | null
  shareholderCount: number | null
  shareholderChangePercent: number | null
  shareholderStatisticsDate: string | null
  performances: StockPerformanceVO[]
  shareholderCounts: StockShareholderCountVO[]
  topShareholders: StockTopShareholderVO[]
  source: string | null
  lastUpdated: string | null
}

export interface PagedResult<T> {
  list: T[]
  total: number
}

export interface StockInformationPageParams extends PageParam {
  trackId: number
  type: StockInformationType
}

export interface StockInformationLocalPageParams extends StockInformationPageParams {
  keyword?: string
}

export interface StockInformationGroupPageParams extends PageParam {
  groupId: number
  type: StockInformationType
  keyword?: string
}

export interface StockInformationSyncTrackVO {
  trackId: number
  type: StockInformationType
}

export interface StockInformationSyncGroupVO {
  groupId: number
  type: StockInformationType
}

export interface StockResearchReportPageParams extends PageParam {
  trackId: number
}

export const StockApi = {
  search: (params: StockSearchParams) =>
    request.get<StockSearchVO[]>({ url: '/finance/stock/search', params }),

  marketSearch: (params: StockSearchParams) =>
    request.get<MarketDataResult<StockMarketSearchVO[]>>({
      url: '/finance/stock/market-search',
      params
    }),

  getWorkspaceBootstrap: () =>
    request.get<StockWorkspaceBootstrapVO>({ url: '/finance/stock-workspace/bootstrap' }),

  getTrackList: () => request.get<StockTrackVO[]>({ url: '/finance/stock-track/list' }),

  createTrack: (data: StockTrackCreateVO) =>
    request.post<number>({ url: '/finance/stock-track/create', data }),

  createMarketTrack: (data: StockMarketCreateVO) =>
    request.post<number>({ url: '/finance/stock-track/create-market', data }),

  deleteTrack: (id: number) =>
    request.delete<boolean>({ url: '/finance/stock-track/delete', params: { id } }),

  updateTrackingPeriod: (data: StockTrackPeriodUpdateVO) =>
    request.put<boolean>({ url: '/finance/stock-track/update-period', data }),

  updateTrackingPeriodBatch: (data: StockTrackPeriodBatchUpdateVO) =>
    request.put<boolean>({ url: '/finance/stock-track/update-period-batch', data }),

  getGroupList: () => request.get<StockGroupVO[]>({ url: '/finance/stock-group/list' }),

  createGroup: (data: StockGroupCreateVO) =>
    request.post<number>({ url: '/finance/stock-group/create', data }),

  updateGroup: (data: StockGroupUpdateVO) =>
    request.put<boolean>({ url: '/finance/stock-group/update', data }),

  deleteGroup: (id: number) =>
    request.delete<boolean>({ url: '/finance/stock-group/delete', params: { id } }),

  assignTrackGroups: (data: StockGroupAssignVO) =>
    request.put<boolean>({ url: '/finance/stock-group/assign', data }),

  assignTrackGroupsBatch: (data: StockGroupBatchAssignVO) =>
    request.put<boolean>({ url: '/finance/stock-group/assign-batch', data }),

  getTagList: () => request.get<StockTagVO[]>({ url: '/finance/stock-tag/list' }),

  createTag: (data: StockTagCreateVO) =>
    request.post<number>({ url: '/finance/stock-tag/create', data }),

  updateTag: (data: StockTagUpdateVO) =>
    request.put<boolean>({ url: '/finance/stock-tag/update', data }),

  deleteTag: (id: number) =>
    request.delete<boolean>({ url: '/finance/stock-tag/delete', params: { id } }),

  assignTrackTags: (data: StockTagAssignVO) =>
    request.put<boolean>({ url: '/finance/stock-tag/assign', data }),

  syncIndustry: (data: StockIndustrySyncParams) =>
    request.post<StockIndustrySyncVO>({ url: '/finance/stock/sync-industry', data }),

  getDailyPricePage: (params: StockDailyPricePageParams) =>
    request.get<PagedResult<StockDailyPriceVO>>({
      url: '/finance/stock-daily-price/page',
      params
    }),

  getDailyPrice: (id: number) =>
    request.get<StockDailyPriceVO>({ url: '/finance/stock-daily-price/get', params: { id } }),

  getChartList: (params: StockDailyPriceChartParams) =>
    request.get<StockDailyPriceVO[]>({ url: '/finance/stock-daily-price/chart-list', params }),

  createDailyPrice: (data: StockDailyPriceCreateVO) =>
    request.post<number>({ url: '/finance/stock-daily-price/create', data }),

  updateDailyPrice: (data: StockDailyPriceUpdateVO) =>
    request.put<boolean>({ url: '/finance/stock-daily-price/update', data }),

  deleteDailyPrice: (id: number) =>
    request.delete<boolean>({ url: '/finance/stock-daily-price/delete', params: { id } }),

  previewDailyPriceHistory: (params: StockDailyPriceHistoryParams) =>
    request.get<MarketDataResult<StockDailyPriceHistoryPreviewVO>>({
      url: '/finance/stock-daily-price/history-preview',
      params
    }),

  importDailyPriceHistory: (data: StockDailyPriceHistoryImportParams) =>
    request.post<StockDailyPriceHistoryImportVO>({
      url: '/finance/stock-daily-price/history-import',
      data
    }),

  getWinRate: (params: StockWinRateParams = {}) =>
    request.get<StockWinRateVO>({ url: '/finance/stock-statistics/win-rate', params }),

  getStatisticsSnapshotPage: (params: StockStatisticsSnapshotPageParams) =>
    request.get<PagedResult<StockStatisticsSnapshotVO>>({
      url: '/finance/stock-statistics/snapshot-page',
      params
    }),

  getStatisticsSnapshotTrend: (params: StockStatisticsTrendParams = {}) =>
    request.get<StockStatisticsSnapshotVO[]>({
      url: '/finance/stock-statistics/snapshot-trend',
      params
    }),

  getCapabilityAnalysis: (asOfDate: string) =>
    request.get<StockCapabilityAnalysisVO>({
      url: '/finance/stock-statistics/capability-analysis',
      params: { asOfDate }
    }),

  getBenchmarkComparison: (asOfDate: string, benchmark: StockBenchmark) =>
    request.get<MarketDataResult<StockBenchmarkComparisonVO>>({
      url: '/finance/stock-statistics/benchmark-comparison',
      params: { asOfDate, benchmark }
    }),

  getSnapshotDetails: (snapshotDate: string, statisticsType: StockStatisticsType) =>
    request.get<StockStatisticsSnapshotDetailVO[]>({
      url: '/finance/stock-statistics/snapshot-detail',
      params: { snapshotDate, statisticsType }
    }),

  rebuildStatisticsSnapshots: () =>
    request.post<number>({ url: '/finance/stock-statistics/snapshot-rebuild' }),

  rebuildStatisticsSnapshotsBatch: (data: StockStatisticsSnapshotBatchRebuildVO) =>
    request.post<StockStatisticsSnapshotBatchRebuildResultVO>({
      url: '/finance/stock-statistics/snapshot-rebuild-batch',
      data
    }),

  rebuildSnapshotDate: (snapshotDate: string) =>
    request.post<StockStatisticsSnapshotVO>({
      url: '/finance/stock-statistics/snapshot-rebuild-date',
      params: { snapshotDate }
    }),

  getPriceChange: (trackId: number) =>
    request.get<StockPriceChangeVO>({
      url: '/finance/stock-statistics/price-change',
      params: { trackId }
    }),

  getPriceChangeList: () =>
    request.get<StockPriceChangeVO[]>({
      url: '/finance/stock-statistics/price-change-list'
    }),

  getQuote: (trackId: number) =>
    request.get<MarketDataResult<StockQuoteVO>>({
      url: '/finance/stock-market/quote',
      params: { trackId }
    }),

  getTradingDay: (trackId: number, tradeDate: string) =>
    request.get<MarketDataResult<TradingCalendarVO>>({
      url: '/finance/stock-market/trading-day',
      params: { trackId, tradeDate }
    }),

  getInformationPage: (params: StockInformationPageParams) =>
    request.get<MarketDataResult<PagedResult<StockInformationVO>>>({
      url: '/finance/stock-information/page',
      params
    }),

  getLocalInformationPage: (params: StockInformationLocalPageParams) =>
    request.get<MarketDataResult<PagedResult<StockInformationLocalVO>>>({
      url: '/finance/stock-information/local-page',
      params
    }),

  getGroupInformationPage: (params: StockInformationGroupPageParams) =>
    request.get<MarketDataResult<PagedResult<StockInformationLocalVO>>>({
      url: '/finance/stock-information/group-page',
      params
    }),

  syncTrackInformation: (data: StockInformationSyncTrackVO) =>
    request.post<StockInformationSyncVO>({
      url: '/finance/stock-information/sync-track',
      data
    }),

  syncGroupInformation: (data: StockInformationSyncGroupVO) =>
    request.post<StockInformationSyncVO>({
      url: '/finance/stock-information/sync-group',
      data
    }),

  getResearchReportPage: (params: StockResearchReportPageParams) =>
    request.get<MarketDataResult<PagedResult<StockResearchReportVO>>>({
      url: '/finance/stock-research-report/page',
      params
    }),

  getFundamental: (trackId: number) =>
    request.get<MarketDataResult<StockFundamentalVO>>({
      url: '/finance/stock-fundamental/get',
      params: { trackId }
    })
}
