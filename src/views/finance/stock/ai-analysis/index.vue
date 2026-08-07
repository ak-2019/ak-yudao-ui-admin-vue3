<template>
  <div class="stock-ai-page">
    <header class="command-bar">
      <div class="page-identity">
        <div class="page-icon"><Icon icon="ep:magic-stick" /></div>
        <div>
          <h1>股票操作 AI 分析</h1>
          <div class="model-line">
            <span
              class="status-dot"
              :class="configStatus?.configured ? 'status-dot--ready' : 'status-dot--missing'"
            ></span>
            <span>{{ modelStatusText }}</span>
          </div>
        </div>
      </div>

      <div class="command-actions">
        <el-segmented v-model="period" :options="periodOptions" :disabled="generating" />
        <el-date-picker
          v-if="period === 'CUSTOM'"
          v-model="customDateRange"
          class="custom-range-picker"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          unlink-panels
          :clearable="false"
          :disabled="generating"
          :disabled-date="disableFutureDate"
        />
        <el-button
          type="primary"
          :loading="generating"
          :disabled="streaming || !configStatus?.configured"
          v-hasPermi="['finance:stock-ai-analysis:generate']"
          @click="generateReport"
        >
          <Icon icon="ep:document-add" class="mr-5px" />
          生成{{ periodLabel }}分析
        </el-button>
        <el-button v-if="streaming" type="danger" plain @click="stopStream">
          <Icon icon="ep:video-pause" class="mr-5px" />
          停止
        </el-button>
        <el-dropdown trigger="click">
          <el-button circle title="AI 配置">
            <Icon icon="ep:setting" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="goToConfig('/finance/ai-api-key')">
                <Icon icon="ep:key" class="mr-8px" />AI 密钥配置
              </el-dropdown-item>
              <el-dropdown-item @click="goToConfig('/finance/ai-model')">
                <Icon icon="ep:cpu" class="mr-8px" />AI 模型配置
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <div v-if="configStatus && !configStatus.configured" class="configuration-warning">
      <Icon icon="ep:warning" />
      <span>{{ configStatus.message }}</span>
      <el-button link type="primary" @click="goToConfig('/finance/ai-api-key')">配置密钥</el-button>
      <el-button link type="primary" @click="goToConfig('/finance/ai-model')">配置模型</el-button>
    </div>

    <section class="metric-strip">
      <div class="metric-item metric-item--period">
        <span class="metric-label">分析区间</span>
        <strong>{{ analysisDateRange }}</strong>
      </div>
      <div class="metric-item">
        <span class="metric-label">当前持仓</span>
        <strong>{{ session?.positionCount ?? '--' }}</strong>
      </div>
      <div class="metric-item">
        <span class="metric-label">周期成交</span>
        <strong>{{ session?.tradeCount ?? '--' }}</strong>
      </div>
      <div class="metric-item">
        <span class="metric-label">涉及股票</span>
        <strong>{{ session?.stockCount ?? '--' }}</strong>
      </div>
      <div class="metric-item">
        <span class="metric-label">行情日线</span>
        <strong>{{ session?.marketBarCount ?? '--' }}</strong>
      </div>
      <div class="metric-item" :class="{ 'metric-item--warning': session?.missingMarketDataCount }">
        <span class="metric-label">行情缺失</span>
        <strong>{{ session?.missingMarketDataCount ?? '--' }}</strong>
      </div>
    </section>

    <div v-if="session?.warnings?.length" class="data-warning-line">
      <Icon icon="ep:info-filled" />
      <el-tooltip placement="bottom" :show-after="200">
        <template #content>
          <div class="warning-tooltip">
            <div v-for="warning in session.warnings" :key="warning">{{ warning }}</div>
          </div>
        </template>
        <span>本次数据包有 {{ session.warnings.length }} 项完整性说明</span>
      </el-tooltip>
    </div>

    <main class="analysis-workspace">
      <section class="conversation-panel">
        <div class="conversation-heading">
          <div>
            <h2>{{ activeTitle || `${periodLabel}分析` }}</h2>
            <span v-if="activeConversationId" class="conversation-id">
              会话 #{{ activeConversationId }}
            </span>
          </div>
          <div class="report-actions" v-if="reportContent">
            <el-button text title="复制报告" @click="copyReport">
              <Icon icon="ep:copy-document" />
            </el-button>
            <el-button text title="下载 Markdown" @click="downloadReport">
              <Icon icon="ep:download" />
            </el-button>
          </div>
        </div>

        <div ref="messageViewport" class="message-viewport" v-loading="loadingConversation">
          <div v-if="messages.length === 0 && !loadingConversation" class="empty-report">
            <Icon icon="ep:data-analysis" />
            <strong>暂无分析报告</strong>
            <span>{{
              configStatus?.configured ? `选择周期后生成${periodLabel}` : '请先完成 AI 模型配置'
            }}</span>
          </div>

          <article
            v-for="item in messages"
            :key="`${item.id}-${item.type}-${item.createTime}`"
            class="message-row"
            :class="`message-row--${item.type}`"
          >
            <template v-if="item.type === 'user'">
              <div class="user-message">
                <span>{{ item.content }}</span>
              </div>
            </template>
            <template v-else>
              <div class="assistant-message">
                <div class="assistant-meta">
                  <span class="assistant-mark"><Icon icon="ep:magic-stick" /></span>
                  <span>AI 交易复盘</span>
                  <span class="message-time">{{ formatMessageTime(item.createTime) }}</span>
                </div>
                <div v-if="item.reasoningContent" class="reasoning-note">
                  <el-collapse>
                    <el-collapse-item title="查看推理过程">
                      <MarkdownView :content="item.reasoningContent" />
                    </el-collapse-item>
                  </el-collapse>
                </div>
                <MarkdownView v-if="item.content" class="report-markdown" :content="item.content" />
                <div v-else class="thinking-line">
                  <span></span><span></span><span></span>
                  正在分析持仓、成交与行情
                </div>
              </div>
            </template>
          </article>
        </div>

        <div
          class="question-composer"
          :class="{ 'question-composer--disabled': !activeConversationId }"
        >
          <el-input
            v-model="question"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 5 }"
            resize="none"
            maxlength="2000"
            show-word-limit
            :disabled="!activeConversationId || streaming"
            placeholder="针对报告继续提问"
            @keydown.enter.exact.prevent="handleEnter"
            @compositionstart="isComposing = true"
            @compositionend="handleCompositionEnd"
          />
          <el-button
            class="send-button"
            type="primary"
            circle
            title="发送问题"
            :disabled="!canSendQuestion"
            @click="sendQuestion"
          >
            <Icon icon="ep:promotion" />
          </el-button>
        </div>
      </section>

      <aside class="history-panel">
        <div class="history-heading">
          <div>
            <h2>最近分析</h2>
            <span>{{ history.length }} 个会话</span>
          </div>
          <el-button text circle title="刷新" :loading="loadingHistory" @click="loadHistory">
            <Icon icon="ep:refresh" />
          </el-button>
        </div>

        <div class="history-list" v-loading="loadingHistory">
          <button
            v-for="item in history"
            :key="item.conversationId"
            type="button"
            class="history-item"
            :class="{ 'history-item--active': item.conversationId === activeConversationId }"
            @click="openHistory(item)"
          >
            <span class="history-period">{{ getPeriodLabel(item.period) }}</span>
            <span class="history-title">{{ item.title.replace('[股票AI] ', '') }}</span>
            <span class="history-time">{{ formatHistoryTime(item.createTime) }}</span>
            <span
              class="history-delete"
              role="button"
              title="删除会话"
              @click.stop="deleteHistory(item)"
            >
              <Icon icon="ep:delete" />
            </span>
          </button>
          <div v-if="history.length === 0 && !loadingHistory" class="history-empty"
            >暂无历史分析</div
          >
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ChatConversationApi } from '@/api/ai/chat/conversation'
import { ChatMessageApi, type ChatMessageVO } from '@/api/ai/chat/message'
import {
  StockAiAnalysisApi,
  type StockAiAnalysisConfigStatusVO,
  type StockAiAnalysisHistoryVO,
  type StockAiAnalysisPeriod,
  type StockAiAnalysisSessionVO
} from '@/api/finance/stock/ai-analysis'
import MarkdownView from '@/components/MarkdownView/index.vue'
import download from '@/utils/download'
import { formatDate } from '@/utils/formatTime'
import { useClipboard } from '@vueuse/core'

