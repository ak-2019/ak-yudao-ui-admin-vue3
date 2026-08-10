<template>
  <Dialog v-model="dialogVisible" title="导入历史行情" width="980px">
    <div class="history-toolbar">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        :disabled-date="disableFutureDate"
        :shortcuts="financeDateRangeShortcuts"
        class="history-date-picker"
      />
      <el-button type="primary" :loading="previewLoading" @click="loadPreview">
        <Icon icon="ep:search" class="mr-5px" />
        获取预览
      </el-button>
    </div>

    <MarketResultMeta v-if="previewResult" label="历史行情预览" :result="previewResult" />

    <el-descriptions v-if="previewResult?.data" :column="5" border class="history-summary">
      <el-descriptions-item label="获取记录">
        {{ previewResult.data.fetchedCount }} 条
      </el-descriptions-item>
      <el-descriptions-item label="可导入">
        <span class="importable-count">{{ previewResult.data.importableCount }} 条</span>
      </el-descriptions-item>
      <el-descriptions-item label="可覆盖手工记录">
        <span class="overwritable-count">{{ previewResult.data.overwritableCount }} 条</span>
      </el-descriptions-item>
      <el-descriptions-item label="可回填量能">
        <span class="backfillable-count">{{ previewResult.data.backfillableCount }} 条</span>
      </el-descriptions-item>
      <el-descriptions-item label="已有记录">
        {{ previewResult.data.skippedCount }} 条
      </el-descriptions-item>
    </el-descriptions>

    <el-table
      v-loading="previewLoading"
      :data="previewResult?.data?.items ?? []"
      stripe
      table-layout="fixed"
      max-height="420"
      empty-text="请选择日期区间获取历史行情"
    >
      <el-table-column label="交易日期" prop="tradeDate" min-width="120" />
      <el-table-column label="开盘" min-width="110" align="right">
        <template #default="{ row }">{{ formatPrice(row.openPrice) }}</template>
      </el-table-column>
      <el-table-column label="收盘" min-width="110" align="right">
        <template #default="{ row }">{{ formatPrice(row.closePrice) }}</template>
      </el-table-column>
      <el-table-column label="最高" min-width="110" align="right">
        <template #default="{ row }">{{ formatPrice(row.highPrice) }}</template>
      </el-table-column>
      <el-table-column label="最低" min-width="110" align="right">
        <template #default="{ row }">{{ formatPrice(row.lowPrice) }}</template>
      </el-table-column>
      <el-table-column label="成交量（手）" min-width="140" align="right">
        <template #default="{ row }">{{ formatVolume(row.volume) }}</template>
      </el-table-column>
      <el-table-column label="当前状态" min-width="160" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row)" effect="plain">
            {{ getStatusLabel(row) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="处理方式" min-width="120" align="center">
        <template #default="{ row }">
          <el-checkbox-group v-if="row.canOverwrite" v-model="overwriteDates">
            <el-checkbox :value="row.tradeDate">覆盖</el-checkbox>
          </el-checkbox-group>
          <span v-else class="not-overwritable">-</span>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button
        type="primary"
        :loading="importLoading"
        :disabled="!canSubmit"
        @click="submitImport"
      >
        <Icon icon="ep:download" class="mr-5px" />
        确认导入
      </el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { financeDateRangeShortcuts } from '@/views/finance/utils/dateShortcuts'
import {
  MarketDataResult,
  StockApi,
  StockDailyPriceHistoryImportParams,
  StockDailyPriceHistoryItemVO,
  StockDailyPriceHistoryParams,
  StockDailyPriceHistoryPreviewVO,
  StockDailyPriceSource,
  StockTrackVO
} from '@/api/finance/stock'
import MarketResultMeta from './MarketResultMeta.vue'

defineOptions({ name: 'FinanceStockHistoryImportDialog' })

const message = useMessage()
const dialogVisible = ref(false)
const previewLoading = ref(false)
const importLoading = ref(false)
const track = ref<StockTrackVO>()
const dateRange = ref<[string, string]>()
const previewResult = ref<MarketDataResult<StockDailyPriceHistoryPreviewVO>>()
const overwriteDates = ref<string[]>([])

const sourceLabelMap: Record<StockDailyPriceSource, string> = {
  MANUAL: '手工录入',
  EASTMONEY: '东方财富',
  TENCENT: '腾讯'
}

const selectedOverwriteCount = computed(() => overwriteDates.value.length)
const canSubmit = computed(
  () =>
    (previewResult.value?.data?.importableCount ?? 0) > 0 ||
    (previewResult.value?.data?.backfillableCount ?? 0) > 0 ||
    selectedOverwriteCount.value > 0
)

const emit = defineEmits<{
  success: []
}>()

const open = (value: StockTrackVO) => {
  track.value = value
  dateRange.value = [dayjs().subtract(30, 'day').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')]
  resetPreview()
  dialogVisible.value = true
}

const resetPreview = () => {
  previewResult.value = undefined
  overwriteDates.value = []
}

const buildParams = (): StockDailyPriceHistoryParams | null => {
  if (!track.value || !dateRange.value) {
    message.warning('请选择历史行情日期区间')
    return null
  }
  const [beginDate, endDate] = dateRange.value
  if (dayjs(endDate).diff(dayjs(beginDate), 'day') > 365) {
    message.warning('历史行情日期区间不能超过 366 天')
    return null
  }
  return { trackId: track.value.id, beginDate, endDate }
}

const loadPreview = async () => {
  const params = buildParams()
  if (!params) return
  const requestKey = `${params.trackId}:${params.beginDate}:${params.endDate}`
  resetPreview()
  previewLoading.value = true
  try {
    const result = await StockApi.previewDailyPriceHistory(params)
    const currentKey =
      track.value && dateRange.value
        ? `${track.value.id}:${dateRange.value[0]}:${dateRange.value[1]}`
        : ''
    if (currentKey === requestKey) {
      previewResult.value = result
    }
  } finally {
    previewLoading.value = false
  }
}

const submitImport = async () => {
  const params = buildParams()
  if (!params || !previewResult.value?.data || !canSubmit.value) return
  const importableCount = previewResult.value.data.importableCount
  const backfillableCount = previewResult.value.data.backfillableCount
  const overwriteCount = selectedOverwriteCount.value
  await message.confirm(
    `确认新增 ${importableCount} 条历史行情、回填 ${backfillableCount} 条缺失量能，并覆盖 ${overwriteCount} 条手工价格吗？`
  )
  importLoading.value = true
  try {
    const request: StockDailyPriceHistoryImportParams = {
      ...params,
      overwriteDates: [...overwriteDates.value]
    }
    const result = await StockApi.importDailyPriceHistory(request)
    message.success(
      `历史行情导入完成：获取 ${result.fetchedCount} 条，新增 ${result.importedCount} 条，更新 ${result.updatedCount} 条，回填量能 ${result.backfilledCount} 条，跳过 ${result.skippedCount} 条`
    )
    dialogVisible.value = false
    emit('success')
  } finally {
    importLoading.value = false
  }
}

const disableFutureDate = (date: Date) => date.getTime() > Date.now()
const formatPrice = (value: number) => value.toFixed(2)
const formatVolume = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : value.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const getStatusLabel = (row: StockDailyPriceHistoryItemVO) => {
  if (!row.exists) return '可新增'
  const source = row.existingSource ? sourceLabelMap[row.existingSource] : '未知来源'
  if (row.canBackfillVolume) return `${source}，可回填量能`
  return row.canOverwrite ? `${source}，可覆盖` : `${source}，已存在`
}
const getStatusType = (row: StockDailyPriceHistoryItemVO): 'success' | 'warning' | 'info' => {
  if (!row.exists) return 'success'
  if (row.canBackfillVolume) return 'success'
  return row.canOverwrite ? 'warning' : 'info'
}

watch(dateRange, resetPreview, { deep: true })

defineExpose({ open })
</script>

<style scoped>
.history-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.history-date-picker {
  width: 360px;
}

.history-summary {
  margin-bottom: 12px;
}

.importable-count {
  font-weight: 600;
  color: var(--el-color-success);
}

.overwritable-count {
  font-weight: 600;
  color: var(--el-color-warning);
}

.backfillable-count {
  font-weight: 600;
  color: var(--el-color-primary);
}

.not-overwritable {
  color: var(--el-text-color-placeholder);
}

@media (width <= 720px) {
  .history-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .history-date-picker {
    width: 100%;
  }

  :deep(.el-descriptions__body .el-descriptions__table) {
    min-width: 520px;
  }
}
</style>
