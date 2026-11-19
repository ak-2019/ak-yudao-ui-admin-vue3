import request from '@/config/axios'

export type StockAiAnalysisPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
export type StockAiAnalysisScope = 'COMPREHENSIVE' | 'POSITION' | 'CLOSED_POSITION' | 'TRADE_RECORD'

export interface StockAiAnalysisSessionCreateReqVO {
  scope: StockAiAnalysisScope
  period: StockAiAnalysisPeriod
  beginDate?: string
  endDate?: string
}

export interface StockAiSingleAnalysisSessionCreateReqVO {
  trackId: number
}

export interface StockAiSingleAnalysisSessionVO {
  conversationId: number
  title: string
  modelName: string
  trackId: number
  market: string
  code: string
  name: string
  dataAsOf: string | null
  marketBarCount: number
  warnings: string[]
  initialPrompt: string
}

export interface StockAiAnalysisConfigStatusVO {
  configured: boolean
  modelId: number | null
  modelName: string | null
  model: string | null
  platform: string | null
  message: string
}

export interface StockAiAnalysisAccountVO {
  positionCount: number
  totalAsset: number | null
  holdingMarketValue: number | null
  availableAsset: number | null
  positionRatio: number | null
  holdingProfitLoss: number | null
  holdingProfitRate: number | null
  topThreeConcentration: number | null
  largestPositionRatio: number | null
}

export interface StockAiAnalysisTradeVO {
  recordCount: number
  securityTradeCount: number
  buyCount: number
  sellCount: number
  tradedStockCount: number
  sameDayRoundTripCount: number
  chaseBuyCount: number
  panicSellCount: number
  buyAmount: number | null
  sellAmount: number | null
  totalFee: number | null
  closedPositionCount: number
  profitableClosedCount: number
  losingClosedCount: number
  realizedProfitLoss: number | null
  closedWinRate: number | null
  profitFactor: number | null
  averageWin: number | null
  averageLoss: number | null
}

export interface StockAiAnalysisPerformanceVO {
  primaryBenchmarkName: string | null
  primaryBenchmarkCode: string | null
  primaryBenchmarkChange: number | null
  positionProxy: boolean
  currentPositionProxyReturn: number | null
  accountNetValueReturn: number | null
  accountMaxDrawdown: number | null
  accountHistoryCount: number | null
  excessReturn: number | null
  bestStockCode: string | null
  bestStockName: string | null
  bestStockChange: number | null
  weakestStockCode: string | null
  weakestStockName: string | null
  weakestStockChange: number | null
}

export interface StockAiAnalysisDataQualityVO {
  score: number
  completeMarketStockCount: number
  missingMarketStockCount: number
  marketCoverageRate: number | null
  eventCount: number
  accountHistoryAvailable: boolean
  intradayDataAvailable: boolean
  orderDataAvailable: boolean
  messages: string[]
}

export interface StockAiAnalysisBenchmarkVO {
  name: string
  market: string
  code: string
  periodChange: number | null
  tradingDayCount: number
}

export interface StockAiAnalysisStockVO {
  stockId: number
  market: string
  code: string
  name: string
  industry: string | null
  holding: boolean
  positionRatio: number | null
  holdingProfitLoss: number | null
  holdingProfitRate: number | null
  periodChange: number | null
  benchmarkName: string | null
  benchmarkChange: number | null
  excessReturn: number | null
  maxDrawdown: number | null
  volatility: number | null
  tradingDayCount: number
  tradeCount: number
  buyCount: number
  sellCount: number
  buyAmount: number | null
  sellAmount: number | null
  totalFee: number | null
  averageBuyPrice: number | null
  averageSellPrice: number | null
  chaseBuyCount: number
  panicSellCount: number
  technicalSummary: string | null
  evidenceId: string
}

export interface StockAiAnalysisRiskVO {
  code: string
  level: 'HIGH' | 'MEDIUM' | 'INFO' | string
  title: string
  detail: string
  stockCode: string | null
  evidenceId: string
}

export interface StockAiAnalysisEventVO {
  stockId: number | null
  stockCode: string | null
  stockName: string | null
  type: string | null
  title: string | null
  source: string | null
  publishedAt: string | null
  evidenceId: string
}

export type StockTradeEpisodeStatus = 'OPEN' | 'CLOSED' | 'INCOMPLETE' | 'INVALID'
export type StockTradeSide = 'BUY' | 'SELL'
export type StockDecisionDimension =
  | 'STOCK_SELECTION'
  | 'ENTRY'
  | 'EXIT'
  | 'POSITION'
  | 'DISCIPLINE'
export type StockDecisionScoreStatus = 'SCOREABLE' | 'LOW_SAMPLE' | 'NOT_SCORABLE'
export type StockDecisionType = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
export type StockTradePlanCheckStatus = 'ADHERED' | 'VIOLATED' | 'NOT_JUDGABLE'
export type StockAttributionCategory =
  | 'MARKET'
  | 'INDUSTRY_STYLE'
  | 'STOCK_EXCESS'
  | 'TIMING'
  | 'POSITION'
  | 'FEES'
  | 'CASH_FLOW'
  | 'UNATTRIBUTED'
