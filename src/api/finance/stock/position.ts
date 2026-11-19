import request from '@/config/axios'
import type { FinanceMarket } from './index'

const PORTFOLIO_IMPORT_TIMEOUT = 300_000

export interface StockPositionVO {
  id: number
  stockId: number
  trackId: number | null
  symbol: string
  market: FinanceMarket
  code: string
  name: string
  quantity: number
  averageCostPrice: number
  openedDate: string
  remark: string | null
  holdingAmount: number | null
  dailyProfitLoss: number | null
  dailyProfitRate: number | null
  relatedSector: string | null
  sectorChangeRate: number | null
  portfolioProfitLoss: number | null
  portfolioChangeRate: number | null
  holdingProfitLoss: number | null
  holdingProfitRate: number | null
  cumulativeProfitLoss: number | null
  cumulativeProfitRate: number | null
  weeklyProfitLoss: number | null
  monthlyProfitLoss: number | null
  yearlyProfitLoss: number | null
  positionRatio: number | null
  holdingDays: number | null
  latestChangeRate: number | null
  latestPrice: number | null
  breakEvenChangeRate: number | null
  oneMonthChangeRate: number | null
  threeMonthChangeRate: number | null
  sixMonthChangeRate: number | null
  oneYearChangeRate: number | null
  importTime: string | null
  createTime: string
  updateTime: string
}

export interface StockClosedPositionVO {
  id: number
  stockId: number
  market: FinanceMarket | null
  code: string | null
  name: string | null
  closedDate: string
  totalProfitLoss: number | null
  profitRate: number | null
  benchmarkChangeRate: number | null
  excessReturnRate: number | null
  buyAveragePrice: number | null
  sellAveragePrice: number | null
  daysSinceClosed: number | null
  holdingDays: number | null
  tradingFee: number | null
  openedDate: string
  updateTime: string
}

export interface StockPortfolioImportSheetResult {
  sheetName: string
  total: number
  created: number
  updated: number
  removed: number
  skipped: number
  failed: number
}

export type StockPortfolioImportMode = 'REPLACE' | 'UPDATE'

export interface StockPortfolioImportResult {
  positions: StockPortfolioImportSheetResult
  closedPositions: StockPortfolioImportSheetResult
  trades: StockPortfolioImportSheetResult
  errors: string[]
  importedAt: string
}

export interface StockPositionCreateVO {
  stockId: number
  quantity: number
  averageCostPrice: number
  openedDate: string
  remark?: string
}

export interface StockPositionUpdateVO extends StockPositionCreateVO {
  id: number
}

export interface StockPositionAccountVO {
  totalAsset: number
  updateTime: string
}

export interface StockPositionAccountSaveVO {
  totalAsset: string
}

export interface StockPositionAssetSnapshotVO {
  id: number
  snapshotDate: string
  totalAsset: number
  holdingAsset: number
  availableAsset: number
  dailyProfitLoss: number | null
  dailyProfitRate: number | null
  netValue: number | null
  cumulativeReturnRate: number | null
  maxDrawdownRate: number | null
  positionCount: number
  missingValuationCount: number
  positionSnapshotJson: string | null
  positions?: StockPositionAssetSnapshotItemVO[]
  source: string
  updateTime: string
}

export interface StockPositionAssetSnapshotItemVO {
  stockId: number
  market: FinanceMarket | null
  code: string | null
  name: string | null
  quantity: number | null
  averageCostPrice: number | null
  latestPrice: number | null
  holdingAsset: number | null
  holdingProfitLoss: number | null
  positionRatio: number | null
}

export interface StockPositionAssetSnapshotUpdateVO {
  id: number
  snapshotDate: string
  totalAsset: string
  positions: Array<{
    stockId: number
    quantity: string
    averageCostPrice: string
    latestPrice?: string
  }>
}

export const StockPositionApi = {
  getList: () => request.get<StockPositionVO[]>({ url: '/finance/stock-position/list' }),

  getClosedList: () =>
    request.get<StockClosedPositionVO[]>({ url: '/finance/stock-position/closed-list' }),

  importPortfolio: (file: File, mode: StockPortfolioImportMode) => {
    const data = new FormData()
    data.append('file', file)
    data.append('mode', mode)
    return request.post<StockPortfolioImportResult>({
      url: '/finance/stock-position/import-portfolio',
      data,
      headersType: 'multipart/form-data',
      timeout: PORTFOLIO_IMPORT_TIMEOUT
    })
  },

  create: (data: StockPositionCreateVO) =>
    request.post<number>({ url: '/finance/stock-position/create', data }),

  update: (data: StockPositionUpdateVO) =>
    request.put<boolean>({ url: '/finance/stock-position/update', data }),

  delete: (id: number) =>
    request.delete<boolean>({ url: '/finance/stock-position/delete', params: { id } }),

  getAccount: () =>
    request.get<StockPositionAccountVO | null>({ url: '/finance/stock-position-account/get' }),

  saveAccount: (data: StockPositionAccountSaveVO) =>
    request.put<boolean>({ url: '/finance/stock-position-account/save', data }),

  saveCurrentAssetSnapshot: () =>
    request.post<StockPositionAssetSnapshotVO>({
      url: '/finance/stock-position-account/snapshot/save-current'
    }),

  getAssetSnapshotTrend: (params?: { beginDate?: string; endDate?: string }) =>
    request.get<StockPositionAssetSnapshotVO[]>({
      url: '/finance/stock-position-account/snapshot/trend',
      params
    }),

  updateAssetSnapshot: (data: StockPositionAssetSnapshotUpdateVO) =>
    request.put<StockPositionAssetSnapshotVO[]>({
      url: '/finance/stock-position-account/snapshot/update',
      data
    })
}