defineOptions({ name: 'FinanceStockAiAnalysis' })

const router = useRouter()
const message = useMessage()
const { copy } = useClipboard({ legacy: true })

const period = ref<StockAiAnalysisPeriod>('WEEKLY')
const periodOptions = [
  { label: '日报', value: 'DAILY' },
  { label: '周报', value: 'WEEKLY' },
  { label: '月报', value: 'MONTHLY' },
  { label: '自定义', value: 'CUSTOM' }
]
const today = new Date()
const thirtyDaysAgo = new Date(today)
thirtyDaysAgo.setDate(today.getDate() - 29)
const customDateRange = ref<[string, string]>([
  formatDate(thirtyDaysAgo, 'YYYY-MM-DD'),
  formatDate(today, 'YYYY-MM-DD')
])
const configStatus = ref<StockAiAnalysisConfigStatusVO>()
const session = ref<StockAiAnalysisSessionVO>()
const history = ref<StockAiAnalysisHistoryVO[]>([])
const messages = ref<ChatMessageVO[]>([])
const activeConversationId = ref<number>()
const activeTitle = ref('')
const question = ref('')
const generating = ref(false)
const streaming = ref(false)
const loadingHistory = ref(false)
const loadingConversation = ref(false)
const abortController = ref<AbortController>()
const messageViewport = ref<HTMLElement>()
const isComposing = ref(false)

