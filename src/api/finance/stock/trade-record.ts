import request from '@/config/axios'
import type { FinanceMarket, PagedResult } from './index'

export type StockTradeType =
  | 'BUY'
  | 'SELL'
  | 'BANK_DEPOSIT'
  | 'BANK_WITHDRAWAL'
  | 'EX_DIVIDEND'
  | 'DIVIDEND_TAX'
  | 'SECURITY_TRANSFER_IN'
  | 'SECURITY_TRANSFER_OUT'
  | 'NEW_SHARE_CREDIT'

export interface StockTradeRecordPageParams {
  pageNo: number
  pageSize: number
  keyword?: string
  tradeType?: StockTradeType
  beginDate?: string
  endDate?: string
  sortField?: string
  sortOrder?: 'ascending' | 'descending'
}

export interface StockTradeRecordVO {
  id: number
  stockId: number | null
  market: FinanceMarket | null
  code: string | null
  stockName: string | null
  tradeType: StockTradeType
  tradeDate: string
  tradeTime: string | null
  price: string
  quantity: string
  tradeAmount: string
  commission: string
  stampDuty: string
  otherFee: string
  totalFee: string
  settlementAmount: string
  occurredAmount: string | null
  netCashFlow: string
  remark: string | null
  createTime: string
  updateTime: string
}

export interface StockTradeRecordSaveVO {
  stockId: number
  tradeType: StockTradeType
  tradeDate: string
  tradeTime?: string
  price: string
  quantity: string
  commission?: string
  stampDuty?: string
  otherFee?: string
  remark?: string
}

export interface StockTradeRecordUpdateVO extends StockTradeRecordSaveVO {
  id: number
}

export interface StockTradeRecordSummaryVO {
  recordCount: number
  buyTradeAmount: string
  sellTradeAmount: string
  totalFee: string
  netCashFlow: string
}

export const StockTradeRecordApi = {
  getPage: (params: StockTradeRecordPageParams) =>
    request.get<PagedResult<StockTradeRecordVO>>({
      url: '/finance/stock-trade-record/page',
      params
    }),

  getSummary: (params: StockTradeRecordPageParams) =>
    request.get<StockTradeRecordSummaryVO>({
      url: '/finance/stock-trade-record/summary',
      params
    }),

  create: (data: StockTradeRecordSaveVO) =>
    request.post<number>({ url: '/finance/stock-trade-record/create', data }),

  update: (data: StockTradeRecordUpdateVO) =>
    request.put<boolean>({ url: '/finance/stock-trade-record/update', data }),

  delete: (id: number) =>
    request.delete<boolean>({ url: '/finance/stock-trade-record/delete', params: { id } })
}
