<template>
  <el-drawer
    v-model="visible"
    class="stock-ai-drawer"
    size="min(920px, 100vw)"
    :with-header="false"
    destroy-on-close
    @closed="handleClosed"
  >
    <div class="drawer-shell">
      <header class="drawer-header">
        <div class="stock-identity">
          <span class="ai-mark"><Icon icon="ep:magic-stick" /></span>
          <div>
            <div class="stock-title">
              <strong>{{ target?.name || '单股 AI 分析' }}</strong>
              <span v-if="target">{{ target.symbol }}</span>
            </div>
            <p>技术、财务、股东、事件与交易计划的证据化分析</p>
          </div>
        </div>
        <div class="header-actions">
          <el-tooltip content="复制完整报告" placement="bottom">
            <el-button
              circle
              :disabled="!reportContent"
              aria-label="复制完整报告"
              @click="copyReport"
            >
              <Icon icon="ep:copy-document" />
            </el-button>
          </el-tooltip>
          <el-tooltip content="重新获取最新数据并分析" placement="bottom">
            <el-button circle :disabled="busy" aria-label="重新分析" @click="generateAnalysis">
              <Icon icon="ep:refresh" />
            </el-button>
          </el-tooltip>
          <el-button circle aria-label="关闭" @click="visible = false">
            <Icon icon="ep:close" />
          </el-button>
        </div>
      </header>

      <section class="run-status" :class="`run-status--${statusTone}`">
        <span class="status-icon" :class="{ 'status-icon--running': busy }">
          <Icon :icon="statusIcon" />
        </span>
        <div class="status-copy">
          <div class="status-heading">
            <strong>{{ statusTitle }}</strong>
            <el-tag size="small" effect="plain" :type="statusTagType">{{ statusLabel }}</el-tag>
          </div>
          <p>{{ statusDescription }}</p>
          <div class="status-meta">
            <span v-if="session">{{ session.modelName }}</span>
            <span v-if="session">{{ session.marketBarCount }} 条日线</span>
            <span v-if="session?.dataAsOf">数据截止 {{ formatDateTime(session.dataAsOf) }}</span>
            <span v-if="startedAt">已用时 {{ elapsedLabel }}</span>
          </div>
        </div>
        <el-button v-if="busy" type="danger" plain @click="stopStream">
          <Icon icon="ep:video-pause" class="mr-5px" />
          停止
        </el-button>
        <el-button
          v-else-if="status === 'failed' || status === 'interrupted'"
          type="primary"
          @click="generateAnalysis"
        >
          <Icon icon="ep:refresh" class="mr-5px" />
          重试
        </el-button>
      </section>

      <el-collapse v-if="session?.warnings?.length" class="data-warning">
        <el-collapse-item :title="`数据完整性提示（${session.warnings.length}）`" name="warnings">
          <ul>
            <li v-for="warning in session.warnings" :key="warning">{{ warning }}</li>
          </ul>
        </el-collapse-item>
      </el-collapse>

      <main ref="messageContainerRef" class="analysis-stream">
        <div v-if="messages.length === 0" class="analysis-empty">
          <Icon icon="ep:data-analysis" />
          <strong>{{ busy ? '正在准备单股数据包' : '等待开始分析' }}</strong>
          <span>报告生成后会在这里逐段显示</span>
        </div>
        <template v-for="item in messages" :key="item.id">
          <div v-if="item.type === 'user'" class="user-message">
            <span>{{ item.content }}</span>
          </div>
          <article v-else-if="item.type === 'assistant'" class="assistant-message">
            <div v-if="item.content" class="assistant-content">
              <MarkdownView :content="item.content" />
            </div>
            <div v-else class="assistant-waiting">
              <span class="waiting-dots"><i></i><i></i><i></i></span>
              <span>{{
                status === 'waiting' ? '模型正在阅读数据并组织报告' : '正在生成内容'
              }}</span>
            </div>
          </article>
        </template>
      </main>

      <footer class="question-panel">
        <div v-if="reportContent" class="quick-questions">
          <span>快捷追问</span>
          <el-button
            v-for="item in quickQuestions"
            :key="item"
            size="small"
            plain
            :disabled="busy"
            @click="askQuickQuestion(item)"
          >
            {{ item }}
          </el-button>
        </div>
        <div class="question-input">
          <el-input
            v-model="question"
            type="textarea"
            :rows="2"
            resize="none"
            maxlength="1000"
            show-word-limit
            :disabled="!reportContent || busy"
            placeholder="基于当前报告继续追问，例如：明天放量突破时应该观察哪些确认信号？"
            @keydown.enter.exact.prevent="sendQuestion"
          />
          <el-button
            type="primary"
            class="send-button"
            :disabled="!canSendQuestion"
            @click="sendQuestion"
          >
            <Icon icon="ep:promotion" />
            发送
          </el-button>
        </div>
        <p class="disclaimer">AI 分析基于当前可用数据，仅供研究和交易决策辅助，不构成收益保证。</p>
      </footer>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { ChatMessageApi, type ChatMessageVO } from '@/api/ai/chat/message'
