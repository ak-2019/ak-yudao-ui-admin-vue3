<template>
  <Dialog v-model="dialogVisible" title="管理股票标签" width="880px">
    <div class="tag-create-row">
      <el-input
        v-model="createForm.name"
        maxlength="32"
        placeholder="新标签名称"
        clearable
        @keyup.enter="createTag"
      />
      <el-select
        v-model="createForm.groupName"
        filterable
        allow-create
        default-first-option
        clearable
        maxlength="32"
        placeholder="选择或输入分组"
        aria-label="新标签分组"
      >
        <el-option v-for="group in groupOptions" :key="group" :label="group" :value="group" />
      </el-select>
      <el-tooltip content="选择常用色或自定义颜色" placement="top">
        <el-color-picker
          v-model="createForm.color"
          :predefine="TAG_COLOR_PALETTE"
          aria-label="新标签颜色"
        />
      </el-tooltip>
      <el-input-number
        v-model="createForm.sort"
        :min="0"
        :max="999999"
        controls-position="right"
        aria-label="新标签排序"
      />
      <el-tooltip content="新增标签" placement="top">
        <el-button
          type="primary"
          circle
          :loading="creating"
          :disabled="!createForm.name.trim()"
          aria-label="新增标签"
          @click="createTag"
        >
          <Icon icon="ep:plus" />
        </el-button>
      </el-tooltip>
    </div>

    <el-table v-loading="loading" :data="editableTags" stripe table-layout="fixed" max-height="420">
      <el-table-column prop="name" label="名称" min-width="180" sortable>
        <template #default="{ row }">
          <el-input v-model="row.name" maxlength="32" aria-label="标签名称" />
        </template>
      </el-table-column>
      <el-table-column prop="groupName" label="分组" min-width="170" sortable>
        <template #default="{ row }">
          <el-select
            v-model="row.groupName"
            filterable
            allow-create
            default-first-option
            clearable
            maxlength="32"
            placeholder="未分组"
            aria-label="标签分组"
          >
            <el-option v-for="group in groupOptions" :key="group" :label="group" :value="group" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column prop="color" label="颜色" width="112" align="center" sortable>
        <template #default="{ row }">
          <el-color-picker
            v-model="row.color"
            :predefine="TAG_COLOR_PALETTE"
            aria-label="标签颜色"
          />
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="150" align="center" sortable>
        <template #default="{ row }">
          <el-input-number
            v-model="row.sort"
            :min="0"
            :max="999999"
            controls-position="right"
            aria-label="标签排序"
          />
        </template>
      </el-table-column>
      <el-table-column label="预览" min-width="120" align="center">
        <template #default="{ row }">
          <div class="tag-preview-cell">
            <span class="tag-preview-cell__group">{{ row.groupName?.trim() || '未分组' }}</span>
            <el-tag effect="plain" :style="tagStyle(row.color)">{{ row.name || '未命名' }}</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="96" align="center">
        <template #default="{ row }">
          <div class="tag-row-actions">
            <el-tooltip content="保存" placement="top">
              <el-button
                link
                type="primary"
                :loading="row.saving"
                :disabled="!row.name.trim()"
                aria-label="保存标签"
                @click="updateTag(row)"
              >
                <Icon icon="ep:check" />
              </el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button
                link
                type="danger"
                :disabled="row.saving"
                aria-label="删除标签"
                @click="deleteTag(row)"
              >
                <Icon icon="ep:delete" />
              </el-button>
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { StockApi, type StockTagVO } from '@/api/finance/stock'

defineOptions({ name: 'FinanceStockTagManageDialog' })

interface EditableTag extends StockTagVO {
  saving: boolean
}

const message = useMessage()
const dialogVisible = ref(false)
const loading = ref(false)
const creating = ref(false)
const editableTags = ref<EditableTag[]>([])
const createForm = reactive({ name: '', groupName: '', color: '#409EFF', sort: 10 })
const TAG_COLOR_PALETTE = [
  '#409EFF',
  '#67C23A',
  '#E6A23C',
  '#F56C6C',
  '#909399',
  '#00A870',
  '#ED7B2F',
  '#D54941',
  '#7B61FF',
  '#0F6CBD',
  '#00838F',
  '#8D6E63'
]

const emit = defineEmits<{
  changed: [tags: StockTagVO[]]
}>()

const groupOptions = computed(() => {
  const groups = new Set<string>()
  editableTags.value.forEach((tag) => {
    const groupName = tag.groupName?.trim()
    if (groupName) groups.add(groupName)
  })
  const pendingGroupName = createForm.groupName.trim()
  if (pendingGroupName) groups.add(pendingGroupName)
  return [...groups].sort((first, second) => first.localeCompare(second, 'zh-CN'))
})

const tagStyle = (color: string) => ({
  color,
  borderColor: color,
  backgroundColor: `${color}12`
})

const nextSort = () => editableTags.value.reduce((max, tag) => Math.max(max, tag.sort), 0) + 10

const loadTags = async (notify = false) => {
  loading.value = true
  try {
    const tags = await StockApi.getTagList()
    editableTags.value = tags.map((tag) => ({ ...tag, saving: false }))
    createForm.sort = nextSort()
    if (notify) emit('changed', tags)
  } finally {
    loading.value = false
  }
}

const open = async () => {
  dialogVisible.value = true
  createForm.name = ''
  createForm.groupName = ''
  createForm.color = '#409EFF'
  await loadTags()
}

const createTag = async () => {
  const name = createForm.name.trim()
  if (!name) return
  creating.value = true
  try {
    await StockApi.createTag({
      name,
      groupName: createForm.groupName.trim(),
      color: createForm.color,
      sort: createForm.sort
    })
    message.success('标签已创建')
    createForm.name = ''
    await loadTags(true)
  } finally {
    creating.value = false
  }
}

const updateTag = async (tag: EditableTag) => {
  const name = tag.name.trim()
  if (!name) return
  tag.saving = true
  try {
    await StockApi.updateTag({
      id: tag.id,
      name,
      groupName: tag.groupName?.trim() || '',
      color: tag.color,
      sort: tag.sort
    })
    message.success('标签已更新')
    await loadTags(true)
  } finally {
    tag.saving = false
  }
}

const deleteTag = async (tag: EditableTag) => {
  await message.delConfirm(`确定删除标签“${tag.name}”吗？股票上的该标签也会一并移除。`)
  tag.saving = true
  try {
    await StockApi.deleteTag(tag.id)
    message.success('标签已删除')
    await loadTags(true)
  } finally {
    tag.saving = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.tag-create-row {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) minmax(160px, 1fr) 48px 140px 40px;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.tag-preview-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.tag-preview-cell__group {
  max-width: 100%;
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

@media (width <= 600px) {
  .tag-create-row {
    grid-template-columns: minmax(0, 1fr) 48px 40px;
  }

  .tag-create-row > :deep(.el-select) {
    grid-column: 1 / -1;
    grid-row: 2;
    width: 100%;
  }

  .tag-create-row :deep(.el-input-number) {
    grid-column: 1 / -1;
    grid-row: 3;
    width: 100%;
  }
}
</style>