const periodLabel = computed(() => getPeriodLabel(period.value))
const modelStatusText = computed(() => {
  if (!configStatus.value) return '正在检查模型配置'
  if (!configStatus.value.configured) return 'AI 模型未配置'
  return `${configStatus.value.platform || 'AI'} · ${configStatus.value.modelName || configStatus.value.model}`
})
const analysisDateRange = computed(() => {
  if (!session.value) return '--'
  return session.value.beginDate === session.value.endDate
    ? session.value.endDate
    : `${session.value.beginDate} 至 ${session.value.endDate}`
})
const reportContent = computed(
  () => messages.value.find((item) => item.type === 'assistant' && item.content)?.content || ''
)
const canSendQuestion = computed(() =>
  Boolean(activeConversationId.value && question.value.trim() && !streaming.value)
)

const getPeriodLabel = (value: StockAiAnalysisPeriod) => {
  if (value === 'DAILY') return '日报'
  if (value === 'MONTHLY') return '月报'
  if (value === 'CUSTOM') return '自定义区间'
  return '周报'
}

const disableFutureDate = (date: Date) => date.getTime() > Date.now()

const loadConfigStatus = async () => {
  try {
    configStatus.value = await StockAiAnalysisApi.getConfigStatus()
  } catch {
    configStatus.value = {
      configured: false,
      modelId: null,
      modelName: null,
      model: null,
      platform: null,
      message: '无法读取 AI 模型配置状态'
    }
  }
}

const loadHistory = async () => {
  loadingHistory.value = true
  try {
    history.value = await StockAiAnalysisApi.getHistory()
  } finally {
    loadingHistory.value = false
  }
}

const generateReport = async () => {
  if (!configStatus.value?.configured) {
    message.warning('请先配置并启用 AI 密钥和聊天模型')
    return
  }
  if (period.value === 'CUSTOM' && customDateRange.value.length !== 2) {
    message.warning('请选择完整的自定义日期区间')
    return
  }
  generating.value = true
  session.value = undefined
  messages.value = []
  activeConversationId.value = undefined
  activeTitle.value = ''
  try {
    const created = await StockAiAnalysisApi.createSession({
      period: period.value,
      beginDate: period.value === 'CUSTOM' ? customDateRange.value[0] : undefined,
      endDate: period.value === 'CUSTOM' ? customDateRange.value[1] : undefined
    })
    session.value = created
    activeConversationId.value = created.conversationId
    activeTitle.value = created.title.replace('[股票AI] ', '')
    await loadHistory()
    generating.value = false
    await sendStream(
      created.initialPrompt,
      `已提交${getPeriodLabel(created.period)}数据包 · ${created.positionCount} 个持仓 · ${created.tradeCount} 条成交 · ${created.marketBarCount} 条日线`
    )
  } catch {
    generating.value = false
  }
}

