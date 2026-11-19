<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="560px">
    <div class="tag-assign-summary">
      <span>{{ selectedStockLabel }}</span>
      <el-tag type="info" effect="plain">{{ tracks.length }} 只</el-tag>
    </div>

    <el-form label-width="88px" @submit.prevent="submit">
      <el-form-item v-if="tracks.length > 1" label="设置方式">
        <el-segmented v-model="mode" :options="modeOptions" class="tag-mode" />
      </el-form-item>
      <el-form-item label="选择标签">
        <el-select
          v-model="selectedTagValues"
          multiple
          clearable
          filterable
          :allow-create="mode !== 'REMOVE'"
          default-first-option
          collapse-tags
          collapse-tags-tooltip
          :max-collapse-tags="3"
          class="tag-select"
          :placeholder="mode === 'REMOVE' ? '选择要移除的标签' : '选择或直接输入新标签'"
        >
          <el-option-group v-for="group in groupedTags" :key="group.name" :label="group.name">
            <el-option v-for="tag in group.tags" :key="tag.id" :label="tag.name" :value="tag.id">
              <span class="tag-option-dot" :style="{ backgroundColor: tag.color }"></span>
              <span>{{ tag.name }}</span>
            </el-option>
          </el-option-group>
        </el-select>
      </el-form-item>
    </el-form>

    <div v-if="selectedTags.length > 0 || newTagNames.length > 0" class="tag-preview">
      <el-tag
        v-for="tag in selectedTags"
        :key="tag.id"
        effect="plain"
        closable
        :style="tagStyle(tag.color)"
        @close="removeTag(tag.id)"
      >
        {{ tag.name }}
      </el-tag>
      <el-tag
        v-for="name in newTagNames"
        :key="name"
        effect="plain"
        closable
        :style="tagStyle(DEFAULT_TAG_COLOR)"
        @close="removeTag(name)"
      >
        {{ name }}（新）
      </el-tag>
    </div>
    <el-alert
      v-else
      :type="mode === 'REPLACE' ? 'warning' : 'info'"
      :closable="false"
      show-icon
      :title="emptySelectionText"
    />

    <template #footer>
      <el-button :disabled="submitting" @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
        {{ submitText }}
      </el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import {
  StockApi,
  type StockTagAssignMode,
  type StockTagVO,
  type StockTrackVO
} from '@/api/finance/stock'

defineOptions({ name: 'FinanceStockTagAssignDialog' })

const message = useMessage()
const dialogVisible = ref(false)
const submitting = ref(false)
const tracks = ref<StockTrackVO[]>([])
const tags = ref<StockTagVO[]>([])
const selectedTagValues = ref<Array<number | string>>([])
const mode = ref<StockTagAssignMode>('ADD')
const DEFAULT_TAG_COLOR = '#409EFF'

const modeOptions = [
  { label: '新增标签', value: 'ADD' },
  { label: '移除标签', value: 'REMOVE' },
  { label: '替换标签', value: 'REPLACE' }
]

const emit = defineEmits<{
  success: []
}>()

const dialogTitle = computed(() => (tracks.value.length === 1 ? '设置股票标签' : '批量设置标签'))
const selectedStockLabel = computed(() =>
  tracks.value.length === 1
    ? `${tracks.value[0]?.name}（${tracks.value[0]?.symbol}）`
    : `已选择 ${tracks.value.length} 只股票`
)
const selectedTags = computed(() => {
  const selected = new Set(
    selectedTagValues.value.filter((value): value is number => typeof value === 'number')
  )
  return tags.value.filter((tag) => selected.has(tag.id))
})
const groupedTags = computed(() => {
  const groups = new Map<string, StockTagVO[]>()
  tags.value.forEach((tag) => {
    const groupName = tag.groupName?.trim() || '未分组'
    const groupTags = groups.get(groupName) ?? []
    groupTags.push(tag)
    groups.set(groupName, groupTags)
  })
  return [...groups.entries()]
    .sort(([first], [second]) => {
      if (first === '未分组') return 1
      if (second === '未分组') return -1
      return first.localeCompare(second, 'zh-CN')
    })
    .map(([name, groupTags]) => ({ name, tags: groupTags }))
})
const newTagNames = computed(() => {
  const names = new Map<string, string>()
  selectedTagValues.value
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => names.set(value.toLocaleLowerCase(), value))
  return [...names.values()]
})
const canSubmit = computed(
  () =>
    tracks.value.length > 0 &&
    !submitting.value &&
    (mode.value === 'REPLACE' || selectedTagValues.value.length > 0)
)
const emptySelectionText = computed(() => {
  if (tags.value.length === 0) return '暂无可用标签，请先使用股票页面顶部的“管理标签”创建'
  if (mode.value === 'REPLACE') return '不选择标签并保存，将清空这些股票的全部标签'
  return mode.value === 'ADD' ? '请选择要新增的标签' : '请选择要移除的标签'
})
const submitText = computed(() => {
  if (mode.value === 'ADD') return '确认新增'
  if (mode.value === 'REMOVE') return '确认移除'
  return selectedTagValues.value.length === 0 ? '清空标签' : '确认替换'
})

const tagStyle = (color: string) => ({
  color,
  borderColor: color,
  backgroundColor: `${color}12`
})

const removeTag = (value: number | string) => {
  selectedTagValues.value = selectedTagValues.value.filter((item) => item !== value)
}

watch(mode, (value) => {
  if (value === 'REMOVE') {
    selectedTagValues.value = selectedTagValues.value.filter((item) => typeof item === 'number')
  }
})

const open = (selectedTracks: StockTrackVO[], availableTags: StockTagVO[]) => {
  tracks.value = [...selectedTracks]
  tags.value = [...availableTags]
  mode.value = tracks.value.length === 1 ? 'REPLACE' : 'ADD'
  selectedTagValues.value = tracks.value.length === 1 ? [...(tracks.value[0]?.tagIds ?? [])] : []
  dialogVisible.value = true
}

const submit = async () => {
  if (!canSubmit.value) return
  if (mode.value === 'REPLACE' && selectedTagValues.value.length === 0) {
    await message.confirm(`确定清空 ${tracks.value.length} 只股票的全部标签吗？`)
  }
  submitting.value = true
  try {
    await StockApi.assignTrackTags({
      trackIds: tracks.value.map((track) => track.id),
      tagIds: selectedTagValues.value.filter((value): value is number => typeof value === 'number'),
      newTagNames: mode.value === 'REMOVE' ? [] : newTagNames.value,
      mode: mode.value
    })
    const actionText = { ADD: '新增', REMOVE: '移除', REPLACE: '替换' }[mode.value]
    message.success(`已为 ${tracks.value.length} 只股票${actionText}标签`)
    dialogVisible.value = false
    emit('success')
  } finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.tag-assign-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  margin-bottom: 16px;
  font-weight: 600;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.tag-mode,
.tag-select {
  width: 100%;
}

.tag-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
}

.tag-option-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 8px;
  border-radius: 50%;
}
</style>
