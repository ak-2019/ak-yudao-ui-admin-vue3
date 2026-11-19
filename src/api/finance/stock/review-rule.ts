import request from '@/config/axios'

export type StockReviewRuleType = 'KEEP' | 'IMPROVE' | 'PROHIBIT'
export type StockReviewRuleStatus = 'DRAFT' | 'ENABLED' | 'DISABLED' | 'ARCHIVED'
export type StockReviewRulePeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
export type StockReviewRuleExecutionStatus =
  | 'NOT_TRIGGERED'
  | 'NOT_JUDGABLE'
  | 'ADHERED'
  | 'VIOLATED'

export interface StockReviewRuleVO {
  id: number
  name: string
  ruleType: StockReviewRuleType
  status: StockReviewRuleStatus
  scope: string | null
  triggerCondition: string | null
  expectedAction: string | null
  invalidationCondition: string | null
  checkPeriod: string | null
  evaluationMetric: string | null
  evaluationOperator: string | null
  thresholdValue: number | null
  adherenceMetric: string | null
  adherenceOperator: string | null
  adherenceThresholdValue: number | null
  sourceReportId: string | null
  sampleCount: number | null
  backtested: boolean
  note: string | null
  archivedTime: string | null
  createTime: string
  updateTime: string
}

export interface StockReviewRuleSaveVO {
  name: string
  ruleType: StockReviewRuleType
  status: Exclude<StockReviewRuleStatus, 'ARCHIVED'>
  scope?: string
  triggerCondition?: string
  expectedAction?: string
  invalidationCondition?: string
  checkPeriod?: string
  evaluationMetric?: string
  evaluationOperator?: string
  thresholdValue?: number
  adherenceMetric?: string
  adherenceOperator?: string
  adherenceThresholdValue?: number
  sourceReportId?: string
  sampleCount?: number
  note?: string
}

export interface StockReviewRuleUpdateVO extends StockReviewRuleSaveVO {
  id: number
}

export interface StockReviewRuleExecutionVO {
  id: number
  ruleId: number
  ruleName: string
  periodType: StockReviewRulePeriod
  beginDate: string
  endDate: string
  ruleSnapshotJson: string
  triggerCount: number
  judgeableCount: number
  adheredCount: number
  violatedCount: number
  notJudgableCount: number
  profitLossImpact: number | null
  excessReturnImpact: number | null
  systemStatus: StockReviewRuleExecutionStatus
  correctedStatus: StockReviewRuleExecutionStatus | null
  effectiveStatus: StockReviewRuleExecutionStatus
  correctionReason: string | null
  correctedBy: number | null
  correctedTime: string | null
  evidenceJson: string
  executionKey: string
  createTime: string
  updateTime: string
}

export interface StockReviewRuleExecutionQuery {
  ruleId?: number
  periodType?: StockReviewRulePeriod
  beginDate?: string
  endDate?: string
}

export const StockReviewRuleApi = {
  getList: (params?: { status?: StockReviewRuleStatus; ruleType?: StockReviewRuleType }) =>
    request.get<StockReviewRuleVO[]>({ url: '/finance/stock-review-rule/list', params }),

  create: (data: StockReviewRuleSaveVO) =>
    request.post<number>({ url: '/finance/stock-review-rule/create', data }),

  update: (data: StockReviewRuleUpdateVO) =>
    request.put<boolean>({ url: '/finance/stock-review-rule/update', data }),

  updateStatus: (data: { id: number; status: 'ENABLED' | 'DISABLED' | 'ARCHIVED' }) =>
    request.put<boolean>({ url: '/finance/stock-review-rule/status', data }),

  rebuildExecution: (data: {
    ruleId: number
    periodType: StockReviewRulePeriod
    beginDate: string
    endDate: string
  }) =>
    request.post<StockReviewRuleExecutionVO>({
      url: '/finance/stock-review-rule/execution/rebuild',
      data,
      timeout: 120_000
    }),

  getExecutionList: (params?: StockReviewRuleExecutionQuery) =>
    request.get<StockReviewRuleExecutionVO[]>({
      url: '/finance/stock-review-rule/execution/list',
      params
    }),

  correctExecution: (data: {
    id: number
    correctedStatus: 'ADHERED' | 'VIOLATED' | 'NOT_JUDGABLE'
    correctionReason: string
  }) =>
    request.put<StockReviewRuleExecutionVO>({
      url: '/finance/stock-review-rule/execution/correct',
      data
    })
}