const sendStream = async (content: string, displayContent: string) => {
  if (!activeConversationId.value) return
  abortController.value = new AbortController()
  streaming.value = true
  let firstChunk = true
  let failed = false
  const pendingUserIndex = messages.value.length
  messages.value.push({
    id: -Date.now(),
    conversationId: activeConversationId.value,
    type: 'user',
    content: displayContent,
    createTime: new Date()
  } as ChatMessageVO)
  messages.value.push({
    id: -Date.now() - 1,
    conversationId: activeConversationId.value,
    type: 'assistant',
    content: '',
    reasoningContent: '',
    createTime: new Date()
  } as ChatMessageVO)
  await scrollToBottom()

  try {
    await ChatMessageApi.sendChatMessageStream(
      activeConversationId.value,
      content,
      abortController.value,
      true,
      false,
      async (event) => {
        const result = JSON.parse(event.data)
        if (result.code !== 0) {
          failed = true
          message.error(`AI 分析失败：${result.msg}`)
          stopStream()
          return
        }
        const receive = result.data?.receive
        if (!receive || (!receive.content && !receive.reasoningContent)) return

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
        if (!failed && !abortController.value?.signal.aborted) {
          message.error('AI 流式响应中断，请稍后重试')
        }
        streaming.value = false
        throw error
      },
      () => {
        streaming.value = false
        abortController.value = undefined
      }
    )
  } catch {
    streaming.value = false
  } finally {
    if (firstChunk && !abortController.value?.signal.aborted) {
      const assistant = messages.value[messages.value.length - 1]
      if (assistant?.type === 'assistant' && !assistant.content)
        assistant.content = '【警告】未收到模型响应。'
    }
  }
}

const stopStream = () => {
  abortController.value?.abort()
  abortController.value = undefined
  streaming.value = false
}

const sendQuestion = async () => {
  const content = question.value.trim()
  if (!content || !activeConversationId.value || streaming.value) return
  question.value = ''
  await sendStream(content, content)
}

const handleEnter = () => {
  if (!isComposing.value) sendQuestion()
}

const handleCompositionEnd = () => {
  window.setTimeout(() => (isComposing.value = false), 100)
}

const openHistory = async (item: StockAiAnalysisHistoryVO) => {
  if (item.conversationId === activeConversationId.value) return
  stopStream()
  loadingConversation.value = true
  session.value = undefined
  period.value = item.period
  activeConversationId.value = item.conversationId
  activeTitle.value = item.title.replace('[股票AI] ', '')
  try {
    const list = (await ChatMessageApi.getChatMessageListByConversationId(
      item.conversationId
    )) as ChatMessageVO[]
    let initialUserFound = false
    messages.value = list.map((chatMessage) => {
      if (chatMessage.type === 'user' && !initialUserFound) {
        initialUserFound = true
        return {
          ...chatMessage,
          content: `已提交${getPeriodLabel(item.period)}数据包`
        }
      }
      return chatMessage
    })
    await scrollToBottom()
  } finally {
    loadingConversation.value = false
  }
}

const deleteHistory = async (item: StockAiAnalysisHistoryVO) => {
  await message.delConfirm(`确认删除“${item.title.replace('[股票AI] ', '')}”及其全部对话吗？`)
  await ChatConversationApi.deleteChatConversationMy(item.conversationId)
  if (activeConversationId.value === item.conversationId) {
    activeConversationId.value = undefined
    activeTitle.value = ''
    session.value = undefined
    messages.value = []
  }
  await loadHistory()
  message.success('分析会话已删除')
}

const copyReport = async () => {
  await copy(reportContent.value)
  message.success('报告已复制')
}

const downloadReport = () => {
  const date = session.value?.endDate || new Date().toISOString().slice(0, 10)
  download.markdown(
    new Blob([reportContent.value], { type: 'text/markdown;charset=utf-8' }),
    `股票操作${periodLabel.value}-${date}.md`
  )
}

const goToConfig = (path: string) => router.push(path)

