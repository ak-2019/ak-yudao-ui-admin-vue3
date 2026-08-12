<template>
  <Dialog v-model="dialogVisible" :title="`同步行情与技术数据（${rows.length} 只）`" width="1040px">
    <div class="batch-toolbar">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        :disabled="running"
        :disabled-date="disableFutureDate"
        :shortcuts="financeDateRangeShortcuts"
        class="batch-date-picker"
      />
      <el-switch v-model="overwriteManual" active-text="覆盖手工记录" :disabled="running" />
      <el-button type="primary" :loading="running" :disabled="!canStart" @click="runBatch">
        <Icon icon="ep:refresh" class="mr-5px" />
        开始同步
      </el-button>
    </div>

    <el-progress
      v-if="running || completedCount > 0"
      :percentage="progressPercentage"
      :status="progressStatus"
      class="batch-progress"
    />

    <el-descriptions :column="4" border class="batch-summary">
      <el-descriptions-item label="选中股票">{{ rows.length }} 只</el-descriptions-item>
      <el-descriptions-item label="已完成">{{ completedCount }} 只</el-descriptions-item>
      <el-descriptions-item label="有数据变更">{{ changedStockCount }} 只</el-descriptions-item>
      <el-descriptions-item label="失败">{{ failedCount }} 只</el-descriptions-item>
    </el-descriptions>

    <el-table
      :data="rows"
      row-key="track.id"
      stripe
      table-layout="fixed"
      max-height="460"
      empty-text="请先在股票列表勾选需要更新的股票"
    >
      <el-table-column label="股票" min-width="180" fixed>
        <template #default="{ row }">
          <div class="batch-stock-name">{{ row.track.name }}</div>
          <div class="batch-stock-code">{{ row.track.symbol }}</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="96" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" effect="plain">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="获取" prop="fetchedCount" width="78" align="right" />
      <el-table-column label="新增" prop="importedCount" width="78" align="right" />
      <el-table-column label="更新" prop="updatedCount" width="78" align="right" />
      <el-table-column label="回填量能" prop="backfilledCount" width="96" align="right" />
      <el-table-column label="跳过" prop="skippedCount" width="78" align="right" />
      <el-table-column label="处理结果" min-width="250" show-overflow-tooltip>
        <template #default="{ row }">{{ row.resultMessage || '--' }}</template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button :disabled="running" @click="dialogVisible = false">关闭</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { StockApi, StockDailyPriceHistoryImportVO, StockTrackVO } from '@/api/finance/stock'
import { financeDateRangeShortcuts } from '@/views/finance/utils/dateShortcuts'

defineOptions({ name: 'FinanceStockBatchHistoryImportDialog' })

type BatchStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'SKIPPED' | 'FAILED'

interface BatchRow {
  track: StockTrackVO
  status: BatchStatus
  fetchedCount: number
  importedCount: number
  updatedCount: number
  backfilledCount: number
  skippedCount: number
  resultMessage: string
}

const message = useMessage()
const dialogVisible = ref(false)
const running = ref(false)
const dateRange = ref<[string, string]>()
const overwriteManual = ref(false)
const rows = ref<BatchRow[]>([])

const completedCount = computed(
  () => rows.value.filter((row) => !['PENDING', 'RUNNING'].includes(row.status)).length
)
const changedStockCount = computed(
  () =>
    rows.value.filter(
      (row) => row.importedCount > 0 || row.updatedCount > 0 || row.backfilledCount > 0
    ).length
)
const failedCount = computed(() => rows.value.filter((row) => row.status === 'FAILED').length)
const progressPercentage = computed(() =>
  rows.value.length === 0 ? 0 : Math.round((completedCount.value * 100) / rows.value.length)
)
const progressStatus = computed<'success' | 'warning' | undefined>(() => {
  if (running.value || completedCount.value < rows.value.length) return undefined
  return failedCount.value > 0 ? 'warning' : 'success'
})
const canStart = computed(
  () => !running.value && rows.value.length > 0 && dateRange.value !== undefined
)

const emit = defineEmits<{
  success: [changedTrackIds: number[]]
}>()

const createRow = (track: StockTrackVO): BatchRow => ({
  track,
  status: 'PENDING',
  fetchedCount: 0,
  importedCount: 0,
  updatedCount: 0,
  backfilledCount: 0,
  skippedCount: 0,
  resultMessage: ''
})

const open = (tracks: StockTrackVO[]) => {
  rows.value = tracks.map(createRow)
  dateRange.value = [
    dayjs().subtract(365, 'day').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD')
  ]
  overwriteManual.value = false
  dialogVisible.value = true
}

const resetRows = () => {
  if (running.value) return
  rows.value = rows.value.map((row) => createRow(row.track))
}