export type StockAttributionStatus = 'EXACT' | 'DERIVED' | 'FALLBACK' | 'UNAVAILABLE'

export interface StockTradeFillVO {
  tradeId: number | null
  stockId: number | null
  side: StockTradeSide
  tradeDate: string | null
  tradeTime: string | null
  price: number | null
  quantity: number | null
  matchedQuantity: number | null
  unmatchedQuantity: number | null
  positionQuantityAfter: number | null
  positionCostAfter: number | null
  averageCostAfter: number | null
  realizedProfitLoss: number | null
  totalFee: number | null
  analysisRange: boolean
  evidenceId: string
  issues: string[]
}

export interface StockTradeEpisodeVO {
  episodeId: string
  tenantId: number
  userId: number
  stockId: number | null
  status: StockTradeEpisodeStatus
  beginDate: string | null
  endDate: string | null
  totalBuyQuantity: number | null
  totalSellQuantity: number | null
  remainingQuantity: number | null
  remainingCost: number | null
  realizedProfitLoss: number | null
  totalFee: number | null
  analysisTradeCount: number
  startedBeforeAnalysisRange: boolean
  closedAfterAnalysisRange: boolean
  fills: StockTradeFillVO[]
  issues: string[]
}

export interface StockTradeHorizonPerformanceVO {
  tradingDay: number
  observationDate: string | null
  observationClose: number | null
  stockReturnRate: number | null
  benchmarkReturnRate: number | null
  excessReturnRate: number | null
  sampleCount: number
  coverageRate: number | null
  evidenceIds: string[]
  issues: string[]
}

export interface StockTradeFillPerformanceVO {
  evidenceId: string
  tradeEvidenceId: string
  side: StockTradeSide
  tradeDate: string | null
  tradePrice: number | null
  sampleCount: number
  coverageRate: number | null
  horizons: StockTradeHorizonPerformanceVO[]
}

export interface StockTradeMetricCoverageVO {
  expectedHoldingTradingDays: number
  availableHoldingTradingDays: number
  expectedPostTradeNodes: number
  availableStockNodes: number
  availableBenchmarkNodes: number
  stockHoldingCoverageRate: number | null
  stockNodeCoverageRate: number | null
  benchmarkNodeCoverageRate: number | null
}

export interface StockTradeDecisionMetricVO {
  calculationVersion: string
  episodeId: string
  evidenceId: string
  stockId: number | null
  valuationDate: string | null
  valuationClose: number | null
  averageBuyPrice: number | null
  averageSellPrice: number | null
  realizedProfitLoss: number | null
  unrealizedProfitLoss: number | null
  grossProfitLoss: number | null
  totalFee: number | null
  netProfitLoss: number | null
  episodeReturnRate: number | null
  benchmarkReturnRate: number | null
  excessReturnRate: number | null
  mfeRate: number | null
  maeRate: number | null
  maxFloatingProfit: number | null
  maxProfitGivebackAmount: number | null
  maxProfitGivebackRate: number | null
  holdingTradingDays: number
  sampleCount: number
  coverageRate: number | null
  benchmark: {
    name: string | null
    code: string | null
    fallbackReason: string | null
    evidenceId: string | null
  } | null
  dataCoverage: StockTradeMetricCoverageVO | null
  fillPerformances: StockTradeFillPerformanceVO[]
  evidenceIds: string[]
  issues: string[]
}

export interface StockDecisionDimensionVO {
  dimension: StockDecisionDimension
  status: StockDecisionScoreStatus
  score: number | null
  sampleCount: number
  coverageRate: number | null
  positiveFactors: string[]
  negativeFactors: string[]
  evidenceIds: string[]
  calculationVersion: string
}

export interface StockTradePlanCheckVO {
  field: string
  status: StockTradePlanCheckStatus
  plannedValue: string | null
  actualValue: string | null
  explanation: string
  evidenceIds: string[]
}

export interface StockTradePlanAiFactVO {
  field: string
  content: string
  confidence: string
  warning: string
  evidenceId: string
}

export interface StockTradePlanAuditVO {
  calculationVersion: string
  episodeId: string
  stockId: number | null
  planId: number | null
  planStatus: string | null
  firstTradeTime: string | null
  establishedTime: string | null
  planModifiedTime: string | null
  reviewModifiedTime: string | null
  preTradePlan: boolean
  structuredPlanTrusted: boolean
  checkCount: number
  adheredCount: number
  violatedCount: number
  notJudgableCount: number
  adherenceRate: number | null
  coverageRate: number | null
  checks: StockTradePlanCheckVO[]
  aiInterpretationFacts: StockTradePlanAiFactVO[]
  evidenceIds: string[]
  issues: string[]
}

export interface StockKeyDecisionVO {
  episodeId: string
  stockId: number | null
  type: StockDecisionType
  impactAmount: number | null
  impactRate: number | null
  excessReturnRate: number | null
  summary: string
  evidenceIds: string[]
}