const scrollToBottom = async () => {
  await nextTick()
  if (messageViewport.value) messageViewport.value.scrollTop = messageViewport.value.scrollHeight
}

const formatMessageTime = (value: Date | string) =>
  value ? formatDate(value, 'YYYY-MM-DD HH:mm') : ''
const formatHistoryTime = (value: string) => (value ? formatDate(value, 'MM-DD HH:mm') : '')

onMounted(async () => {
  await Promise.all([loadConfigStatus(), loadHistory()])
})

onBeforeUnmount(stopStream)
</script>

<style scoped lang="scss">
.stock-ai-page {
  min-height: calc(100vh - 110px);
  padding: 16px;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color-page);
}

.command-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 68px;
  padding: 10px 16px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px 6px 0 0;
}

.page-identity,
.command-actions,
.model-line,
.conversation-heading,
.history-heading,
.assistant-meta,
.data-warning-line,
.configuration-warning {
  display: flex;
  align-items: center;
}

.page-identity {
  gap: 12px;
}

.page-icon {
  display: grid;
  width: 38px;
  height: 38px;
  font-size: 20px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 6px;
  place-items: center;
}

h1,
h2 {
  padding: 0;
  margin: 0;
  letter-spacing: 0;
}

h1 {
  font-size: 18px;
  line-height: 26px;
}

h2 {
  font-size: 15px;
  line-height: 24px;
}

.model-line {
  gap: 6px;
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-dot--ready {
  background: var(--el-color-success);
}

.status-dot--missing {
  background: var(--el-color-danger);
}

.command-actions {
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.command-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.custom-range-picker {
  width: 270px !important;
}

.configuration-warning {
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  font-size: 13px;
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-9);
  border-right: 1px solid var(--el-color-warning-light-7);
  border-left: 1px solid var(--el-color-warning-light-7);
}

.metric-strip {
  display: grid;
  grid-template-columns: minmax(220px, 1.7fr) repeat(5, minmax(100px, 1fr));
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-top: 0;
}

.metric-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 64px;
  padding: 8px 16px;
  border-left: 1px solid var(--el-border-color-lighter);
}

.metric-item:first-child {
  border-left: 0;
}

.metric-item strong {
  margin-top: 4px;
  font-size: 18px;
  line-height: 24px;
}

.metric-item--period strong {
  font-size: 15px;
}

.metric-item--warning strong {
  color: var(--el-color-warning-dark-2);
}

