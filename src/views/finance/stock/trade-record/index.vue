<template>
  <StockWorkspaceNav />
  <ContentWrap>
    <div class="trade-toolbar">
      <el-input
        v-model="query.keyword"
        class="trade-search"
        clearable
        placeholder="股票代码或名称"
        :prefix-icon="Search"
        @keyup.enter="handleQuery"
      />
      <el-select v-model="query.tradeType" class="type-filter" clearable placeholder="全部方向">
        <el-option label="买入" value="BUY" />
        <el-option label="卖出" value="SELL" />
        <el-option label="银行转存" value="BANK_DEPOSIT" />
        <el-option label="银行转取" value="BANK_WITHDRAWAL" />
        <el-option label="除权除息" value="EX_DIVIDEND" />
        <el-option label="股息个税" value="DIVIDEND_TAX" />
        <el-option label="证券转入" value="SECURITY_TRANSFER_IN" />
        <el-option label="证券转出" value="SECURITY_TRANSFER_OUT" />
        <el-option label="新股到账" value="NEW_SHARE_CREDIT" />
      </el-select>
      <el-date-picker
        v-model="query.dateRange"
        class="date-filter"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        range-separator="至"
        clearable
        :shortcuts="financeDateRangeShortcuts"
      />
      <el-button type="primary" @click="handleQuery">
        <Icon icon="ep:search" class="mr-5px" />
        查询
      </el-button>
      <el-button :disabled="!hasFilters" @click="resetQuery">
        <Icon icon="ep:refresh-left" class="mr-5px" />
        重置
      </el-button>
      <div class="toolbar-spacer"></div>
      <el-button
        type="primary"
        v-hasPermi="['finance:stock-trade-record:create']"
        @click="openCreate"
      >
        <Icon icon="ep:plus" class="mr-5px" />
        录入成交
      </el-button>
      <el-tooltip content="刷新成交记录和汇总" placement="top">
        <el-button circle :loading="loading" aria-label="刷新成交记录和汇总" @click="loadData">
          <Icon icon="ep:refresh" />
        </el-button>
      </el-tooltip>
    </div>
  </ContentWrap>

  <ContentWrap>
    <div class="trade-summary">
      <section class="summary-metric">
        <span>成交记录</span>
        <strong>{{ summary.recordCount }}</strong>
      </section>
      <section class="summary-metric summary-metric--buy">
        <span>买入成交额</span>
        <strong>{{ formatMoney(summary.buyTradeAmount) }}</strong>
      </section>
      <section class="summary-metric summary-metric--sell">
        <span>卖出成交额</span>
        <strong>{{ formatMoney(summary.sellTradeAmount) }}</strong>
      </section>
      <section class="summary-metric">
        <span>总费用</span>
        <strong>{{ formatMoney(summary.totalFee) }}</strong>
      </section>
      <section class="summary-metric" :class="cashFlowClass(summary.netCashFlow)">
        <span>净资金流</span>
        <strong>{{ formatSignedMoney(summary.netCashFlow) }}</strong>
      </section>
    </div>
  </ContentWrap>

  <ContentWrap>
    <el-table
      v-loading="loading"
      :data="records"
      row-key="id"
      stripe
      table-layout="fixed"
      empty-text="暂无成交记录"
      @sort-change="handleSortChange"
    >
      <el-table-column prop="stockId" label="股票" min-width="150" sortable="custom">
        <template #default="{ row }">
          <div class="stock-name">{{ row.stockId ? row.stockName || '--' : '资金流水' }}</div>
          <div class="stock-code">{{ row.stockId ? stockSymbol(row) : '银行资金' }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="tradeType" label="方向" width="86" align="center" sortable="custom">
        <template #default="{ row }">
          <el-tag :type="tradeTypeTagTypes[row.tradeType]" effect="plain">
            {{ tradeTypeLabels[row.tradeType] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="tradeDate" label="成交日期" width="116" sortable="custom" />
      <el-table-column prop="tradeTime" label="时间" width="96" sortable="custom">
        <template #default="{ row }">{{ formatTradeTime(row.tradeTime) }}</template>
      </el-table-column>
      <el-table-column prop="price" label="成交价" width="108" align="right" sortable="custom">
        <template #default="{ row }">{{ formatMoney(row.price) }}</template>
      </el-table-column>
      <el-table-column prop="quantity" label="数量" width="112" align="right" sortable="custom">
        <template #default="{ row }">{{ formatQuantity(row.quantity) }}</template>
      </el-table-column>
      <el-table-column
        prop="tradeAmount"
        label="成交金额"
        width="132"
        align="right"
        sortable="custom"
      >
        <template #default="{ row }">{{ formatMoney(row.tradeAmount) }}</template>
      </el-table-column>
      <el-table-column prop="commission" label="佣金" width="104" align="right" sortable="custom">
        <template #default="{ row }">{{ formatMoney(row.commission) }}</template>
      </el-table-column>
      <el-table-column prop="stampDuty" label="印花税" width="104" align="right" sortable="custom">
        <template #default="{ row }">{{ formatMoney(row.stampDuty) }}</template>
      </el-table-column>
      <el-table-column prop="otherFee" label="其他费用" width="112" align="right" sortable="custom">
        <template #default="{ row }">{{ formatMoney(row.otherFee) }}</template>
      </el-table-column>
      <el-table-column prop="totalFee" label="总费用" width="104" align="right" sortable="custom">
        <template #default="{ row }">{{ formatMoney(row.totalFee) }}</template>
      </el-table-column>
      <el-table-column
        prop="settlementAmount"
        label="结算金额"
        width="132"
        align="right"
        sortable="custom"
      >
        <template #default="{ row }">{{ formatMoney(row.settlementAmount) }}</template>
      </el-table-column>
      <el-table-column
        prop="netCashFlow"
        label="资金流"
        width="132"
        align="right"
        sortable="custom"
      >
        <template #default="{ row }">
          <span :class="cashFlowClass(row.netCashFlow)">
            {{ formatSignedMoney(row.netCashFlow) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        prop="remark"
        label="备注"
        min-width="180"
        sortable="custom"
        show-overflow-tooltip
      >
        <template #default="{ row }">{{ row.remark || '--' }}</template>
      </el-table-column>
      <el-table-column prop="updateTime" label="更新时间" width="176" sortable="custom">
        <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right" align="center">
        <template #default="{ row }">
          <div class="row-actions">
            <el-tooltip
              v-if="isStockTrade(row.tradeType) && row.stockId !== null"
              content="交易计划"
              placement="top"
            >
              <el-button
                link
                type="success"
                aria-label="查看或建立交易计划"
                v-hasPermi="['finance:stock-trade-plan:query']"
                @click="openTradePlan(row)"
              >
                <Icon icon="ep:memo" />
              </el-button>
            </el-tooltip>
            <el-tooltip v-if="isStockTrade(row.tradeType)" content="编辑成交记录" placement="top">
              <el-button
                link
                type="primary"
                aria-label="编辑成交记录"
                v-hasPermi="['finance:stock-trade-record:update']"
                @click="openEdit(row)"
              >
                <Icon icon="ep:edit" />
              </el-button>
            </el-tooltip>
            <el-tooltip content="删除成交记录" placement="top">
              <el-button
                link
                type="danger"
                aria-label="删除成交记录"
                v-hasPermi="['finance:stock-trade-record:delete']"
                @click="handleDelete(row)"
              >
                <Icon icon="ep:delete" />
              </el-button>
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <Pagination
      v-show="total > 0"
      v-model:page="query.pageNo"
      v-model:limit="query.pageSize"
      :total="total"
      @pagination="loadData"
    />
  </ContentWrap>

  <el-dialog
    v-model="formVisible"
    :title="formMode === 'create' ? '录入成交记录' : '编辑成交记录'"
    width="min(680px, calc(100vw - 24px))"
    destroy-on-close
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="88px">
      <div class="form-grid">
        <el-form-item label="股票" prop="stockId" class="form-span-2">
          <el-select
            v-model="formData.stockId"
            class="w-100%"
            filterable
            remote
            reserve-keyword
            :remote-method="searchFormStocks"
            :loading="stockSearchLoading"
            placeholder="输入股票代码、名称或拼音"
          >
            <el-option
              v-for="stock in formStockOptions"
              :key="stock.id"
              :label="`${stock.name}（${stock.symbol}）`"
              :value="stock.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="方向" prop="tradeType" class="form-span-2">
          <el-segmented v-model="formData.tradeType" :options="tradeTypeOptions" class="w-100%" />
        </el-form-item>
        <el-form-item label="成交日期" prop="tradeDate">
          <el-date-picker
            v-model="formData.tradeDate"
            class="w-100%"
            type="date"
            value-format="YYYY-MM-DD"
            :clearable="false"
            :disabled-date="disableFutureDate"
            :shortcuts="financeDateShortcuts"
          />
        </el-form-item>
        <el-form-item label="成交时间" prop="tradeTime">
          <el-time-picker
            v-model="formData.tradeTime"
            class="w-100%"
            value-format="HH:mm:ss"
            placeholder="可选"
            clearable
          />
        </el-form-item>
        <el-form-item label="成交价格" prop="price">
          <el-input v-model="formData.price" inputmode="decimal" placeholder="0.000">
            <template #append>元</template>
          </el-input>
        </el-form-item>
        <el-form-item label="成交数量" prop="quantity">
          <el-input v-model="formData.quantity" inputmode="decimal" placeholder="0.0000">
            <template #append>股</template>
          </el-input>
        </el-form-item>
        <el-form-item label="佣金" prop="commission">
          <el-input v-model="formData.commission" inputmode="decimal" placeholder="0.000" />
        </el-form-item>
        <el-form-item label="印花税" prop="stampDuty">
          <el-input v-model="formData.stampDuty" inputmode="decimal" placeholder="0.000" />
        </el-form-item>
        <el-form-item label="其他费用" prop="otherFee">
          <el-input v-model="formData.otherFee" inputmode="decimal" placeholder="0.000" />
        </el-form-item>
        <el-form-item label="备注" prop="remark" class="form-span-2">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="2"
            maxlength="500"
            show-word-limit
            placeholder="可记录成交来源或计划"
          />
        </el-form-item>
      </div>
    </el-form>

    <div class="settlement-preview">
      <div>
        <span>成交金额</span>
        <strong>{{ formatMoney(formPreview.tradeAmount) }}</strong>
      </div>
      <div>
        <span>总费用</span>
        <strong>{{ formatMoney(formPreview.totalFee) }}</strong>
      </div>
      <div :class="formData.tradeType === 'BUY' ? 'cash-outflow' : 'cash-inflow'">
        <span>{{ formData.tradeType === 'BUY' ? '预计流出' : '预计流入' }}</span>
        <strong>{{ formatMoney(formPreview.settlementAmount) }}</strong>
      </div>
    </div>
    <el-alert
      v-if="formPreview.invalidSettlement"
      type="error"
      :closable="false"
      show-icon
      title="卖出总费用不能大于成交金额"
      class="mt-12px"
    />

    <template #footer>
      <el-button :disabled="submitLoading" @click="formVisible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="submitLoading"
        :disabled="formPreview.invalidSettlement"
        @click="submitForm"
      >
        保存
      </el-button>
    </template>
  </el-dialog>
  <StockTradePlanDialog ref="tradePlanDialogRef" />
</template>

<script setup lang="ts">
import Decimal from 'decimal.js'
import dayjs from 'dayjs'
import { Search } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { FinanceMarket, StockApi, StockSearchVO } from '@/api/finance/stock'
import {
  financeDateRangeShortcuts,
  financeDateShortcuts
} from '@/views/finance/utils/dateShortcuts'
import {
  StockTradeRecordApi,
  StockTradeRecordPageParams,
  StockTradeRecordSummaryVO,
  StockTradeRecordVO,
  StockTradeType
} from '@/api/finance/stock/trade-record'
import StockWorkspaceNav from '../components/StockWorkspaceNav.vue'
import StockTradePlanDialog from '../components/StockTradePlanDialog.vue'

defineOptions({ name: 'FinanceStockTradeRecord' })

interface TradeQuery {
  pageNo: number
  pageSize: number
  keyword: string
  tradeType?: StockTradeType
  dateRange: [string, string] | null
  sortField?: string
  sortOrder?: 'ascending' | 'descending'
}

interface TradeForm {
  id?: number
  stockId: number | null
  tradeType: StockSecurityTradeType
  tradeDate: string
  tradeTime: string
  price: string
  quantity: string
  commission: string
  stampDuty: string
  otherFee: string
  remark: string
}

const message = useMessage()
const loading = ref(false)
const submitLoading = ref(false)
const stockSearchLoading = ref(false)
const records = ref<StockTradeRecordVO[]>([])
const total = ref(0)
const formVisible = ref(false)
const formMode = ref<'create' | 'update'>('create')
const formRef = ref<FormInstance>()
const formStockOptions = ref<StockSearchVO[]>([])
const tradePlanDialogRef = ref<InstanceType<typeof StockTradePlanDialog>>()
const marketLabels: Record<FinanceMarket, string> = {
  SSE: '沪',
  SZSE: '深',
  BSE: '北'
}
type StockSecurityTradeType = Extract<StockTradeType, 'BUY' | 'SELL'>
const tradeTypeLabels: Record<StockTradeType, string> = {
  BUY: '买入',
  SELL: '卖出',
  BANK_DEPOSIT: '银行转存',
  BANK_WITHDRAWAL: '银行转取',
  EX_DIVIDEND: '除权除息',
  DIVIDEND_TAX: '股息个税',
  SECURITY_TRANSFER_IN: '证券转入',
  SECURITY_TRANSFER_OUT: '证券转出',
  NEW_SHARE_CREDIT: '新股到账'
}
const tradeTypeTagTypes: Record<
  StockTradeType,
  'primary' | 'danger' | 'success' | 'info' | 'warning'
> = {
  BUY: 'danger',
  SELL: 'success',
  BANK_DEPOSIT: 'info',
  BANK_WITHDRAWAL: 'warning',
  EX_DIVIDEND: 'primary',
  DIVIDEND_TAX: 'warning',
  SECURITY_TRANSFER_IN: 'success',
  SECURITY_TRANSFER_OUT: 'info',
  NEW_SHARE_CREDIT: 'primary'
}
const isStockTrade = (tradeType: StockTradeType): tradeType is StockSecurityTradeType =>
  tradeType === 'BUY' || tradeType === 'SELL'

const emptySummary = (): StockTradeRecordSummaryVO => ({
  recordCount: 0,
  buyTradeAmount: '0',
  sellTradeAmount: '0',
  totalFee: '0',
  netCashFlow: '0'
})

const emptyForm = (): TradeForm => ({
  stockId: null,
  tradeType: 'BUY',
  tradeDate: dayjs().format('YYYY-MM-DD'),
  tradeTime: '',
  price: '',
  quantity: '',
  commission: '0',
  stampDuty: '0',
  otherFee: '0',
  remark: ''
})

const query = reactive<TradeQuery>({
  pageNo: 1,
  pageSize: 10,
  keyword: '',
  dateRange: null
})
const summary = ref<StockTradeRecordSummaryVO>(emptySummary())
const formData = reactive<TradeForm>(emptyForm())
const tradeTypeOptions = [
  { label: '买入', value: 'BUY' },
  { label: '卖出', value: 'SELL' }
]

const hasFilters = computed(() =>
  Boolean(query.keyword.trim() || query.tradeType || query.dateRange)
)

const decimalValue = (value: string) => {
  if (!value.trim()) return null
  try {
    const decimal = new Decimal(value)
    return decimal.isFinite() ? decimal : null
  } catch {
    return null
  }
}

const formPreview = computed(() => {
  const price = decimalValue(formData.price)
  const quantity = decimalValue(formData.quantity)
  const commission = decimalValue(formData.commission) ?? new Decimal(0)
  const stampDuty = decimalValue(formData.stampDuty) ?? new Decimal(0)
  const otherFee = decimalValue(formData.otherFee) ?? new Decimal(0)
  if (!price || !quantity || price.lte(0) || quantity.lte(0)) {
    return { tradeAmount: null, totalFee: null, settlementAmount: null, invalidSettlement: false }
  }
  const tradeAmount = price.mul(quantity).toDecimalPlaces(3)
  const totalFee = commission.add(stampDuty).add(otherFee).toDecimalPlaces(3)
  const settlementAmount =
    formData.tradeType === 'BUY'
      ? tradeAmount.add(totalFee).toDecimalPlaces(3)
      : tradeAmount.sub(totalFee).toDecimalPlaces(3)
  return {
    tradeAmount: tradeAmount.toFixed(3),
    totalFee: totalFee.toFixed(3),
    settlementAmount: settlementAmount.gte(0) ? settlementAmount.toFixed(3) : null,
    invalidSettlement: settlementAmount.lt(0)
  }
})

const decimalRule = (label: string, scale: number, allowZero = false) => ({
  validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
    const decimal = decimalValue(value)
    if (!decimal || (allowZero ? decimal.lt(0) : decimal.lte(0))) {
      callback(new Error(`${label}${allowZero ? '不能小于 0' : '必须大于 0'}`))
      return
    }
    const decimalPlaces = decimal.decimalPlaces()
    if (decimalPlaces > scale) {
      callback(new Error(`${label}最多保留 ${scale} 位小数`))
      return
    }
    callback()
  },
  trigger: ['blur', 'change']
})

const formRules: FormRules<TradeForm> = {
  stockId: [{ required: true, message: '请选择股票', trigger: 'change' }],
  tradeType: [{ required: true, message: '请选择成交方向', trigger: 'change' }],
  tradeDate: [{ required: true, message: '请选择成交日期', trigger: 'change' }],
  price: [decimalRule('成交价格', 3)],
  quantity: [decimalRule('成交数量', 4)],
  commission: [decimalRule('佣金', 3, true)],
  stampDuty: [decimalRule('印花税', 3, true)],
  otherFee: [decimalRule('其他费用', 3, true)]
}

const buildParams = (): StockTradeRecordPageParams => ({
  pageNo: query.pageNo,
  pageSize: query.pageSize,
  keyword: query.keyword.trim() || undefined,
  tradeType: query.tradeType,
  beginDate: query.dateRange?.[0],
  endDate: query.dateRange?.[1],
  sortField: query.sortField,
  sortOrder: query.sortOrder
})

const loadData = async () => {
  loading.value = true
  try {
    const params = buildParams()
    const [page, summaryResult] = await Promise.all([
      StockTradeRecordApi.getPage(params),
      StockTradeRecordApi.getSummary(params)
    ])
    records.value = page.list
    total.value = page.total
    summary.value = summaryResult
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  query.pageNo = 1
  loadData()
}

const resetQuery = () => {
  query.keyword = ''
  query.tradeType = undefined
  query.dateRange = null
  query.sortField = undefined
  query.sortOrder = undefined
  handleQuery()
}

const handleSortChange = ({
  prop,
  order
}: {
  prop: string
  order: 'ascending' | 'descending' | null
}) => {
  query.sortField = order ? prop : undefined
  query.sortOrder = order ?? undefined
  query.pageNo = 1
  loadData()
}

const resetForm = () => {
  Object.assign(formData, emptyForm())
  formStockOptions.value = []
  nextTick(() => formRef.value?.clearValidate())
}

const openCreate = () => {
  formMode.value = 'create'
  resetForm()
  formVisible.value = true
}

const openEdit = (row: StockTradeRecordVO) => {
  if (!isStockTrade(row.tradeType) || row.stockId === null) return
  formMode.value = 'update'
  Object.assign(formData, {
    id: row.id,
    stockId: row.stockId,
    tradeType: row.tradeType,
    tradeDate: row.tradeDate,
    tradeTime: row.tradeTime || '',
    price: String(row.price),
    quantity: String(row.quantity),
    commission: String(row.commission),
    stampDuty: String(row.stampDuty),
    otherFee: String(row.otherFee),
    remark: row.remark || ''
  })
  formStockOptions.value = [
    {
      id: row.stockId,
      symbol: stockSymbol(row),
      market: row.market || 'SSE',
      marketName: row.market ? marketLabels[row.market] : '--',
      code: row.code || '',
      name: row.stockName || '--',
      status: 1,
      statusName: '正常'
    }
  ]
  formVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

const openTradePlan = (row: StockTradeRecordVO) => {
  if (row.stockId === null) return
  tradePlanDialogRef.value?.open({
    stockId: row.stockId,
    market: row.market,
    code: row.code,
    name: row.stockName
  })
}

let stockSearchRequestId = 0
const searchFormStocks = async (keyword: string) => {
  const normalized = keyword.trim()
  const requestId = ++stockSearchRequestId
  if (!normalized) {
    formStockOptions.value = []
    return
  }
  stockSearchLoading.value = true
  try {
    const result = await StockApi.search({ keyword: normalized })
    if (requestId === stockSearchRequestId) {
      formStockOptions.value = result
    }
  } finally {
    if (requestId === stockSearchRequestId) stockSearchLoading.value = false
  }
}

const submitForm = async () => {
  await formRef.value?.validate()
  if (!formData.stockId || formPreview.value.invalidSettlement) return
  submitLoading.value = true
  try {
    const payload = {
      stockId: formData.stockId,
      tradeType: formData.tradeType,
      tradeDate: formData.tradeDate,
      tradeTime: formData.tradeTime || undefined,
      price: formData.price,
      quantity: formData.quantity,
      commission: formData.commission || '0',
      stampDuty: formData.stampDuty || '0',
      otherFee: formData.otherFee || '0',
      remark: formData.remark.trim() || undefined
    }
    if (formMode.value === 'create') {
      await StockTradeRecordApi.create(payload)
      message.success('成交记录已创建')
    } else if (formData.id) {
      await StockTradeRecordApi.update({ id: formData.id, ...payload })
      message.success('成交记录已更新')
    }
    formVisible.value = false
    await loadData()
  } finally {
    submitLoading.value = false
  }
}

const handleDelete = async (row: StockTradeRecordVO) => {
  await message.delConfirm(
    `确定删除 ${row.stockName || row.code || tradeTypeLabels[row.tradeType]} 的成交记录吗？`
  )
  await StockTradeRecordApi.delete(row.id)
  message.success('成交记录已删除')
  if (records.value.length === 1 && query.pageNo > 1) query.pageNo -= 1
  await loadData()
}

const stockSymbol = (row: Pick<StockTradeRecordVO, 'market' | 'code'>) => {
  if (!row.code) return '--'
  return row.market ? `${marketLabels[row.market]}${row.code}` : row.code
}

const formatMoney = (value: string | number | Decimal | null) => {
  if (value === null || value === undefined || value === '') return '--'
  try {
    return new Decimal(value).toFixed(3)
  } catch {
    return '--'
  }
}

const formatSignedMoney = (value: string | number | null) => {
  if (value === null || value === undefined || value === '') return '--'
  try {
    const decimal = new Decimal(value)
    return `${decimal.gt(0) ? '+' : ''}${decimal.toFixed(3)}`
  } catch {
    return '--'
  }
}

const formatQuantity = (value: string | null) => {
  if (!value) return '--'
  try {
    return new Decimal(value).toDecimalPlaces(4).toFixed()
  } catch {
    return '--'
  }
}

const cashFlowClass = (value: string | number | null) => {
  if (value === null || value === undefined || value === '') return ''
  try {
    const decimal = new Decimal(value)
    return decimal.gt(0) ? 'cash-inflow' : decimal.lt(0) ? 'cash-outflow' : ''
  } catch {
    return ''
  }
}

const formatTradeTime = (value: string | null) => (value ? value.slice(0, 8) : '--')
const formatDateTime = (value: string | null) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '--'
const disableFutureDate = (date: Date) => dayjs(date).isAfter(dayjs(), 'day')

onMounted(loadData)
</script>

<style scoped>
.trade-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.trade-search {
  width: min(260px, 100%);
}

.type-filter {
  width: 130px;
}

.date-filter {
  width: 260px;
}

.toolbar-spacer {
  flex: 1 1 12px;
}

.trade-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.summary-metric {
  min-width: 0;
  padding: 12px 14px;
  background: var(--el-fill-color-lighter);
  border-left: 3px solid var(--el-border-color);
}

.summary-metric span {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.summary-metric strong {
  display: block;
  overflow: hidden;
  font-size: 20px;
  line-height: 1.2;
  text-overflow: ellipsis;
}

.summary-metric--buy,
.cash-outflow {
  color: var(--el-color-danger);
}

.summary-metric--sell,
.cash-inflow {
  color: var(--el-color-success);
}

.stock-name {
  font-weight: 600;
}

.stock-code {
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

.form-span-2 {
  grid-column: 1 / -1;
}

.settlement-preview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding-top: 14px;
  margin-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.settlement-preview div {
  min-width: 0;
}

.settlement-preview span {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.settlement-preview strong {
  font-size: 18px;
}

@media (width <= 900px) {
  .trade-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 640px) {
  .trade-search,
  .type-filter,
  .date-filter {
    width: 100%;
  }

  .toolbar-spacer {
    display: none;
  }

  .trade-summary,
  .form-grid,
  .settlement-preview {
    grid-template-columns: 1fr;
  }

  .form-span-2 {
    grid-column: auto;
  }
}
</style>