import {
  StockAiAnalysisApi,
  type StockAiSingleAnalysisSessionVO
} from '@/api/finance/stock/ai-analysis'
import MarkdownView from '@/components/MarkdownView/index.vue'

defineOptions({ name: 'StockAiSingleAnalysisDrawer' })

interface StockAiTarget {
  id: number
  market: string
  symbol: string
  name: string
}

type RunStatus =
  | 'idle'
  | 'preparing'
  | 'connecting'
  | 'waiting'
  | 'generating'
  | 'completed'
  | 'stopped'
  | 'interrupted'
  | 'failed'
type StatusTone = 'neutral' | 'active' | 'success' | 'warning' | 'danger'

const message = useMessage()
const visible = ref(false)
const target = ref<StockAiTarget>()
const session = ref<StockAiSingleAnalysisSessionVO>()
const messages = ref<ChatMessageVO[]>([])
const question = ref('')
const status = ref<RunStatus>('idle')
const statusDetail = ref('')
const startedAt = ref<number>()
const finishedAt = ref<number>()
const statusClock = ref(Date.now())
const lastResponseAt = ref<number>()
const abortController = ref<AbortController>()
const messageContainerRef = ref<HTMLElement>()
let statusTimer: number | undefined

const quickQuestions = [
  '当前最关键的支撑、压力和失效条件是什么？',
  '如果下一交易日放量突破，应该观察哪些确认信号？',
  '这只股票当前最大的基本面和筹码风险是什么？'
]

