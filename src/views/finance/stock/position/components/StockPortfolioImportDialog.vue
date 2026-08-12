<template>
  <el-dialog
    v-model="visible"
    title="导入投资组合 Excel"
    width="min(760px, calc(100vw - 24px))"
    destroy-on-close
    append-to-body
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    :show-close="!loading"
  >
    <template v-if="!result">
      <div class="sheet-map">
        <div v-for="sheet in sheets" :key="sheet.index" class="sheet-map__item">
          <span class="sheet-map__index">{{ sheet.index }}</span>
          <div>
            <strong>{{ sheet.name }}</strong>
            <span>{{ sheet.summary }}</span>
          </div>
        </div>
      </div>

      <el-upload
        ref="uploadRef"
        v-model:file-list="fileList"
        class="portfolio-upload"
        :auto-upload="false"
        :disabled="loading"
        :limit="1"
        :on-exceed="handleExceed"
        accept=".xlsx,.xls"
        action="none"
        drag
      >
        <Icon icon="ep:upload-filled" class="upload-icon" />
        <div class="el-upload__text">拖入 Excel，或<em>选择文件</em></div>
        <template #tip>
          <div class="upload-tip"
            >按前三个 Sheet 的中文表头识别，空行和持仓末尾汇总行会自动忽略</div
          >
        </template>
      </el-upload>

      <div class="import-mode">
        <span class="import-mode__label">导入方式</span>
        <el-segmented v-model="importMode" :options="importModeOptions" :disabled="loading" />
      </div>

      <el-alert
        v-if="importMode === 'REPLACE'"
        class="replace-alert"
        title="全量覆盖会移除三个 Sheet 中未出现的现有数据"
        type="warning"
        :closable="false"
        show-icon
      />

      <div v-if="loading" class="import-progress" role="status" aria-live="polite">
        <Icon icon="ep:loading" class="is-loading" />
        <span>正在处理 Excel，大文件可能需要几分钟，请保持当前页面打开</span>
      </div>
    </template>

    <template v-else>
      <div class="result-heading">
        <div>
          <strong>导入完成</strong>
          <span>{{ formatDateTime(result.importedAt) }}</span>
        </div>
        <el-tag :type="result.errors.length ? 'warning' : 'success'" effect="plain">
          {{ result.errors.length ? `${result.errors.length} 条需要检查` : '全部处理成功' }}
        </el-tag>
      </div>

      <el-table :data="resultRows" border table-layout="fixed">
        <el-table-column prop="sheetName" label="数据范围" min-width="132" />
        <el-table-column prop="total" label="读取" width="72" align="right" />
        <el-table-column prop="created" label="新增" width="72" align="right" />
        <el-table-column prop="updated" label="更新" width="72" align="right" />
        <el-table-column prop="removed" label="移除" width="72" align="right" />
        <el-table-column prop="skipped" label="跳过" width="72" align="right" />
        <el-table-column prop="failed" label="失败" width="72" align="right">
          <template #default="{ row }">
            <span :class="{ 'result-failed': row.failed > 0 }">{{ row.failed }}</span>
          </template>
        </el-table-column>
      </el-table>

      <el-collapse v-if="result.errors.length" class="error-collapse">
        <el-collapse-item :title="`查看失败明细（${result.errors.length}）`" name="errors">
          <ol class="error-list">
            <li v-for="error in result.errors" :key="error">{{ error }}</li>
          </ol>
        </el-collapse-item>
      </el-collapse>
    </template>

    <template #footer>
      <template v-if="result">
        <el-button @click="reset">继续导入</el-button>
        <el-button type="primary" @click="visible = false">完成</el-button>
      </template>
      <template v-else>
        <el-button :disabled="loading" @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="submit">开始导入</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type { UploadInstance, UploadUserFile } from 'element-plus'
import type {
  StockPortfolioImportMode,
  StockPortfolioImportResult
} from '@/api/finance/stock/position'
import { StockPositionApi } from '@/api/finance/stock/position'

defineOptions({ name: 'StockPortfolioImportDialog' })

const emit = defineEmits<{ success: [] }>()
const message = useMessage()
const visible = ref(false)
const loading = ref(false)
const importMode = ref<StockPortfolioImportMode>('REPLACE')
const fileList = ref<UploadUserFile[]>([])
const result = ref<StockPortfolioImportResult>()
const uploadRef = ref<UploadInstance>()

