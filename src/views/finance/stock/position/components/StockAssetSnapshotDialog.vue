<template>
  <el-dialog
    v-model="visible"
    title="账户资产历史"
    width="min(1120px, calc(100vw - 24px))"
    destroy-on-close
    @closed="editVisible = false"
  >
    <el-alert
      title="历史数据由每日持仓快照形成；同一天重复保存会更新当天记录。"
      type="info"
      :closable="false"
      show-icon
      class="mb-16px"
    />
    <div v-if="latestSnapshot" class="asset-snapshot-summary">
      <span
        >快照数 <strong>{{ snapshots.length }}</strong></span
      >
      <span>
        当前净值收益
        <strong :class="changeClass(latestSnapshot.cumulativeReturnRate)">
          {{ formatPercent(latestSnapshot.cumulativeReturnRate) }}
        </strong>
      </span>
      <span>
        最大回撤
        <strong :class="changeClass(latestSnapshot.maxDrawdownRate)">
          {{ formatPercent(latestSnapshot.maxDrawdownRate) }}
        </strong>
      </span>
      <span
        >最新总资产 <strong>{{ formatAmount(latestSnapshot.totalAsset) }}</strong></span
      >
    </div>
    <el-table
      v-loading="loading"
      :data="snapshots"
      stripe
      max-height="520"
      empty-text="暂无资产快照，请先保存今日快照"
    >
      <el-table-column prop="snapshotDate" label="日期" width="128" fixed />
      <el-table-column prop="totalAsset" label="总资产" min-width="130" align="right">
        <template #default="{ row }">{{ formatAmount(row.totalAsset) }}</template>
      </el-table-column>
      <el-table-column prop="holdingAsset" label="持仓市值" min-width="130" align="right">
        <template #default="{ row }">{{ formatAmount(row.holdingAsset) }}</template>
      </el-table-column>
      <el-table-column prop="availableAsset" label="可用资产" min-width="130" align="right">
        <template #default="{ row }">{{ formatAmount(row.availableAsset) }}</template>
      </el-table-column>
      <el-table-column prop="dailyProfitRate" label="当日收益" min-width="120" align="right">
        <template #default="{ row }">
          <span :class="changeClass(row.dailyProfitRate)">
            {{ formatDailyReturn(row.dailyProfitRate) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        prop="cumulativeReturnRate"
        label="累计净值收益"
        min-width="140"
        align="right"
      >
        <template #default="{ row }">
          <span :class="changeClass(row.cumulativeReturnRate)">
            {{ formatPercent(row.cumulativeReturnRate) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="maxDrawdownRate" label="最大回撤" min-width="120" align="right">
        <template #default="{ row }">
          <span :class="changeClass(row.maxDrawdownRate)">
            {{ formatPercent(row.maxDrawdownRate) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="positionCount" label="持仓数" width="90" align="right" />
      <el-table-column prop="missingValuationCount" label="缺失估值" width="100" align="right" />
      <el-table-column label="操作" width="78" fixed="right" align="center">
        <template #default="{ row }">
          <el-button
            circle
            text
            type="primary"
            :icon="Edit"
            title="编辑快照"
            @click="openEdit(row)"
          />
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="editVisible"
      :title="`编辑 ${editForm.snapshotDate} 持仓快照`"
      width="min(1080px, calc(100vw - 16px))"
      append-to-body
      destroy-on-close
      class="asset-snapshot-editor"
    >
      <div class="snapshot-editor-summary">
        <label>
          <span>快照日期</span>
          <el-date-picker
            v-model="editForm.snapshotDate"
            type="date"
            value-format="YYYY-MM-DD"
            :clearable="false"
            :disabled-date="disableSnapshotDate"
            :shortcuts="snapshotDateShortcuts"
            class="!w-full"
          />
        </label>
        <label>
          <span>总资产</span>
          <el-input v-model="editForm.totalAsset" inputmode="decimal" placeholder="0.000" />
        </label>
        <div class="derived-value">
          <span>持仓市值</span>
          <strong>{{ formatAmount(editHoldingAsset) }}</strong>
        </div>
        <div class="derived-value">
          <span>可用资产</span>
          <strong>{{ formatAmount(editAvailableAsset) }}</strong>
        </div>
      </div>

      <div class="snapshot-position-toolbar">
        <strong>逐股持仓</strong>
        <el-button type="primary" plain :icon="Plus" @click="addPosition">添加股票</el-button>
      </div>
      <el-table
        :data="editForm.positions"
        row-key="key"
        border
        max-height="460"
        empty-text="该日为空仓快照"
      >
        <el-table-column label="股票" min-width="220" fixed="left">
          <template #default="{ row }">
            <el-select v-model="row.stockId" filterable placeholder="选择股票" class="stock-select">
              <el-option
                v-for="option in stockSelectOptions"
                :key="option.stockId"
                :label="`${option.code} ${option.name}`"
                :value="option.stockId"
                :disabled="isStockDisabled(option.stockId, row.key)"
              >
                <span>{{ option.name }}</span>
                <small>{{ option.market }} · {{ option.code }}</small>
              </el-option>
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="数量" min-width="132">
          <template #default="{ row }">
            <el-input v-model="row.quantity" inputmode="decimal" placeholder="0" />
          </template>
        </el-table-column>
        <el-table-column label="成本价" min-width="132">
          <template #default="{ row }">
            <el-input v-model="row.averageCostPrice" inputmode="decimal" placeholder="0.000" />
          </template>
        </el-table-column>
        <el-table-column label="快照价" min-width="132">
          <template #default="{ row }">
            <el-input
              v-model="row.latestPrice"
              inputmode="decimal"
              placeholder="缺少估值"
              clearable
            />
          </template>
        </el-table-column>
        <el-table-column label="持仓市值" min-width="126" align="right">
          <template #default="{ row }">{{ formatAmount(positionHoldingAsset(row)) }}</template>
        </el-table-column>
        <el-table-column label="持有盈亏" min-width="126" align="right">
          <template #default="{ row }">
            <span :class="changeClass(positionProfitLoss(row))">
              {{ formatSignedAmount(positionProfitLoss(row)) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="仓位占比" min-width="112" align="right">
          <template #default="{ row }">{{ formatPercent(positionRatio(row)) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="70" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              circle
              text
              type="danger"
              :icon="Delete"
              title="移除股票"
              @click="removePosition(row.key)"
            />
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitEdit">保存并重算</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import Decimal from 'decimal.js'
import { Delete, Edit, Plus } from '@element-plus/icons-vue'
import type { StockTrackVO } from '@/api/finance/stock'
import { filterFinanceDateShortcuts } from '@/views/finance/utils/dateShortcuts'
import {
  StockPositionApi,
  type StockPositionAssetSnapshotItemVO,
  type StockPositionAssetSnapshotVO
} from '@/api/finance/stock/position'

interface EditablePosition {
  key: number
  stockId?: number
  market: string
  code: string
  name: string
  quantity: string
  averageCostPrice: string
  latestPrice: string
}

interface StockOption {
  stockId: number
  market: string
  code: string
  name: string
}

const props = defineProps<{
  snapshots: StockPositionAssetSnapshotVO[]
  loading: boolean
  stockOptions: StockTrackVO[]
}>()
const emit = defineEmits<{
  updated: [snapshots: StockPositionAssetSnapshotVO[]]
}>()

const visible = defineModel<boolean>({ required: true })
const message = useMessage()
const editVisible = ref(false)
const submitting = ref(false)
let positionKey = 0
const editForm = reactive({
  id: 0,
  snapshotDate: '',
  totalAsset: '',
  positions: [] as EditablePosition[]
})

const latestSnapshot = computed(() => props.snapshots.at(-1) ?? null)
const amountPattern = /^(?:0|[1-9]\d{0,16})(?:\.\d{1,3})?$/
const quantityPattern = /^(?:0|[1-9]\d{0,15})(?:\.\d{1,4})?$/
const pricePattern = /^(?:0|[1-9]\d{0,14})(?:\.\d{1,3})?$/

const disableSnapshotDate = (date: Date) =>
  dayjs(date).isAfter(dayjs(), 'day') ||
  props.snapshots.some(
    (snapshot) =>
      snapshot.id !== editForm.id && dayjs(snapshot.snapshotDate).isSame(dayjs(date), 'day')
  )
const snapshotDateShortcuts = computed(() => filterFinanceDateShortcuts(disableSnapshotDate))

const stockSelectOptions = computed<StockOption[]>(() => {
  const options = new Map<number, StockOption>()
  props.stockOptions.forEach((stock) =>
    options.set(stock.stockId, {
      stockId: stock.stockId,
      market: stock.market,
      code: stock.code,
      name: stock.name
    })
  )
  editForm.positions.forEach((position) => {
    if (position.stockId && !options.has(position.stockId)) {
      options.set(position.stockId, {
        stockId: position.stockId,
        market: position.market || '--',
        code: position.code || String(position.stockId),
        name: position.name || '历史持仓股票'
      })
    }
  })
  return [...options.values()].sort((left, right) => left.code.localeCompare(right.code))
})

const toDecimal = (value: string) => {
  try {
    return value === '' ? null : new Decimal(value)
  } catch {
    return null
  }
}

const positionHoldingAsset = (position: EditablePosition) => {
  const quantity = toDecimal(position.quantity)
  const price = toDecimal(position.latestPrice)
  return quantity && price ? quantity.mul(price).toNumber() : null
}

const positionProfitLoss = (position: EditablePosition) => {
  const quantity = toDecimal(position.quantity)
  const price = toDecimal(position.latestPrice)
  const cost = toDecimal(position.averageCostPrice)
  return quantity && price && cost ? price.minus(cost).mul(quantity).toNumber() : null
}

const editHoldingAssetDecimal = computed(() =>
  editForm.positions.reduce((total, position) => {
    const value = positionHoldingAsset(position)
    return value === null ? total : total.add(value)
  }, new Decimal(0))
)
const editHoldingAsset = computed(() => editHoldingAssetDecimal.value.toNumber())
const editAvailableAsset = computed(() => {
  const total = toDecimal(editForm.totalAsset)
  return total ? total.minus(editHoldingAssetDecimal.value).toNumber() : null
})

const positionRatio = (position: EditablePosition) => {
  const total = toDecimal(editForm.totalAsset)
  const holding = positionHoldingAsset(position)
  return !total || total.lte(0) || holding === null
    ? null
    : new Decimal(holding).mul(100).div(total).toNumber()
}

const mapPosition = (position: StockPositionAssetSnapshotItemVO): EditablePosition => ({
  key: ++positionKey,
  stockId: position.stockId,
  market: position.market || '',
  code: position.code || '',
  name: position.name || '',
  quantity: position.quantity == null ? '' : String(position.quantity),
  averageCostPrice: position.averageCostPrice == null ? '' : String(position.averageCostPrice),
  latestPrice: position.latestPrice == null ? '' : String(position.latestPrice)
})

const parseLegacyPositions = (
  snapshot: StockPositionAssetSnapshotVO
): StockPositionAssetSnapshotItemVO[] | null => {
  if (!snapshot.positionSnapshotJson) {
    return snapshot.positionCount === 0 ? [] : null
  }
  try {
    const parsed = JSON.parse(snapshot.positionSnapshotJson) as unknown
    if (!Array.isArray(parsed) || parsed.length !== snapshot.positionCount) return null
    return parsed.map((item) => {
      if (!item || typeof item !== 'object') throw new Error('invalid snapshot position')
      const value = item as Record<string, unknown>
      const stockId = Number(value.stockId)
      if (!Number.isSafeInteger(stockId) || stockId <= 0) {
        throw new Error('invalid snapshot stock')
      }
      const stock = props.stockOptions.find((option) => option.stockId === stockId)
      return {
        stockId,
        market: stock?.market ?? null,
        code: stock?.code ?? null,
        name: stock?.name ?? null,
        quantity: value.quantity == null ? null : Number(value.quantity),
        averageCostPrice: value.averageCostPrice == null ? null : Number(value.averageCostPrice),
        latestPrice: value.latestPrice == null ? null : Number(value.latestPrice),
        holdingAsset: value.holdingAsset == null ? null : Number(value.holdingAsset),
        holdingProfitLoss: value.holdingProfitLoss == null ? null : Number(value.holdingProfitLoss),
        positionRatio: value.positionRatio == null ? null : Number(value.positionRatio)
      }
    })
  } catch {
    return null
  }
}

const resolveSnapshotPositions = (snapshot: StockPositionAssetSnapshotVO) => {
  if (snapshot.positions?.length === snapshot.positionCount) return snapshot.positions
  return parseLegacyPositions(snapshot)
}

const openEdit = (snapshot: StockPositionAssetSnapshotVO) => {
  const positions = resolveSnapshotPositions(snapshot)
  if (positions === null) {
    message.error('该快照的历史持仓数据不完整，已阻止编辑以避免覆盖原数据')
    return
  }
  editForm.id = snapshot.id
  editForm.snapshotDate = snapshot.snapshotDate
  editForm.totalAsset = new Decimal(snapshot.totalAsset).toFixed(3)
  editForm.positions = positions.map(mapPosition)
  editVisible.value = true
}

const addPosition = () => {
  editForm.positions.push({
    key: ++positionKey,
    stockId: undefined,
    market: '',
    code: '',
    name: '',
    quantity: '',
    averageCostPrice: '',
    latestPrice: ''
  })
}

const removePosition = (key: number) => {
  editForm.positions = editForm.positions.filter((position) => position.key !== key)
}

const isStockDisabled = (stockId: number, currentKey: number) =>
  editForm.positions.some((position) => position.key !== currentKey && position.stockId === stockId)

const validateEdit = () => {
  if (!editForm.snapshotDate) {
    message.warning('请选择快照日期')
    return false
  }
  if (dayjs(editForm.snapshotDate).isAfter(dayjs(), 'day')) {
    message.warning('快照日期不能晚于当前日期')
    return false
  }
  if (
    props.snapshots.some(
      (snapshot) => snapshot.id !== editForm.id && snapshot.snapshotDate === editForm.snapshotDate
    )
  ) {
    message.warning('目标日期已存在持仓资产快照')
    return false
  }
  if (!amountPattern.test(editForm.totalAsset)) {
    message.warning('总资产必须是非负金额，最多保留 3 位小数')
    return false
  }
  const stockIds = new Set<number>()
  for (const [index, position] of editForm.positions.entries()) {
    if (!position.stockId) {
      message.warning(`第 ${index + 1} 行请选择股票`)
      return false
    }
    if (stockIds.has(position.stockId)) {
      message.warning('同一股票不能重复添加')
      return false
    }
    stockIds.add(position.stockId)
    if (!quantityPattern.test(position.quantity)) {
      message.warning(`第 ${index + 1} 行持仓数量格式不正确`)
      return false
    }
    if (
      !pricePattern.test(position.averageCostPrice) ||
      !toDecimal(position.averageCostPrice)?.gt(0)
    ) {
      message.warning(`第 ${index + 1} 行成本价必须大于 0，最多保留 3 位小数`)
      return false
    }
    if (
      position.latestPrice &&
      (!pricePattern.test(position.latestPrice) || !toDecimal(position.latestPrice)?.gt(0))
    ) {
      message.warning(`第 ${index + 1} 行快照价必须大于 0，最多保留 3 位小数`)
      return false
    }
  }
  if (editAvailableAsset.value !== null && editAvailableAsset.value < 0) {
    message.warning('总资产不能小于已估值持仓市值')
    return false
  }
  return true
}

const submitEdit = async () => {
  if (!validateEdit()) return
  submitting.value = true
  try {
    const snapshots = await StockPositionApi.updateAssetSnapshot({
      id: editForm.id,
      snapshotDate: editForm.snapshotDate,
      totalAsset: new Decimal(editForm.totalAsset).toFixed(3),
      positions: editForm.positions.map((position) => ({
        stockId: position.stockId!,
        quantity: new Decimal(position.quantity).toFixed(4),
        averageCostPrice: new Decimal(position.averageCostPrice).toFixed(3),
        latestPrice: position.latestPrice ? new Decimal(position.latestPrice).toFixed(3) : undefined
      }))
    })
    emit('updated', snapshots)
    editVisible.value = false
    message.success(`${editForm.snapshotDate} 快照已更新，资产历史已重新计算`)
  } finally {
    submitting.value = false
  }
}

const formatAmount = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : Number(value).toLocaleString('zh-CN', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
      })

const formatSignedAmount = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : `${Number(value) > 0 ? '+' : ''}${formatAmount(value)}`

const formatPercent = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%`

const formatDailyReturn = (value?: number | null) =>
  value === undefined || value === null ? '基准日' : formatPercent(value)

const changeClass = (value?: number | null) => {
  if ((value ?? 0) > 0) return 'profit-up'
  if ((value ?? 0) < 0) return 'profit-down'
  return 'profit-flat'
}
</script>

<style scoped>
.asset-snapshot-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 18px 28px;
  padding: 0 0 16px;
  color: var(--el-text-color-secondary);
}

.asset-snapshot-summary strong {
  margin-left: 6px;
  color: var(--el-text-color-primary);
}

.snapshot-editor-summary {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(220px, 1.2fr) minmax(150px, 0.8fr) minmax(
      150px,
      0.8fr
    );
  gap: 12px;
  align-items: end;
  margin-bottom: 18px;
}

.snapshot-editor-summary label,
.derived-value {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.snapshot-editor-summary label > span,
.derived-value > span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.derived-value {
  min-height: 56px;
  align-content: center;
  padding: 8px 12px;
  border-left: 2px solid var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.derived-value strong {
  font-variant-numeric: tabular-nums;
}

.snapshot-position-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.stock-select {
  width: 100%;
}

.stock-select :deep(.el-select-dropdown__item) {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.stock-select small {
  color: var(--el-text-color-secondary);
}

.profit-up {
  color: #d94848;
}

.profit-down {
  color: #22936d;
}

.profit-flat {
  color: var(--el-text-color-regular);
}

@media (max-width: 760px) {
  .snapshot-editor-summary {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

@media (max-width: 520px) {
  .snapshot-editor-summary {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