const busy = computed(() =>
  ['preparing', 'connecting', 'waiting', 'generating'].includes(status.value)
)
const reportContent = computed(
  () => messages.value.find((item) => item.type === 'assistant' && item.content)?.content || ''
)
const canSendQuestion = computed(() =>
  Boolean(question.value.trim() && reportContent.value && !busy.value)
)
const statusTone = computed<StatusTone>(() => {
  if (busy.value) return 'active'
  if (status.value === 'completed') return 'success'
  if (status.value === 'stopped' || status.value === 'interrupted') return 'warning'
  if (status.value === 'failed') return 'danger'
  return 'neutral'
})
const statusTagType = computed<'primary' | 'success' | 'warning' | 'danger' | 'info'>(() => {
  if (statusTone.value === 'active') return 'primary'
  if (statusTone.value === 'success') return 'success'
  if (statusTone.value === 'warning') return 'warning'
  if (statusTone.value === 'danger') return 'danger'
  return 'info'
})
const statusIcon = computed(() => {
  if (status.value === 'preparing') return 'ep:loading'
  if (status.value === 'connecting') return 'ep:connection'
  if (status.value === 'waiting') return 'ep:timer'
  if (status.value === 'generating') return 'ep:magic-stick'
  if (status.value === 'completed') return 'ep:circle-check-filled'
  if (status.value === 'stopped') return 'ep:video-pause'
  if (status.value === 'interrupted') return 'ep:warning-filled'
  if (status.value === 'failed') return 'ep:circle-close-filled'
  return 'ep:data-analysis'
})
const statusTitle = computed(() => {
  if (status.value === 'preparing') return '正在汇总最新单股数据'
  if (status.value === 'connecting') return '正在连接 AI 模型'
  if (status.value === 'waiting') return '模型已连接，等待首段响应'
  if (status.value === 'generating') return 'AI 正在持续生成分析'
  if (status.value === 'completed') return '单股分析已完成'
  if (status.value === 'stopped') return '生成已停止'
  if (status.value === 'interrupted') return '模型连接已中断'
  if (status.value === 'failed') return '单股分析失败'
  return '单股 AI 分析'
})
const statusLabel = computed(() => {
  if (status.value === 'preparing') return '准备数据'
  if (status.value === 'connecting') return '连接中'
  if (status.value === 'waiting') return '等待响应'
  if (status.value === 'generating') return '生成中'
  if (status.value === 'completed') return '已完成'
  if (status.value === 'stopped') return '已停止'
  if (status.value === 'interrupted') return '已中断'
  if (status.value === 'failed') return '失败'
  return '未开始'
})
const statusDescription = computed(() => {
  if (statusDetail.value) return statusDetail.value
  if (status.value === 'preparing')
    return '正在读取行情、技术指标、财务、股东、研报、公告和账户记录'
  if (status.value === 'connecting') return '数据包已经完成，正在建立流式连接'
  if (status.value === 'waiting') return '连接正常，模型正在阅读数据并组织结论'
  if (status.value === 'generating') return '已收到模型响应，报告内容正在逐段写入'
  if (status.value === 'completed') return '可以复制报告，或在底部基于当前上下文继续追问'
  if (status.value === 'stopped') return '已保留当前生成内容，可重新分析或继续查看'
  if (status.value === 'interrupted') return '已保留返回内容，可点击重试重新建立连接'
  if (status.value === 'failed') return '请检查模型配置、行情服务或网络后重试'
  return '打开股票右侧 AI 入口后自动开始分析'
})
const elapsedLabel = computed(() => {
  if (!startedAt.value) return '--'
  const seconds = Math.max(
    0,
    Math.floor(((finishedAt.value || statusClock.value) - startedAt.value) / 1000)
  )
  if (seconds < 60) return `${seconds} 秒`
  return `${Math.floor(seconds / 60)} 分 ${(seconds % 60).toString().padStart(2, '0')} 秒`
})