const validateRange = (): [string, string] | null => {
  if (!dateRange.value) {
    message.warning('请选择历史行情日期区间')
    return null
  }
  const [beginDate, endDate] = dateRange.value
  if (dayjs(endDate).diff(dayjs(beginDate), 'day') > 365) {
    message.warning('历史行情日期区间不能超过 366 天')
    return null
  }
  return [beginDate, endDate]
}

const applyImportResult = (row: BatchRow, result: StockDailyPriceHistoryImportVO) => {
  row.fetchedCount = result.fetchedCount
  row.importedCount = result.importedCount
  row.updatedCount = result.updatedCount
  row.backfilledCount = result.backfilledCount
  row.skippedCount = result.skippedCount
  const changed = result.importedCount > 0 || result.updatedCount > 0 || result.backfilledCount > 0
  row.status = changed ? 'SUCCESS' : 'SKIPPED'
  row.resultMessage = changed ? '更新完成' : '区间内数据已是最新'
}

const updateRow = async (row: BatchRow, beginDate: string, endDate: string) => {
  row.status = 'RUNNING'
  row.resultMessage = '正在获取历史行情'
  try {
    let overwriteDates: string[] = []
    if (overwriteManual.value) {
      const preview = await StockApi.previewDailyPriceHistory({
        trackId: row.track.id,
        beginDate,
        endDate
      })
      if (!preview.data) {
        row.status = 'FAILED'
        row.resultMessage = preview.message || '历史行情不可用'
        return
      }
      row.fetchedCount = preview.data.fetchedCount
      overwriteDates = preview.data.items
        .filter((item) => item.canOverwrite)
        .map((item) => item.tradeDate)
      if (
        preview.data.importableCount === 0 &&
        preview.data.backfillableCount === 0 &&
        overwriteDates.length === 0
      ) {
        row.status = 'SKIPPED'
        row.skippedCount = preview.data.skippedCount
        row.resultMessage = '区间内没有可新增、更新或回填的记录'
        return
      }
    }
    const result = await StockApi.importDailyPriceHistory({
      trackId: row.track.id,
      beginDate,
      endDate,
      overwriteDates
    })
    applyImportResult(row, result)
  } catch (error) {
    row.status = 'FAILED'
    row.resultMessage = resolveErrorMessage(error)
  }
}

const runBatch = async () => {
  const range = validateRange()
  if (!range) return
  const [beginDate, endDate] = range
  const overwriteMessage = overwriteManual.value
    ? '，并覆盖区间内可覆盖的手工记录'
    : '，已有手工记录将保留'
  await message.confirm(
    `确认同步 ${rows.value.length} 只股票在 ${beginDate} 至 ${endDate} 的历史 OHLCV${overwriteMessage}吗？`
  )
  resetRows()
  running.value = true
  try {
    for (const row of rows.value) {
      await updateRow(row, beginDate, endDate)
    }
    const changedTrackIds = rows.value
      .filter((row) => row.importedCount > 0 || row.updatedCount > 0 || row.backfilledCount > 0)
      .map((row) => row.track.id)
    if (changedTrackIds.length > 0) emit('success', changedTrackIds)
    if (failedCount.value > 0) {
      message.warning(
        `批量更新完成：${changedStockCount.value} 只股票有数据变更，${failedCount.value} 只失败`
      )
    } else {
      message.success(`批量更新完成：${changedStockCount.value} 只股票有数据变更`)
    }
  } finally {
    running.value = false
  }
}

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const errorMessage = Reflect.get(error, 'message')
    if (typeof errorMessage === 'string' && errorMessage) return errorMessage
  }
  return '更新失败，请稍后重试'
}

const statusLabel = (status: BatchStatus) =>
  ({
    PENDING: '待处理',
    RUNNING: '处理中',
    SUCCESS: '已完成',
    SKIPPED: '无需更新',
    FAILED: '失败'
  })[status]

const statusType = (status: BatchStatus): 'success' | 'warning' | 'danger' | 'info' =>
  ({
    PENDING: 'info',
    RUNNING: 'warning',
    SUCCESS: 'success',
    SKIPPED: 'info',
    FAILED: 'danger'
  })[status] as 'success' | 'warning' | 'danger' | 'info'

const disableFutureDate = (date: Date) => date.getTime() > Date.now()

watch(dateRange, resetRows, { deep: true })
watch(overwriteManual, resetRows)

defineExpose({ open })
</script>

<style scoped>
.batch-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.batch-date-picker {
  width: 360px;
}

.batch-progress,
.batch-summary {
  margin-bottom: 12px;
}

.batch-stock-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.batch-stock-code {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (width <= 720px) {
  .batch-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .batch-date-picker {
    width: 100%;
  }

  :deep(.batch-summary .el-descriptions__table) {
    min-width: 620px;
  }
}
</style>
