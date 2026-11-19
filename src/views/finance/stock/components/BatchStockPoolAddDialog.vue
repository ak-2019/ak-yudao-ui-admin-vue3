<template>
  <Dialog v-model="dialogVisible" :title="`添加个股池（${items.length} 只）`" width="720px">
    <el-alert
      :closable="false"
      type="info"
      show-icon
      :title="`将添加到“${targetGroupName}”分组；新股票默认不设置跟踪日期`"
    />

    <el-descriptions :column="3" border class="add-summary">
      <el-descriptions-item label="待处理">{{ pendingCount }}</el-descriptions-item>
      <el-descriptions-item label="已成功">{{ successCount }}</el-descriptions-item>
      <el-descriptions-item label="失败">{{ failedCount }}</el-descriptions-item>
    </el-descriptions>

    <el-progress
      v-if="processing || processedCount > 0"
      class="add-progress"
      :percentage="progressPercentage"
      :status="failedCount > 0 && !processing ? 'exception' : undefined"
    />

    <el-table :data="items" stripe max-height="360" table-layout="fixed">
      <el-table-column prop="name" label="股票名称" min-width="140" show-overflow-tooltip />
      <el-table-column prop="symbol" label="股票代码" width="128" />
      <el-table-column label="来源" width="104" align="center">
        <template #default="{ row }">
          <el-tag :type="row.source === 'local' ? 'info' : 'warning'" effect="plain">
            {{ row.source === 'local' ? '本地股票池' : '真实行情' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="116" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" effect="plain">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="errorMessage" label="结果" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ row.errorMessage || '--' }}</template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button :disabled="processing" @click="dialogVisible = false">
        {{ processedCount > 0 ? '关闭' : '取消' }}
      </el-button>
      <el-button
        type="primary"
        :loading="processing"
        :disabled="pendingCount === 0"
        @click="submit"
      >
        {{ failedCount > 0 ? `重试失败项（${failedCount}）` : `确认添加（${pendingCount}）` }}
      </el-button>
    </template>
  </Dialog>
</template>

<script lang="ts">
import type { FinanceMarket } from '@/api/finance/stock'

export interface StockPoolAddCandidate {
  key: string
  source: 'local' | 'market'
  stockId: number | null
  symbol: string
  market: FinanceMarket
  code: string
  name: string
}
</script>

<script setup lang="ts">
import { StockApi } from '@/api/finance/stock'

defineOptions({ name: 'FinanceStockBatchStockPoolAddDialog' })

type AddStatus = 'PENDING' | 'ADDING' | 'SUCCESS' | 'FAILED'
type TagType = 'success' | 'warning' | 'danger' | 'info'

interface AddItem extends StockPoolAddCandidate {
  status: AddStatus
  errorMessage: string
}

const message = useMessage()
const dialogVisible = ref(false)
const processing = ref(false)
const items = ref<AddItem[]>([])
const targetGroupId = ref<number>()
const targetGroupName = ref('自选')

const emit = defineEmits<{
  finished: [succeededKeys: string[]]
}>()

const successCount = computed(() => items.value.filter((item) => item.status === 'SUCCESS').length)
const failedCount = computed(() => items.value.filter((item) => item.status === 'FAILED').length)
const pendingCount = computed(
  () => items.value.filter((item) => item.status === 'PENDING' || item.status === 'FAILED').length
)
const processedCount = computed(() => successCount.value + failedCount.value)
const progressPercentage = computed(() =>
  items.value.length === 0 ? 0 : Math.round((processedCount.value / items.value.length) * 100)
)

const statusLabel = (status: AddStatus) =>
  ({ PENDING: '等待添加', ADDING: '添加中', SUCCESS: '添加成功', FAILED: '添加失败' })[status]

const statusTypeMap: Record<AddStatus, TagType> = {
  PENDING: 'info',
  ADDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger'
}
const statusType = (status: AddStatus): TagType => statusTypeMap[status]

const errorText = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return '请求失败，请重试'
}

const open = (candidates: StockPoolAddCandidate[], groupId?: number, groupName = '自选') => {
  items.value = candidates.map((candidate) => ({
    ...candidate,
    status: 'PENDING',
    errorMessage: ''
  }))
  targetGroupId.value = groupId
  targetGroupName.value = groupName
  processing.value = false
  dialogVisible.value = true
}

const submit = async () => {
  const candidates = items.value.filter(
    (item) => item.status === 'PENDING' || item.status === 'FAILED'
  )
  if (candidates.length === 0) return
  processing.value = true
  const succeededKeys: string[] = []
  try {
    for (const item of candidates) {
      item.status = 'ADDING'
      item.errorMessage = ''
      try {
        if (item.source === 'local') {
          if (item.stockId === null) throw new Error('本地股票编号缺失')
          await StockApi.createTrack({ stockId: item.stockId, groupId: targetGroupId.value })
        } else {
          await StockApi.createMarketTrack({
            market: item.market,
            code: item.code,
            groupId: targetGroupId.value
          })
        }
        item.status = 'SUCCESS'
        item.errorMessage = `已加入“${targetGroupName.value}”`
        succeededKeys.push(item.key)
      } catch (error) {
        item.status = 'FAILED'
        item.errorMessage = errorText(error)
      }
    }
    if (succeededKeys.length > 0) emit('finished', succeededKeys)
    if (failedCount.value === 0) {
      message.success(`已成功添加 ${successCount.value} 只股票到“${targetGroupName.value}”`)
    } else {
      message.warning(`本次成功 ${succeededKeys.length} 只，仍有 ${failedCount.value} 只可重试`)
    }
  } finally {
    processing.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.add-summary,
.add-progress {
  margin-top: 16px;
}
</style>
