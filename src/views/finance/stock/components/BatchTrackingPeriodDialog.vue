<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="520px">
    <el-form label-width="96px" @submit.prevent="submit">
      <el-form-item label="选中股票">
        <span class="selected-count">{{ selectedStockLabel }}</span>
      </el-form-item>
      <el-form-item label="操作方式">
        <el-segmented v-model="mode" :options="modeOptions" class="period-mode" />
      </el-form-item>
      <template v-if="mode === 'SET'">
        <el-form-item label="开始日期" required>
          <el-date-picker
            v-model="trackingStartDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择开始跟踪日期"
            :disabled-date="disableFutureDate"
            class="period-date-picker"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="trackingEndDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="不填表示持续跟踪"
            clearable
            :disabled-date="disableEndDate"
            class="period-date-picker"
          />
        </el-form-item>
      </template>
      <el-alert
        v-else
        type="warning"
        show-icon
        :closable="false"
        title="清空后，这些股票在重新设置开始日期前不会参与成功率统计"
      />
    </el-form>

    <template #footer>
      <el-button :disabled="submitting" @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
        {{ mode === 'CLEAR' ? '确认清空' : '保存日期' }}
      </el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { StockApi, type StockTrackVO } from '@/api/finance/stock'

defineOptions({ name: 'FinanceStockBatchTrackingPeriodDialog' })

const message = useMessage()
const dialogVisible = ref(false)
const submitting = ref(false)
const tracks = ref<StockTrackVO[]>([])
const mode = ref<'SET' | 'CLEAR'>('SET')
const trackingStartDate = ref<string>()
const trackingEndDate = ref<string>()

const modeOptions = [
  { label: '设置日期', value: 'SET' },
  { label: '清空日期', value: 'CLEAR' }
]

const emit = defineEmits<{
  success: []
}>()

const dialogTitle = computed(() =>
  tracks.value.length === 1 ? '设置跟踪日期' : `批量设置跟踪日期（${tracks.value.length} 只）`
)
const selectedStockLabel = computed(() =>
  tracks.value.length === 1
    ? `${tracks.value[0]?.name}（${tracks.value[0]?.symbol}）`
    : `${tracks.value.length} 只股票`
)
const canSubmit = computed(() =>
  Boolean(
    tracks.value.length > 0 &&
    !submitting.value &&
    (mode.value === 'CLEAR' || trackingStartDate.value)
  )
)

const open = (selectedTracks: StockTrackVO[]) => {
  tracks.value = [...selectedTracks]
  const firstTrack = tracks.value[0]
  const hasCommonStartDate = tracks.value.every(
    (track) => track.trackingStartDate === firstTrack?.trackingStartDate
  )
  const hasCommonEndDate = tracks.value.every(
    (track) => track.trackingEndDate === firstTrack?.trackingEndDate
  )
  trackingStartDate.value = hasCommonStartDate
    ? (firstTrack?.trackingStartDate ?? undefined)
    : undefined
  trackingEndDate.value = hasCommonEndDate ? (firstTrack?.trackingEndDate ?? undefined) : undefined
  mode.value = 'SET'
  dialogVisible.value = true
}

const submit = async () => {
  if (tracks.value.length === 0) return
  if (mode.value === 'SET' && !trackingStartDate.value) return
  if (
    mode.value === 'SET' &&
    trackingEndDate.value &&
    dayjs(trackingEndDate.value).isBefore(dayjs(trackingStartDate.value), 'day')
  ) {
    message.warning('结束跟踪日期不能早于开始跟踪日期')
    return
  }
  const actionText = mode.value === 'CLEAR' ? '清空跟踪日期' : '更新跟踪日期'
  await message.confirm(
    `确认${actionText}${tracks.value.length === 1 ? `“${tracks.value[0]?.name}”` : `选中的 ${tracks.value.length} 只股票`}吗？`
  )
  submitting.value = true
  try {
    await StockApi.updateTrackingPeriodBatch({
      trackIds: tracks.value.map((track) => track.id),
      trackingStartDate: mode.value === 'CLEAR' ? null : (trackingStartDate.value ?? null),
      trackingEndDate: mode.value === 'CLEAR' ? null : (trackingEndDate.value ?? null)
    })
    message.success(
      mode.value === 'CLEAR'
        ? `已清空 ${tracks.value.length} 只股票的跟踪日期`
        : `已更新 ${tracks.value.length} 只股票的跟踪日期`
    )
    dialogVisible.value = false
    emit('success')
  } finally {
    submitting.value = false
  }
}

const disableFutureDate = (date: Date) => date.getTime() > Date.now()
const disableEndDate = (date: Date) =>
  disableFutureDate(date) ||
  Boolean(trackingStartDate.value && dayjs(date).isBefore(trackingStartDate.value, 'day'))

defineExpose({ open })
</script>

<style scoped>
.selected-count {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.period-date-picker {
  width: 100%;
}

.period-mode {
  width: 100%;
}
</style>