export interface StockAttributionItemVO {
  category: StockAttributionCategory
  status: StockAttributionStatus
  amount: number | null
  proportion: number | null
  includedInProfitLoss: boolean
  sampleCount: number
  coverageRate: number | null
  explanation: string
  evidenceIds: string[]
}

export interface StockPerformanceAttributionVO {
  calculationVersion: string
  totalProfitLoss: number | null
  explainedProfitLoss: number | null
  reconciliationDifference: number | null
  cashFlowAmount: number | null
  items: StockAttributionItemVO[]
  issues: string[]
}

export interface StockDecisionDataCoverageVO {
  episodeCount: number
  metricCount: number
  scoreableEpisodeCount: number
  averageCoverageRate: number | null
  stockHoldingCoverageRate: number | null
  stockNodeCoverageRate: number | null
  benchmarkNodeCoverageRate: number | null
  issues: string[]
}

export interface StockAiAnalysisDashboardVO {
  promptVersion: string
  account: StockAiAnalysisAccountVO
  trades: StockAiAnalysisTradeVO
  performance: StockAiAnalysisPerformanceVO
  dataQuality: StockAiAnalysisDataQualityVO
  benchmarks: StockAiAnalysisBenchmarkVO[]
  stocks: StockAiAnalysisStockVO[]
  risks: StockAiAnalysisRiskVO[]
  events: StockAiAnalysisEventVO[]
  calculationVersion?: string | null
  episodes?: StockTradeEpisodeVO[]
  decisionMetrics?: StockTradeDecisionMetricVO[]
  decisionQuality?: StockDecisionDimensionVO[]
  planAudits?: StockTradePlanAuditVO[]
  keyDecisions?: StockKeyDecisionVO[]
  attribution?: StockPerformanceAttributionVO | null
  dataCoverage?: StockDecisionDataCoverageVO | null
}

export interface StockSystemAnalysisVO {
  scope: StockAiAnalysisScope
  period: StockAiAnalysisPeriod
  beginDate: string
  endDate: string
  positionCount: number
  tradeCount: number
  stockCount: number
  marketBarCount: number
  missingMarketDataCount: number
  warnings: string[]
  dashboard: StockAiAnalysisDashboardVO
}

export interface StockAiAnalysisSessionVO extends StockSystemAnalysisVO {
  conversationId: number
  title: string
  modelName: string
  initialPrompt: string
}

export interface StockAiAnalysisHistoryVO {
  conversationId: number
  title: string
  scope: StockAiAnalysisScope
  period: StockAiAnalysisPeriod
  model: string
  createTime: string
  beginDate: string | null
  endDate: string | null
}

export type StockAiCapabilityDimension =
  | 'STOCK_SELECTION'
  | 'ENTRY'
  | 'EXIT'
  | 'POSITION'
  | 'DISCIPLINE'

export interface StockAiCapabilityTrendPointVO {
  conversationId: number
  title: string
  scope: StockAiAnalysisScope
  period: StockAiAnalysisPeriod
  beginDate: string
  endDate: string
  scores: Partial<Record<StockAiCapabilityDimension, number | null>>
  scoreStatuses: Partial<Record<StockAiCapabilityDimension, string>>
  averageScore: number | null
  excessReturn: number | null
  dataQualityScore: number | null
  episodeCount: number
  coverageRate: number | null
  lowSample: boolean
}

export interface StockAiBehaviorPatternVO {
  text: string
  occurrenceCount: number
  conversationIds: number[]
  firstDate: string | null
  lastDate: string | null
}

export interface StockAiCapabilityTrendVO {
  points: StockAiCapabilityTrendPointVO[]
  repeatedErrors: StockAiBehaviorPatternVO[]
  positiveBehaviors: StockAiBehaviorPatternVO[]
}

export const StockAiAnalysisApi = {
  getConfigStatus: () =>
    request.get<StockAiAnalysisConfigStatusVO>({
      url: '/finance/stock-ai-analysis/config-status'
    }),

  analyzeDashboard: (data: StockAiAnalysisSessionCreateReqVO) =>
    request.post<StockSystemAnalysisVO>({
      url: '/finance/stock-ai-analysis/dashboard',
      data,
      timeout: 120_000
    }),

  createSession: (data: StockAiAnalysisSessionCreateReqVO) =>
    request.post<StockAiAnalysisSessionVO>({
      url: '/finance/stock-ai-analysis/session',
      data,
      timeout: 120_000
    }),

  createSingleStockSession: (data: StockAiSingleAnalysisSessionCreateReqVO) =>
    request.post<StockAiSingleAnalysisSessionVO>({
      url: '/finance/stock-ai-analysis/single-session',
      data,
      timeout: 120_000
    }),

  getHistory: () =>
    request.get<StockAiAnalysisHistoryVO[]>({
      url: '/finance/stock-ai-analysis/history'
    }),

  getCapabilityTrend: () =>
    request.get<StockAiCapabilityTrendVO>({
      url: '/finance/stock-ai-analysis/capability-trend'
    }),

  getSession: (conversationId: number) =>
    request.get<StockAiAnalysisSessionVO>({
      url: `/finance/stock-ai-analysis/session/${conversationId}`
    })
}
