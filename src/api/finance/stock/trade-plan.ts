import request from '@/config/axios'
import type { FinanceMarket } from './index'

export type StockTradePlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'

export interface StockTradePlanVO {
  id: number
  stockId: number
  market: FinanceMarket
  code: string
  name: string
  episodeId: string | null
  status: StockTradePlanStatus
  tradeStyle: string | null
  strategyType: string | null
  entryLogic: string | null
  triggerCondition: string | null
  invalidationCondition: string | null
  plannedBuyPriceMin: number | null
  plannedBuyPriceMax: number | null
  stopLossPrice: number | null
  targetPrice: number | null
  maxPositionRate: number | null
  maxLossAmount: number | null
  plannedHoldingDays: number | null
  exitReason: string | null
  changeReason: string | null
  emotionTag: string | null
  reviewRemark: string | null
  establishedTime: string
  planModifiedTime: string
  reviewModifiedTime: string | null
  createTime: string
  updateTime: string
}

export interface StockTradePlanSaveVO {
  stockId: number
  episodeId?: string
  status: StockTradePlanStatus
  tradeStyle?: string
  strategyType?: string
  entryLogic?: string
  triggerCondition?: string
  invalidationCondition?: string
  plannedBuyPriceMin?: number
  plannedBuyPriceMax?: number
  stopLossPrice?: number
  targetPrice?: number
  maxPositionRate?: number
  maxLossAmount?: number
  plannedHoldingDays?: number
  exitReason?: string
  changeReason?: string
  emotionTag?: string
  reviewRemark?: string
}

export interface StockTradePlanUpdateVO extends StockTradePlanSaveVO {
  id: number
}

export interface StockTradePlanQuery {
  stockId?: number
  status?: StockTradePlanStatus
  episodeId?: string
}

export interface StockTradePlanTemplateVO {
  key: 'BREAKOUT' | 'PULLBACK' | 'TREND' | 'EVENT'
  name: string
  strategyType: string
  triggerExample: string
  invalidationExample: string
}

export interface StockTradePlanRecommendationDraftVO {
  tradeStyle: string | null
  strategyType: string | null
  entryLogic: string | null
  triggerCondition: string | null
  invalidationCondition: string | null
  plannedBuyPriceMin: number | null
  plannedBuyPriceMax: number | null
  stopLossPrice: number | null
  targetPrice: number | null
  maxPositionRate: number | null
  maxLossAmount: number | null
  plannedHoldingDays: number | null
  emotionTag: string | null
  reviewRemark: string | null
}

export interface StockTradePlanRecommendationVO {
  trackId: number
  market: FinanceMarket
  code: string
  name: string
  draft: StockTradePlanRecommendationDraftVO
  evidence: string[]
  risks: string[]
  missingData: string[]
  dataAsOf: string | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  modelName: string
  warnings: string[]
}

export const StockTradePlanApi = {
  getList: (params?: StockTradePlanQuery) =>
    request.get<StockTradePlanVO[]>({ url: '/finance/stock-trade-plan/list', params }),

  get: (id: number) =>
    request.get<StockTradePlanVO>({ url: '/finance/stock-trade-plan/get', params: { id } }),

  getTemplates: () =>
    request.get<StockTradePlanTemplateVO[]>({ url: '/finance/stock-trade-plan/templates' }),

  recommend: (trackId: number) =>
    request.post<StockTradePlanRecommendationVO>({
      url: '/finance/stock-ai-analysis/trade-plan-recommendation',
      data: { trackId }
    }),

  create: (data: StockTradePlanSaveVO) =>
    request.post<number>({ url: '/finance/stock-trade-plan/create', data }),

  update: (data: StockTradePlanUpdateVO) =>
    request.put<boolean>({ url: '/finance/stock-trade-plan/update', data }),

  delete: (id: number) =>
    request.delete<boolean>({ url: '/finance/stock-trade-plan/delete', params: { id } })
}