.metric-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.data-warning-line {
  gap: 6px;
  min-height: 34px;
  padding: 0 14px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-right: 1px solid var(--el-border-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  border-left: 1px solid var(--el-border-color-light);
}

.warning-tooltip {
  max-width: 520px;
  line-height: 22px;
}

.analysis-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  min-height: 650px;
  margin-top: 12px;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.conversation-panel {
  display: grid;
  grid-template-rows: 56px minmax(480px, 1fr) auto;
  min-width: 0;
  min-height: 650px;
}

.conversation-heading,
.history-heading {
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.conversation-id,
.history-heading span {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.report-actions {
  display: flex;
}

.report-actions :deep(.el-button + .el-button) {
  margin-left: 2px;
}

.message-viewport {
  height: calc(100vh - 390px);
  max-height: 820px;
  min-height: 480px;
  padding: 6px 24px 28px;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.empty-report {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  color: var(--el-text-color-placeholder);
}

.empty-report > :first-child {
  margin-bottom: 12px;
  font-size: 34px;
}

.empty-report strong {
  margin-bottom: 6px;
  font-size: 15px;
  color: var(--el-text-color-secondary);
}

.empty-report span {
  font-size: 12px;
}

.message-row {
  width: 100%;
  margin-top: 20px;
}

.message-row--user {
  display: flex;
  justify-content: flex-end;
}

.user-message {
  max-width: min(72%, 720px);
  padding: 9px 13px;
  font-size: 13px;
  line-height: 22px;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  background: var(--el-fill-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.assistant-message {
  width: 100%;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.assistant-meta {
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.assistant-mark {
  display: grid;
  width: 26px;
  height: 26px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 5px;
  place-items: center;
}

.message-time {
  margin-left: auto;
  font-weight: 400;
  color: var(--el-text-color-placeholder);
}

.report-markdown {
  padding: 0 2px;
}

.report-markdown :deep(table) {
  display: block;
  max-width: 100%;
  margin: 10px 0 16px;
  overflow-x: auto;
  border-collapse: collapse;
}

.report-markdown :deep(th),
.report-markdown :deep(td) {
  min-width: 86px;
  padding: 7px 9px;
  font-size: 13px;
  border: 1px solid var(--el-border-color-lighter);
}

.report-markdown :deep(th) {
  background: var(--el-fill-color-light);
}

.reasoning-note {
  margin-bottom: 10px;
}

.thinking-line {
  display: flex;
  gap: 5px;
  align-items: center;
  min-height: 42px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.thinking-line span {
  width: 5px;
  height: 5px;
  background: var(--el-color-primary);
  border-radius: 50%;
  animation: thinking 1.2s infinite ease-in-out;
}

.thinking-line span:nth-child(2) {
  animation-delay: 0.15s;
}

.thinking-line span:nth-child(3) {
  margin-right: 4px;
  animation-delay: 0.3s;
}

@keyframes thinking {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

.question-composer {
  position: relative;
  display: flex;
  gap: 10px;
  align-items: flex-end;
  padding: 14px 16px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
}

.question-composer :deep(.el-textarea__inner) {
  padding-right: 52px;
  line-height: 22px;
  border-radius: 6px;
}

.send-button {
  position: absolute;
  right: 27px;
  bottom: 27px;
  width: 32px;
  height: 32px;
}

.history-panel {
  min-width: 0;
  border-left: 1px solid var(--el-border-color-light);
}

.history-heading {
  height: 56px;
}

.history-list {
  height: calc(100vh - 310px);
  max-height: 890px;
  min-height: 590px;
  padding: 8px;
  overflow-y: auto;
}

.history-item {
  position: relative;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 5px 8px;
  width: 100%;
  min-height: 66px;
  padding: 10px 30px 10px 10px;
  margin: 0 0 4px;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
}

.history-item:hover {
  background: var(--el-fill-color-light);
}

.history-item--active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
}

.history-period {
  align-self: start;
  padding: 2px 5px;
  font-size: 11px;
  color: var(--el-color-primary);
  text-align: center;
  background: var(--el-color-primary-light-9);
  border-radius: 4px;
  white-space: nowrap;
}

.history-title {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  grid-column: 2;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.history-delete {
  position: absolute;
  top: 22px;
  right: 8px;
  display: none;
  color: var(--el-text-color-placeholder);
}

.history-item:hover .history-delete {
  display: block;
}

.history-delete:hover {
  color: var(--el-color-danger);
}

.history-empty {
  padding: 60px 10px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  text-align: center;
}

@media (width <= 1100px) {
  .command-bar {
    align-items: flex-start;
  }

  .command-actions {
    max-width: 520px;
  }

  .metric-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .metric-item:nth-child(4) {
    border-left: 0;
  }

  .metric-item:nth-child(n + 4) {
    border-top: 1px solid var(--el-border-color-lighter);
  }
}

@media (width <= 860px) {
  .stock-ai-page {
    padding: 8px;
  }

  .command-bar {
    flex-direction: column;
    gap: 12px;
  }

  .command-actions {
    justify-content: flex-start;
    width: 100%;
    max-width: none;
  }

  .analysis-workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .history-panel {
    border-top: 1px solid var(--el-border-color-light);
    border-left: 0;
  }

  .history-list {
    height: auto;
    max-height: 300px;
    min-height: 120px;
  }

  .message-viewport {
    height: 58vh;
    min-height: 420px;
    padding-right: 14px;
    padding-left: 14px;
  }
}

@media (width <= 560px) {
  .command-actions :deep(.el-segmented) {
    width: 100%;
  }

  .custom-range-picker {
    width: 100% !important;
  }

  .metric-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-item:nth-child(odd) {
    border-left: 0;
  }

  .metric-item:nth-child(n + 3) {
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .metric-item--period {
    grid-column: span 2;
  }

  .user-message {
    max-width: 90%;
  }
}
</style>
