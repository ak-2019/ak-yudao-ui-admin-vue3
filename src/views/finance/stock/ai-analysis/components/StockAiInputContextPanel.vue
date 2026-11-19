<template>
  <section class="input-context-panel">
    <header class="context-heading">
      <div>
        <h2>当次模型输入</h2>
        <span>{{ contextRange }}</span>
      </div>
      <div v-if="content" class="context-actions">
        <el-button text circle title="复制完整输入" @click="emit('copy')">
          <Icon icon="ep:copy-document" />
        </el-button>
        <el-button text circle title="下载完整输入" @click="emit('download')">
          <Icon icon="ep:download" />
        </el-button>
      </div>
    </header>

    <div v-if="analysis" class="context-metrics">
      <div
        ><span>持仓</span><strong>{{ analysis.positionCount }}</strong></div
      >
      <div
        ><span>成交</span><strong>{{ analysis.tradeCount }}</strong></div
      >
      <div
        ><span>股票</span><strong>{{ analysis.stockCount }}</strong></div
      >
      <div
        ><span>日线</span><strong>{{ analysis.marketBarCount }}</strong></div
      >
    </div>

    <div class="context-toolbar">
      <el-segmented v-model="displayMode" :options="displayOptions" size="small" />
      <span>{{ characterCount }} 字符</span>
    </div>

    <div v-loading="loading" class="context-viewport">
      <template v-if="content">
        <MarkdownView
          v-if="displayMode === 'formatted'"
          class="context-markdown"
          :content="content"
        />
        <pre v-else class="context-source">{{ content }}</pre>
      </template>
      <el-empty
        v-else
        :image-size="56"
        description="生成或打开历史 AI 报告后显示当次完整输入数据"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { StockAiAnalysisSessionVO } from '@/api/finance/stock/ai-analysis'
import MarkdownView from '@/components/MarkdownView/index.vue'

defineOptions({ name: 'StockAiInputContextPanel' })

const props = withDefaults(
  defineProps<{
    content: string
    analysis?: StockAiAnalysisSessionVO
    loading?: boolean
  }>(),
  {
    analysis: undefined,
    loading: false
  }
)

const emit = defineEmits<{
  copy: []
  download: []
}>()

type DisplayMode = 'formatted' | 'source'

const displayMode = ref<DisplayMode>('formatted')
const displayOptions = [
  { label: '格式化', value: 'formatted' },
  { label: '原文', value: 'source' }
]

const characterCount = computed(() => props.content.length.toLocaleString('zh-CN'))
const contextRange = computed(() => {
  if (!props.analysis) return '等待分析数据包'
  return props.analysis.beginDate === props.analysis.endDate
    ? props.analysis.endDate
    : `${props.analysis.beginDate} 至 ${props.analysis.endDate}`
})
</script>

<style scoped>
.input-context-panel {
  display: grid;
  grid-template-rows: 56px auto 44px minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
}

.context-heading,
.context-actions,
.context-toolbar {
  display: flex;
  align-items: center;
}

.context-heading {
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.context-heading h2 {
  padding: 0;
  margin: 0;
  font-size: 14px;
  line-height: 22px;
  letter-spacing: 0;
}

.context-heading span,
.context-toolbar > span {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.context-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.context-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.context-metrics > div {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 8px 6px;
  text-align: center;
  border-left: 1px solid var(--el-border-color-lighter);
}

.context-metrics > div:first-child {
  border-left: 0;
}

.context-metrics span {
  font-size: 10px;
  color: var(--el-text-color-placeholder);
}

.context-metrics strong {
  margin-top: 2px;
  font-size: 14px;
}

.context-toolbar {
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background: var(--el-fill-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.context-viewport {
  max-height: calc(100vh - 410px);
  min-height: 520px;
  padding: 12px;
  overflow: auto;
}

.context-markdown {
  min-width: 0;
  font-size: 12px;
  line-height: 1.65;
}

.context-markdown :deep(h1),
.context-markdown :deep(h2),
.context-markdown :deep(h3) {
  margin-top: 16px;
  margin-bottom: 8px;
  font-size: 14px;
  letter-spacing: 0;
}

.context-markdown :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  font-size: 11px;
  white-space: nowrap;
  border-collapse: collapse;
}

.context-markdown :deep(th),
.context-markdown :deep(td) {
  padding: 5px 7px;
  border: 1px solid var(--el-border-color-lighter);
}

.context-source {
  min-width: 100%;
  padding: 0;
  margin: 0;
  overflow: visible;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.65;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

@media (width <= 860px) {
  .context-viewport {
    max-height: 520px;
    min-height: 320px;
  }
}
</style>
