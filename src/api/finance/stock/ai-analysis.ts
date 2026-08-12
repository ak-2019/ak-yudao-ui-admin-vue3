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

  getSession: (conversationId: number) =>
    request.get<StockAiAnalysisSessionVO>({
      url: `/finance/stock-ai-analysis/session/${conversationId}`
    })
}
