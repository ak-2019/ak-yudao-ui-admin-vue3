<template>
  <Dialog v-model="visible" title="识图添加股票" width="min(820px, calc(100vw - 24px))">
    <el-alert
      type="info"
      show-icon
      :closable="false"
      title="支持截图、持仓列表或行情软件图片；识别只在当前浏览器执行，系统仅提取 A 股代码和名称，不会上传原图。"
    />

    <el-upload
      class="image-uploader"
      drag
      :auto-upload="false"
      :show-file-list="false"
      accept="image/png,image/jpeg,image/webp,image/bmp"
      :on-change="handleFileChange"
      :disabled="recognizing"
    >
      <div v-if="!previewUrl" class="upload-empty">
        <Icon icon="ep:picture" />
        <strong>拖入图片或点击选择</strong>
        <span>首次识别会加载中文 OCR 模型，可能需要一点时间</span>
      </div>
      <img v-else :src="previewUrl" alt="待识别股票图片" class="image-preview" />
    </el-upload>

    <div v-if="recognizing || recognitionError" class="recognition-status">
      <el-progress
        v-if="recognizing"
        :percentage="recognitionProgress"
        :indeterminate="recognitionProgress === 0"
      />
      <span v-if="recognizing">{{ recognitionStatus || '正在识别图片…' }}</span>
      <el-alert v-if="recognitionError" type="error" :closable="false" :title="recognitionError" />
    </div>

    <el-form label-position="top" class="recognition-form">
      <el-form-item label="识别文本（可手动修正）">
        <el-input
          v-model="recognizedText"
          type="textarea"
          :rows="4"
          maxlength="4000"
          show-word-limit
          placeholder="识别完成后会显示原始文字；也可以直接粘贴股票代码或名称，例如：600000 浦发银行"
        />
      </el-form-item>
    </el-form>

    <div class="recognition-toolbar">
      <span v-if="searched">已找到 {{ candidates.length }} 只可添加股票</span>
      <span v-else>识别出代码后会自动查询本地股票池和真实行情</span>
      <el-button :loading="searching" :disabled="!recognizedText.trim()" @click="resolveCandidates">
        <Icon icon="ep:search" class="mr-5px" />
        解析并查找股票
      </el-button>
    </div>

    <el-table v-if="searched" :data="candidates" stripe max-height="300" table-layout="fixed">
      <el-table-column prop="name" label="股票名称" min-width="180" show-overflow-tooltip />
      <el-table-column prop="symbol" label="股票代码" width="150" />
      <el-table-column label="来源" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="row.source === 'local' ? 'info' : 'warning'" effect="plain">
            {{ row.source === 'local' ? '本地股票池' : '真实行情' }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button :disabled="recognizing || searching" @click="close">取消</el-button>
      <el-button
        type="primary"
        :disabled="candidates.length === 0 || recognizing || searching"
        @click="confirmCandidates"
      >
        <Icon icon="ep:plus" class="mr-5px" />
        确认添加（{{ candidates.length }}）
      </el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { UploadFile } from 'element-plus'
import {
  StockApi,
  type FinanceMarket,
  type StockMarketSearchVO,
  type StockSearchVO
} from '@/api/finance/stock'
import type { StockPoolAddCandidate } from './BatchStockPoolAddDialog.vue'

defineOptions({ name: 'FinanceStockImageAddDialog' })

const props = defineProps<{
  trackedSymbols: string[]
}>()

const emit = defineEmits<{
  recognized: [candidates: StockPoolAddCandidate[]]
}>()

const message = useMessage()
const visible = ref(false)
const previewUrl = ref('')
const recognizedText = ref('')
const candidates = ref<StockPoolAddCandidate[]>([])
const recognizing = ref(false)
const searching = ref(false)
const recognitionProgress = ref(0)
const recognitionStatus = ref('')
const recognitionError = ref('')
const searched = ref(false)

const ocrAssetBase = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/tesseract`
const ocrWorkerPath = `${ocrAssetBase}/worker.min.js`
const ocrCorePath = `${ocrAssetBase}/core`
const ocrLangPath = `${ocrAssetBase}/lang`

const normalizedSymbol = (market: string, code: string) => `${market}:${code}`

const normalizeText = (value: string) =>
  value
    .replace(/[：:，,。；;]/g, ' ')
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/\s+/g, ' ')
    .trim()

const extractKeywords = (text: string) => {
  const normalized = normalizeText(text)
  const codes = normalized.match(/(?:60|68|00|30|83|87|88|43|92)\d{4}/g) ?? []
  const excluded = new Set([
    '股票代码',
    '股票名称',
    '证券代码',
    '证券名称',
    '持仓数量',
    '最新价',
    '涨跌幅',
    '市值',
    '金额'
  ])
  const names = normalized
    .split(/[\r\n ]+/)
    .map((token) => token.replace(/[^\u4e00-\u9fa5]/g, ''))
    .filter((token) => token.length >= 2 && token.length <= 12 && !excluded.has(token))
  return Array.from(new Set([...codes, ...names])).slice(0, 24)
}

const toLocalCandidate = (stock: StockSearchVO): StockPoolAddCandidate => ({
  key: `local:${stock.market}:${stock.code}`,
  source: 'local',
  stockId: stock.id,
  symbol: stock.symbol,
  market: stock.market,
  code: stock.code,
  name: stock.name
})

const toMarketCandidate = (stock: StockMarketSearchVO): StockPoolAddCandidate => ({
  key: `market:${stock.market}:${stock.code}`,
  source: 'market',
  stockId: stock.stockId,
  symbol: normalizedSymbol(stock.market, stock.code),
  market: stock.market as FinanceMarket,
  code: stock.code,
  name: stock.name
})

const isTracked = (candidate: StockPoolAddCandidate) => {
  const symbols = new Set(props.trackedSymbols.map((symbol) => symbol.toUpperCase()))
  return symbols.has(candidate.symbol.toUpperCase())
}

const resolveCandidates = async () => {
  const keywords = extractKeywords(recognizedText.value)
  if (keywords.length === 0) {
    candidates.value = []
    searched.value = true
    message.warning('未识别出 A 股代码或股票名称，请修正识别文本后重试')
    return
  }
  searching.value = true
  recognitionError.value = ''
  try {
    const results: PromiseSettledResult<{
      local: StockSearchVO[]
      market: StockMarketSearchVO[]
    }>[] = []
    for (let index = 0; index < keywords.length; index += 4) {
      const batch = keywords.slice(index, index + 4)
      results.push(
        ...(await Promise.allSettled(
          batch.map(async (keyword) => {
            const [localResult, marketResult] = await Promise.allSettled([
              StockApi.search({ keyword }),
              StockApi.marketSearch({ keyword })
            ])
            return {
              local: localResult.status === 'fulfilled' ? localResult.value : [],
              market: marketResult.status === 'fulfilled' ? (marketResult.value.data ?? []) : []
            }
          })
        ))
      )
    }
    const merged = new Map<string, StockPoolAddCandidate>()
    results.forEach((result) => {
      if (result.status !== 'fulfilled') return
      result.value.local.forEach((stock) => {
        const candidate = toLocalCandidate(stock)
        if (!isTracked(candidate)) merged.set(candidate.symbol, candidate)
      })
      result.value.market.forEach((stock) => {
        const candidate = toMarketCandidate(stock)
        if (!isTracked(candidate) && !merged.has(candidate.symbol))
          merged.set(candidate.symbol, candidate)
      })
    })
    candidates.value = Array.from(merged.values())
    searched.value = true
    if (candidates.value.length === 0) message.warning('没有找到可添加的 A 股股票')
  } finally {
    searching.value = false
  }
}

const recognizeImage = async (file: File) => {
  recognizing.value = true
  recognitionProgress.value = 0
  recognitionStatus.value = '正在加载中文 OCR 模型'
  recognitionError.value = ''
  try {
    const Tesseract = await import('tesseract.js')
    const worker = await Tesseract.createWorker(['eng', 'chi_sim'], 1, {
      workerPath: ocrWorkerPath,
      corePath: ocrCorePath,
      langPath: ocrLangPath,
      workerBlobURL: false,
      logger: (info) => {
        recognitionProgress.value = Math.max(0, Math.min(100, Math.round(info.progress * 100)))
        recognitionStatus.value = info.status || '正在识别图片'
      },
      errorHandler: (error) => {
        console.error('[StockImageAddDialog] OCR worker error', error)
      }
    })
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
        preserve_interword_spaces: '1'
      })
      const result = await worker.recognize(file)
      recognizedText.value = result.data.text.trim()
      await resolveCandidates()
    } finally {
      try {
        await worker.terminate()
      } catch (error) {
        console.warn('[StockImageAddDialog] OCR worker terminate failed', error)
      }
    }
  } catch (error) {
    console.error('[StockImageAddDialog] OCR recognition failed', error)
    const detail = error instanceof Error ? error.message : String(error || '')
    recognitionError.value = detail
      ? `OCR 识别失败：${detail}。请检查浏览器控制台，或改为粘贴文字。`
      : 'OCR 识别失败，请检查浏览器控制台或改为粘贴文字'
  } finally {
    recognizing.value = false
  }
}

const handleFileChange = async (uploadFile: UploadFile) => {
  const file = uploadFile.raw
  if (!file) return
  if (!file.type.startsWith('image/')) {
    message.warning('请选择 PNG、JPG、WEBP 或 BMP 图片')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    message.warning('图片不能超过 10 MB')
    return
  }
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
  await recognizeImage(file)
}

const confirmCandidates = () => {
  emit('recognized', candidates.value)
  close()
}

const close = () => {
  if (recognizing.value || searching.value) return
  visible.value = false
  candidates.value = []
  recognizedText.value = ''
  searched.value = false
  recognitionError.value = ''
  recognitionStatus.value = ''
  recognitionProgress.value = 0
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

const open = () => {
  close()
  visible.value = true
}

defineExpose({ open })
</script>

<style scoped>
.image-uploader {
  margin-top: 16px;
}

.image-uploader :deep(.el-upload-dragger) {
  width: 100%;
  min-height: 150px;
  padding: 12px;
}

.upload-empty {
  display: flex;
  min-height: 126px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: var(--el-text-color-secondary);
}

.upload-empty > .iconify {
  font-size: 32px;
  color: var(--el-color-primary);
}

.upload-empty span {
  font-size: 12px;
}

.image-preview {
  display: block;
  max-width: 100%;
  max-height: 220px;
  margin: 0 auto;
  object-fit: contain;
}

.recognition-status {
  display: grid;
  gap: 8px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.recognition-form {
  margin-top: 16px;
}

.recognition-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (width <= 620px) {
  .recognition-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
