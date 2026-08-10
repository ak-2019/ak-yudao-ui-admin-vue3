<template>
  <Dialog v-model="dialogVisible" title="批量设置分组" width="600px">
    <div class="assign-summary">
      <div>
        <strong>已选择 {{ tracks.length }} 只股票</strong>
        <span>本次操作只影响选中的分组，不会覆盖其他分组</span>
      </div>
      <el-tag type="info" effect="plain">{{ mode === 'ADD' ? '增量加入' : '批量移出' }}</el-tag>
    </div>

    <el-form label-width="84px" @submit.prevent="submit">
      <el-form-item label="操作方式">
        <el-segmented v-model="mode" :options="modeOptions" class="assign-mode" />
      </el-form-item>
      <el-form-item label="选择分组">
        <div class="group-picker">
          <div class="group-picker__tools">
            <span>{{ modeHint }}</span>
            <div>
              <el-button
                link
                type="primary"
                :disabled="selectableGroupIds.length === 0"
                @click="selectAll"
              >
                全选可操作项
              </el-button>
              <el-button
                link
                :disabled="selectedGroupIds.length === 0"
                @click="selectedGroupIds = []"
              >
                清空
              </el-button>
            </div>
          </div>
          <el-checkbox-group
            v-if="editableGroups.length > 0"
            v-model="selectedGroupIds"
            class="group-options"
          >
            <el-checkbox
              v-for="group in editableGroups"
              :key="group.id"
              :value="group.id"
              :disabled="isGroupDisabled(group.id)"
              border
            >
              <span class="group-option__name">{{ group.name }}</span>
              <el-tag v-if="group.fixed" size="small" type="info" effect="plain">固定</el-tag>
              <span class="group-option__coverage">{{ coverageLabel(group.id) }}</span>
            </el-checkbox>
          </el-checkbox-group>
          <el-empty v-else :image-size="64" description="暂无可手工设置的分组" />
        </div>
      </el-form-item>
    </el-form>

    <el-alert
      :type="mode === 'REMOVE' ? 'warning' : 'info'"
      :closable="false"
      show-icon
      :title="operationPreview"
      description="“所有个股”和“持仓”由系统自动维护，不在批量操作范围内。"
    />

    <template #footer>
      <el-button :disabled="submitting" @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
        {{ mode === 'ADD' ? '确认加入' : '确认移出' }}
      </el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import {
  StockApi,
  type StockGroupBatchAssignMode,
  type StockGroupVO,
  type StockTrackVO
} from '@/api/finance/stock'

defineOptions({ name: 'FinanceStockGroupBatchAssignDialog' })

const message = useMessage()
const dialogVisible = ref(false)
const submitting = ref(false)
const tracks = ref<StockTrackVO[]>([])
const groups = ref<StockGroupVO[]>([])
const selectedGroupIds = ref<number[]>([])
const mode = ref<StockGroupBatchAssignMode>('ADD')

const modeOptions = [
  { label: '加入分组', value: 'ADD' },
  { label: '移出分组', value: 'REMOVE' }
]

const emit = defineEmits<{
  success: []
}>()

const editableGroups = computed(() =>
  groups.value.filter((group) => group.systemKey !== 'ALL' && group.systemKey !== 'POSITION')
)
const membershipCounts = computed(() => {
  const counts = new Map<number, number>()
  editableGroups.value.forEach((group) => counts.set(group.id, 0))
  tracks.value.forEach((track) => {
    track.groupIds.forEach((groupId) => {
      if (counts.has(groupId)) counts.set(groupId, (counts.get(groupId) ?? 0) + 1)
    })
  })
  return counts
})
const selectableGroupIds = computed(() =>
  editableGroups.value.filter((group) => !isGroupDisabled(group.id)).map((group) => group.id)
)
const selectedGroupNames = computed(() => {
  const selected = new Set(selectedGroupIds.value)
  return editableGroups.value.filter((group) => selected.has(group.id)).map((group) => group.name)
})
const canSubmit = computed(
  () => tracks.value.length > 0 && selectedGroupIds.value.length > 0 && !submitting.value
)
const modeHint = computed(() =>
  mode.value === 'ADD' ? '选择要增量加入的分组' : '选择要从所选股票中移出的分组'
)
const operationPreview = computed(() => {
  if (selectedGroupNames.value.length === 0) {
    return mode.value === 'ADD' ? '请选择至少一个要加入的分组' : '请选择至少一个要移出的分组'
  }
  const action = mode.value === 'ADD' ? '加入' : '移出'
  return `将 ${tracks.value.length} 只股票${action}：${selectedGroupNames.value.join('、')}`
})

const isGroupDisabled = (groupId: number) => {
  const count = membershipCounts.value.get(groupId) ?? 0
  return mode.value === 'ADD' ? count === tracks.value.length : count === 0
}

const coverageLabel = (groupId: number) => {
  const count = membershipCounts.value.get(groupId) ?? 0
  if (count === 0) return '尚未加入'
  if (count === tracks.value.length) return '已全部加入'
  return `${count}/${tracks.value.length} 已加入`
}

const selectAll = () => {
  selectedGroupIds.value = [...selectableGroupIds.value]
}

watch(mode, () => {
  selectedGroupIds.value = []
})

const open = (
  selectedTracks: StockTrackVO[],
  availableGroups: StockGroupVO[],
  initialMode: StockGroupBatchAssignMode = 'ADD'
) => {
  tracks.value = [...selectedTracks]
  groups.value = [...availableGroups]
  mode.value = initialMode
  selectedGroupIds.value = []
  dialogVisible.value = true
}

const submit = async () => {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    await StockApi.assignTrackGroupsBatch({
      trackIds: tracks.value.map((track) => track.id),
      groupIds: selectedGroupIds.value,
      mode: mode.value
    })
    const action = mode.value === 'ADD' ? '加入' : '移出'
    message.success(`已将 ${tracks.value.length} 只股票批量${action}所选分组`)
    dialogVisible.value = false
    emit('success')
  } finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.assign-summary,
.assign-summary > div,
.group-picker__tools,
.group-option__name {
  display: flex;
  align-items: center;
}

.assign-summary {
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.assign-summary > div {
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}

.assign-summary span,
.group-picker__tools,
.group-option__coverage {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.assign-mode,
.group-picker {
  width: 100%;
}

.group-picker__tools {
  justify-content: space-between;
  min-height: 32px;
  gap: 12px;
}

.group-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.group-options :deep(.el-checkbox) {
  width: 100%;
  height: 52px;
  margin: 0;
}

.group-options :deep(.el-checkbox__label) {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 2px 8px;
}

.group-option__name {
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-option__coverage {
  grid-column: 1 / -1;
}

@media (width <= 640px) {
  .assign-summary,
  .group-picker__tools {
    align-items: flex-start;
    flex-direction: column;
  }

  .group-options {
    grid-template-columns: 1fr;
  }
}
</style>