const formatDateTime = (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss')

const updateStatus = (nextStatus: RunStatus, detail = '') => {
  status.value = nextStatus
  statusDetail.value = detail
  statusClock.value = Date.now()
  if (['preparing', 'connecting', 'waiting', 'generating'].includes(nextStatus)) {
    startedAt.value ??= Date.now()
    finishedAt.value = undefined
  } else if (nextStatus !== 'idle' && startedAt.value) {
    finishedAt.value = Date.now()
  }
}

const resetRun = () => {
  abortController.value?.abort()
  abortController.value = undefined
  session.value = undefined
  messages.value = []
  question.value = ''
  startedAt.value = Date.now()
  finishedAt.value = undefined
  lastResponseAt.value = undefined
  statusClock.value = Date.now()
  statusDetail.value = ''
}

const scrollToBottom = async () => {
  await nextTick()
  const container = messageContainerRef.value
  if (container) container.scrollTop = container.scrollHeight
}

const open = async (row: StockAiTarget) => {
  target.value = row
  visible.value = true
  await nextTick()
  await generateAnalysis()
}

const generateAnalysis = async () => {
  if (!target.value || busy.value) return
  resetRun()
  updateStatus('preparing')
  try {
    const config = await StockAiAnalysisApi.getConfigStatus()
    if (!config.configured) {
      updateStatus('failed', config.message || '尚未配置可用 AI 模型')
      return
    }
    const created = await StockAiAnalysisApi.createSingleStockSession({ trackId: target.value.id })
    session.value = created
    await sendStream(
      created.initialPrompt,
      `已提交 ${created.code} ${created.name} 数据包 · ${created.marketBarCount} 条日线`
    )
  } catch {
    if (status.value === 'preparing') updateStatus('failed', '单股数据包或会话创建失败')
  }
}

const sendStream = async (content: string, displayContent: string) => {
  if (!session.value) return
  const controller = new AbortController()
  abortController.value = controller
  updateStatus('connecting')
  let firstChunk = true
  let failed = false
  let closedNormally = false
  const pendingUserIndex = messages.value.length
  messages.value.push({
    id: -Date.now(),
    conversationId: session.value.conversationId,
    type: 'user',
    content: displayContent,
    createTime: new Date()
  } as ChatMessageVO)
  messages.value.push({
    id: -Date.now() - 1,
    conversationId: session.value.conversationId,
    type: 'assistant',
    content: '',
    reasoningContent: '',
    createTime: new Date()
  } as ChatMessageVO)
  await scrollToBottom()

  try {
    await ChatMessageApi.sendChatMessageStream(
      session.value.conversationId,
      content,
      controller,
      true,
      false,
      async (event) => {
        const result = JSON.parse(event.data)
        if (result.code !== 0) {
          failed = true
          updateStatus('failed', `模型返回错误：${result.msg}`)
          controller.abort()
          return
        }
        const receive = result.data?.receive
        if (!receive || (!receive.content && !receive.reasoningContent)) return
        lastResponseAt.value = Date.now()
        updateStatus('generating')
        if (firstChunk) {
          firstChunk = false
          const sendMessage = result.data.send as ChatMessageVO
          sendMessage.content = displayContent
          messages.value.splice(pendingUserIndex, 2, sendMessage, {
            ...receive,
            content: receive.content || '',
            reasoningContent: receive.reasoningContent || ''
          })
        } else {
          const assistant = messages.value[messages.value.length - 1]
          if (receive.content) assistant.content = `${assistant.content || ''}${receive.content}`
          if (receive.reasoningContent) {
            assistant.reasoningContent = `${assistant.reasoningContent || ''}${receive.reasoningContent}`
          }
        }
        await scrollToBottom()
      },
      (error: unknown) => {
        if (!failed && !controller.signal.aborted) {
          updateStatus('interrupted', '流式连接意外中断，已生成内容会保留')
        }
        throw error
      },
      () => {
        closedNormally = true
        if (controller.signal.aborted || failed) return
        updateStatus(firstChunk ? 'interrupted' : 'completed')
      },
      undefined,
      async () => {
        if (!controller.signal.aborted) updateStatus('waiting')
      }
    )
  } catch {
    if (!controller.signal.aborted && !['interrupted', 'failed'].includes(status.value)) {
      updateStatus('failed', '流式响应处理失败，请重新分析')
    }
  } finally {
    if (abortController.value === controller) abortController.value = undefined
    if (firstChunk) {
      const assistant = messages.value[messages.value.length - 1]
      if (assistant?.type === 'assistant' && !assistant.content) {
        messages.value.splice(pendingUserIndex + 1, 1)
      }
    }
    if (
      !controller.signal.aborted &&
      !closedNormally &&
      !['interrupted', 'failed'].includes(status.value)
    ) {
      updateStatus('interrupted', '流式连接提前结束，已生成内容会保留')
    }
  }
}

const stopStream = () => {
  if (!abortController.value || abortController.value.signal.aborted) return
  updateStatus('stopped')
  abortController.value.abort()
  abortController.value = undefined
}

const sendQuestion = async () => {
  const content = question.value.trim()
  if (!content || !canSendQuestion.value) return
  question.value = ''
  startedAt.value = Date.now()
  finishedAt.value = undefined
  await sendStream(content, content)
}

const askQuickQuestion = async (content: string) => {
  question.value = content
  await sendQuestion()
}

const copyReport = async () => {
  if (!reportContent.value) return
  await navigator.clipboard.writeText(reportContent.value)
  message.success('完整报告已复制')
}

const handleClosed = () => {
  abortController.value?.abort()
  abortController.value = undefined
}

onMounted(() => {
  statusTimer = window.setInterval(() => (statusClock.value = Date.now()), 1000)
})

onBeforeUnmount(() => {
  abortController.value?.abort()
  window.clearInterval(statusTimer)
})

defineExpose({ open })
</script>

<style scoped lang="scss">
.drawer-shell {
  display: grid;
  grid-template-rows: auto auto auto minmax(280px, 1fr) auto;
  height: 100%;
  min-height: 0;
  background: var(--el-bg-color);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.stock-identity,
.stock-title,
.header-actions,
.status-heading,
.status-meta,
.quick-questions,
.question-input {
  display: flex;
  align-items: center;
}

.stock-identity {
  min-width: 0;
  gap: 12px;
}

.ai-mark {
  display: grid;
  width: 38px;
  height: 38px;
  font-size: 20px;
  color: #047a74;
  background: #e8f7f5;
  border: 1px solid #b8e4df;
  border-radius: 6px;
  flex: 0 0 38px;
  place-items: center;
}

.stock-title {
  gap: 10px;
  line-height: 1.2;
}

.stock-title strong {
  overflow: hidden;
  font-size: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-title span,
.stock-identity p,
.status-copy p,
.status-meta,
.analysis-empty span,
.disclaimer {
  color: var(--el-text-color-secondary);
}

.stock-identity p,
.status-copy p,
.disclaimer {
  margin: 5px 0 0;
  line-height: 1.5;
}

.header-actions {
  flex: 0 0 auto;
  gap: 6px;
}

.run-status {
  display: grid;
  padding: 14px 16px;
  margin: 14px 22px 0;
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color);
  border-left: 4px solid #7b8794;
  border-radius: 6px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
}

.run-status--active {
  background: #f0faf8;
  border-left-color: #0b8f87;
}

.run-status--success {
  border-left-color: var(--el-color-success);
}

.run-status--warning {
  border-left-color: var(--el-color-warning);
}

.run-status--danger {
  border-left-color: var(--el-color-danger);
}

.status-icon {
  display: grid;
  width: 34px;
  height: 34px;
  font-size: 20px;
  color: #0b8f87;
  place-items: center;
}

.status-icon--running {
  animation: status-pulse 1.6s ease-in-out infinite;
}

.status-copy {
  min-width: 0;
}

.status-heading {
  gap: 8px;
}

.status-copy p {
  font-size: 13px;
}

.status-meta {
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 6px;
  font-size: 12px;
}

.data-warning {
  margin: 8px 22px 0;
  border-top: 0;
}

.data-warning ul {
  padding-left: 20px;
  margin: 0;
  line-height: 1.8;
  color: var(--el-text-color-regular);
}

.analysis-stream {
  min-height: 0;
  padding: 6px 22px 24px;
  margin-top: 10px;
  overflow: auto;
  scroll-behavior: smooth;
}

.analysis-empty {
  display: grid;
  min-height: 260px;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: var(--el-text-color-regular);
}

.analysis-empty :deep(.el-icon),
.analysis-empty > :first-child {
  font-size: 34px;
  color: #0b8f87;
}

.user-message {
  display: flex;
  justify-content: flex-end;
  margin: 14px 0;
}

.user-message span {
  max-width: 78%;
  padding: 9px 12px;
  line-height: 1.55;
  color: #075f5a;
  background: #e8f7f5;
  border: 1px solid #b8e4df;
  border-radius: 6px 6px 2px;
}

.assistant-message {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.assistant-content {
  min-width: 0;
}

.assistant-waiting {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  color: var(--el-text-color-secondary);
}

.waiting-dots {
  display: flex;
  gap: 4px;
}

.waiting-dots i {
  width: 6px;
  height: 6px;
  background: #0b8f87;
  border-radius: 50%;
  animation: dot-bounce 1.2s infinite ease-in-out;
}

.waiting-dots i:nth-child(2) {
  animation-delay: 0.15s;
}

.waiting-dots i:nth-child(3) {
  animation-delay: 0.3s;
}

.question-panel {
  padding: 12px 22px 16px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
}

.quick-questions {
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 10px;
}

.quick-questions > span {
  margin-right: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.question-input {
  align-items: stretch;
  gap: 8px;
}

.send-button {
  width: 78px;
  min-height: 58px;
}

.disclaimer {
  font-size: 11px;
  text-align: center;
}

@keyframes status-pulse {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.92);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes dot-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }

  30% {
    transform: translateY(-4px);
  }
}

@media (width <= 640px) {
  .drawer-header {
    align-items: flex-start;
    padding: 14px;
  }

  .stock-identity p {
    display: none;
  }

  .run-status {
    grid-template-columns: auto minmax(0, 1fr);
    margin: 10px 14px 0;
  }

  .run-status > .el-button {
    grid-column: 1 / -1;
  }

  .data-warning {
    margin: 8px 14px 0;
  }

  .analysis-stream {
    padding-right: 14px;
    padding-left: 14px;
  }

  .question-panel {
    padding: 10px 14px 12px;
  }

  .quick-questions {
    display: none;
  }

  .user-message span {
    max-width: 92%;
  }
}
</style>