const sheets = [
  { index: 1, name: '持仓数据', summary: '当前仓位、收益和区间表现' },
  { index: 2, name: '已清仓数据', summary: '历史清仓收益与大盘比较' },
  { index: 3, name: '交易记录', summary: '买卖成交、发生金额和费用' }
]

const importModeOptions: Array<{ label: string; value: StockPortfolioImportMode }> = [
  { label: '全量覆盖', value: 'REPLACE' },
  { label: '更新已有', value: 'UPDATE' }
]

const resultRows = computed(() =>
  result.value ? [result.value.positions, result.value.closedPositions, result.value.trades] : []
)

const open = () => {
  reset()
  visible.value = true
}

const reset = () => {
  fileList.value = []
  result.value = undefined
  importMode.value = 'REPLACE'
  nextTick(() => uploadRef.value?.clearFiles())
}

const submit = async () => {
  if (loading.value) return
  const rawFile = fileList.value[0]?.raw
  if (!rawFile) {
    message.warning('请选择需要导入的 Excel 文件')
    return
  }
  if (importMode.value === 'REPLACE') {
    try {
      await message.confirm('全量覆盖将以 Excel 为准移除未出现的数据，确定继续吗？')
    } catch {
      return
    }
  }
  loading.value = true
  try {
    result.value = await StockPositionApi.importPortfolio(rawFile, importMode.value)
    emit('success')
    if (result.value.errors.length) {
      message.warning(`导入完成，${result.value.errors.length} 条数据需要检查`)
    } else {
      message.success('投资组合数据已导入')
    }
  } catch {
    // 请求错误由 Axios 全局拦截器提示；此处捕获以避免未处理 Promise。
  } finally {
    loading.value = false
  }
}

const handleExceed = () => message.warning('每次只能导入一个 Excel 文件')
const formatDateTime = (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss')

defineExpose({ open })
</script>

<style scoped>
.sheet-map {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 18px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}

.sheet-map__item {
  display: flex;
  min-width: 0;
  padding: 14px;
  align-items: center;
  gap: 10px;
  border-left: 1px solid var(--el-border-color-lighter);
}

.sheet-map__item:first-child {
  border-left: 0;
}

.sheet-map__index {
  display: inline-flex;
  width: 28px;
  height: 28px;
  font-weight: 700;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 50%;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
}

.sheet-map__item strong,
.sheet-map__item span {
  display: block;
}

.sheet-map__item strong {
  margin-bottom: 3px;
  color: var(--el-text-color-primary);
}

.sheet-map__item div > span {
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.portfolio-upload :deep(.el-upload) {
  width: 100%;
}

.portfolio-upload :deep(.el-upload-dragger) {
  width: 100%;
  padding: 24px 16px;
  border-radius: 4px;
}

.upload-icon {
  margin-bottom: 8px;
  font-size: 34px;
  color: var(--el-color-primary);
}

.upload-tip {
  color: var(--el-text-color-secondary);
  text-align: center;
}

.import-mode {
  display: flex;
  margin-top: 16px;
  align-items: center;
  gap: 12px;
}

.import-mode__label {
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.replace-alert {
  margin-top: 12px;
}

.import-progress {
  display: flex;
  padding: 10px 12px;
  margin-top: 14px;
  align-items: center;
  gap: 8px;
  color: var(--el-color-primary-dark-2);
  background-color: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 4px;
}

.result-heading {
  display: flex;
  margin-bottom: 16px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.result-heading strong,
.result-heading span {
  display: block;
}

.result-heading strong {
  margin-bottom: 4px;
  font-size: 17px;
}

.result-heading span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.result-failed {
  font-weight: 700;
  color: var(--el-color-danger);
}

.error-collapse {
  margin-top: 14px;
}

.error-list {
  max-height: 220px;
  padding-left: 24px;
  overflow: auto;
  line-height: 1.8;
  color: var(--el-color-danger);
}

@media (width <= 720px) {
  .sheet-map {
    grid-template-columns: 1fr;
  }

  .sheet-map__item {
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 0;
  }

  .sheet-map__item:first-child {
    border-top: 0;
  }
}
</style>
