import request from '@/config/axios'

export type StockAiAnalysisPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'

export interface StockAiAnalysisSessionCreateReqVO {
  period: StockAiAnalysisPeriod
  beginDate?: string
  endDate?: string
}

export interface StockAiAnalysisConfigStatusVO {
  configured: boolean
  modelId: number | null
  modelName: string | null
  model: string | null
  platform: string | null
  message: string
}

export interface StockAiAnalysisSessionVO {
  conversationId: number
  title: string
  period: StockAiAnalysisPeriod
  beginDate: string
  endDate: string
  positionCount: number
  tradeCount: number
  stockCount: number
  marketBarCount: number
  missingMarketDataCount: number
  modelName: string
  warnings: string[]
  initialPrompt: string
}

export interface StockAiAnalysisHistoryVO {
  conversationId: number
  title: string
  period: StockAiAnalysisPeriod
  model: string
  createTime: string
}

export const StockAiAnalysisApi = {
  getConfigStatus: () =>
    request.get<StockAiAnalysisConfigStatusVO>({
      url: '/finance/stock-ai-analysis/config-status'
    }),

  createSession: (data: StockAiAnalysisSessionCreateReqVO) =>
    request.post<StockAiAnalysisSessionVO>({
      url: '/finance/stock-ai-analysis/session',
      data,
      timeout: 120_000
    }),

  getHistory: () =>
    request.get<StockAiAnalysisHistoryVO[]>({
      url: '/finance/stock-ai-analysis/history'
    })
}
