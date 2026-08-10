<template>
  <div class="stock-ai-page">
    <StockWorkspaceNav />
    <header class="command-bar">
      <div class="page-identity">
        <div class="page-icon"><Icon icon="ep:magic-stick" /></div>
        <div>
          <h1>股票操作分析</h1>
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
        <el-segmented v-model="period" :options="periodOptions" :disabled="busy || streaming" />
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
          :disabled="busy || streaming"
          :disabled-date="disableFutureDate"
          :shortcuts="financeDateRangeShortcuts"
        />
        <el-button
          type="primary"
          plain
          :loading="calculating"
          :disabled="generating || streaming"
          v-hasPermi="['finance:stock-ai-analysis:query']"
          @click="runSystemAnalysis"
        >
          <Icon icon="ep:data-analysis" class="mr-5px" />
          计算系统分析
        </el-button>
        <el-dropdown trigger="click">
          <el-button circle title="AI 配置">
            <Icon icon="ep:setting" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="goToConfig('/ai/console/api-key')">
                <Icon icon="ep:key" class="mr-8px" />AI 密钥配置
              </el-dropdown-item>
              <el-dropdown-item @click="goToConfig('/ai/console/model')">
                <Icon icon="ep:cpu" class="mr-8px" />AI 模型配置
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <div v-if="configStatus && !configStatus.configured" class="configuration-warning">
      <Icon icon="ep:warning" />
      <span>AI 报告暂不可用：{{ configStatus.message }}；系统数据分析仍可正常使用</span>
      <el-button link type="primary" @click="goToConfig('/ai/console/api-key')">配置密钥</el-button>
      <el-button link type="primary" @click="goToConfig('/ai/console/model')">配置模型</el-button>
    </div>

    <div class="workspace-switch">
      <el-segmented v-model="workspaceView" :options="workspaceOptions" />
      <span class="source-label" :class="`source-label--${workspaceView}`">
        <Icon :icon="workspaceView === 'system' ? 'ep:cpu' : 'ep:magic-stick'" />
        {{ workspaceSourceText }}
      </span>
    </div>

    <section class="metric-strip">
      <div class="metric-item metric-item--period">
        <span class="metric-label">{{
          workspaceView === 'system' ? '系统分析区间' : 'AI 报告区间'
        }}</span>
        <strong>{{ analysisDateRange }}</strong>
      </div>
      <div class="metric-item">
        <span class="metric-label">当前持仓</span>
        <strong>{{ activeAnalysis?.positionCount ?? '--' }}</strong>
      </div>
      <div class="metric-item">
        <span class="metric-label">周期成交</span>
        <strong>{{ activeAnalysis?.tradeCount ?? '--' }}</strong>
      </div>
      <div class="metric-item">
        <span class="metric-label">涉及股票</span>
        <strong>{{ activeAnalysis?.stockCount ?? '--' }}</strong>
      </div>
      <div class="metric-item">
        <span class="metric-label">行情日线</span>
        <strong>{{ activeAnalysis?.marketBarCount ?? '--' }}</strong>
      </div>
      <div
        class="metric-item"
        :class="{ 'metric-item--warning': activeAnalysis?.missingMarketDataCount }"
      >
        <span class="metric-label">行情缺失</span>
        <strong>{{ activeAnalysis?.missingMarketDataCount ?? '--' }}</strong>
      </div>
    </section>

    <div v-if="activeAnalysis?.warnings?.length" class="data-warning-line">
      <Icon icon="ep:info-filled" />
      <el-tooltip placement="bottom" :show-after="200">
        <template #content>
          <div class="warning-tooltip">
            <div v-for="warning in activeAnalysis.warnings" :key="warning">{{ warning }}</div>
          </div>
        </template>
        <span>本次数据有 {{ activeAnalysis.warnings.length }} 项完整性说明</span>
      </el-tooltip>
    </div>

    <template v-if="workspaceView === 'system'">
      <div class="analysis-view-switch">
        <el-segmented v-model="dashboardView" :options="dashboardViewOptions" />
        <span>系统规则与公式计算结果，不由 AI 生成</span>
      </div>

      <StockAiDashboardPanel
        :key="dashboardView"
        :dashboard="systemAnalysis?.dashboard"
        :mode="dashboardView"
      />
    </template>

    <main v-else class="report-workspace">
      <section class="report-control" :class="`report-control--${reportStatusTone}`">
        <div class="report-control__status">
          <span class="report-status-icon" :class="{ 'report-status-icon--active': reportBusy }">
            <Icon :icon="reportStatusIcon" />
          </span>
          <div class="report-control__copy">
            <div class="report-status-title">
              <strong>{{ reportStatusTitle }}</strong>
              <el-tag size="small" effect="plain" :type="reportStatusTagType">
                {{ reportStatusLabel }}
              </el-tag>
            </div>
            <p>{{ reportStatusDescription }}</p>
            <div v-if="showReportTiming" class="report-runtime">
              <span><Icon icon="ep:timer" />已用时 {{ reportElapsedLabel }}</span>
              <span><Icon icon="ep:connection" />{{ reportResponseActivity }}</span>
            </div>
          </div>
        </div>

        <div class="report-control__actions">
          <el-button v-if="streaming" type="danger" plain @click="stopStream">
            <Icon icon="ep:video-pause" class="mr-5px" />
            停止生成
          </el-button>
          <el-button
            v-else
            type="primary"
            :loading="generating"
            :disabled="calculating || reportBusy || !configStatus?.configured"
            v-hasPermi="['finance:stock-ai-analysis:generate']"
            @click="generateAiReport"
          >
            <Icon icon="ep:document-add" class="mr-5px" />
            {{ reportPrimaryActionLabel }}
          </el-button>
        </div>
        <div v-if="reportBusy" class="report-progress" aria-hidden="true"><span></span></div>
      </section>

      <div class="analysis-workspace">
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
              <Icon icon="ep:document-add" />
              <strong>{{
                configStatus?.configured ? `生成 AI ${periodLabel}` : 'AI 报告尚未配置'
              }}</strong>
              <span>{{
                configStatus?.configured
                  ? '系统会汇总当前持仓、周期成交和行情数据，并持续显示生成进度'
                  : '完成密钥和模型配置后即可生成报告'
              }}</span>
              <el-button
                v-if="configStatus?.configured && !reportBusy"
                type="primary"
                v-hasPermi="['finance:stock-ai-analysis:generate']"
                @click="generateAiReport"
              >
                <Icon icon="ep:magic-stick" class="mr-5px" />
                开始生成 {{ periodLabel }}
              </el-button>
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
                      <el-collapse-item title="查看模型返回的分析依据">
                        <MarkdownView :content="item.reasoningContent" />
                      </el-collapse-item>
                    </el-collapse>
                  </div>
                  <MarkdownView
                    v-if="item.content"
                    class="report-markdown"
                    :content="item.content"
                  />
                  <div v-else-if="streaming" class="thinking-line">
                    <span></span><span></span><span></span>
                    {{ reportStatusDescription }}
                  </div>
                  <div v-else class="empty-assistant-state">
                    <Icon :icon="reportStatusIcon" />
                    {{ reportStatusDescription }}
                  </div>
                </div>
              </template>
            </article>
          </div>

          <div
            class="question-composer"
            :class="{ 'question-composer--disabled': !activeConversationId }"
          >
            <div
              v-if="!reportBusy && activeConversationId && reportContent"
              class="quick-question-row"
            >
              <button
                v-for="prompt in quickPrompts"
                :key="prompt"
                type="button"
                @click="askQuickQuestion(prompt)"
              >
                {{ prompt }}
              </button>
            </div>
            <el-input
              v-model="question"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 5 }"
              resize="none"
              maxlength="2000"
              show-word-limit
              :disabled="!activeConversationId || reportBusy || !reportContent"
              :placeholder="reportContent ? '针对报告继续提问' : '报告生成完成后可继续提问'"
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
      </div>
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
  type StockAiAnalysisSessionVO,
  type StockSystemAnalysisVO
} from '@/api/finance/stock/ai-analysis'
import MarkdownView from '@/components/MarkdownView/index.vue'
import StockAiDashboardPanel from './components/StockAiDashboardPanel.vue'
import StockWorkspaceNav from '../components/StockWorkspaceNav.vue'
import download from '@/utils/download'
import { formatDate } from '@/utils/formatTime'
import { financeDateRangeShortcuts } from '@/views/finance/utils/dateShortcuts'
import { useClipboard } from '@vueuse/core'

defineOptions({ name: 'FinanceStockAiAnalysis' })

const router = useRouter()
const message = useMessage()
const { copy } = useClipboard({ legacy: true })

const period = ref<StockAiAnalysisPeriod>('WEEKLY')
type WorkspaceView = 'system' | 'report'
type DashboardView = 'overview' | 'stocks' | 'behavior' | 'risk'
type ReportRunStatus =
  | 'idle'
  | 'preparing'
  | 'connecting'
  | 'waiting'
  | 'generating'
  | 'completed'
  | 'stopped'
  | 'interrupted'
  | 'failed'
type StreamPurpose = 'report' | 'question'
type ReportStatusTone = 'neutral' | 'active' | 'success' | 'warning' | 'danger'
type ReportStatusTagType = 'primary' | 'success' | 'info' | 'warning' | 'danger'

const runningReportStatuses: ReportRunStatus[] = [
  'preparing',
  'connecting',
  'waiting',
  'generating'
]
const streamingReportStatuses: ReportRunStatus[] = ['connecting', 'waiting', 'generating']
const workspaceView = ref<WorkspaceView>('system')
const dashboardView = ref<DashboardView>('overview')
const workspaceOptions = [
  { label: '系统数据分析', value: 'system' },
  { label: 'AI 完整报告', value: 'report' }
]
const dashboardViewOptions = [
  { label: '分析总览', value: 'overview' },
  { label: '个股复盘', value: 'stocks' },
  { label: '交易行为', value: 'behavior' },
  { label: '风险诊断', value: 'risk' }
]
const quickPrompts = [
  '为什么跑输基准？',
  '哪三笔交易最需要复盘？',
  '当前最大风险是什么？',
  '给出下一周期检查清单'
]
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
const systemAnalysis = ref<StockSystemAnalysisVO>()
const session = ref<StockAiAnalysisSessionVO>()
const history = ref<StockAiAnalysisHistoryVO[]>([])
const messages = ref<ChatMessageVO[]>([])
const activeConversationId = ref<number>()
const activeTitle = ref('')
const question = ref('')
const calculating = ref(false)
const loadingHistory = ref(false)
const loadingConversation = ref(false)
const abortController = ref<AbortController>()
const messageViewport = ref<HTMLElement>()
const isComposing = ref(false)
const reportStatus = ref<ReportRunStatus>('idle')
const reportStatusDetail = ref('')
const streamPurpose = ref<StreamPurpose>('report')
const reportStartedAt = ref<number>()
const reportFinishedAt = ref<number>()
const lastResponseAt = ref<number>()
const statusClock = ref(Date.now())
let statusTimer: number | undefined

const periodLabel = computed(() => getPeriodLabel(period.value))
const generating = computed(() => reportStatus.value === 'preparing')
const streaming = computed(() => streamingReportStatuses.includes(reportStatus.value))
const reportBusy = computed(() => runningReportStatuses.includes(reportStatus.value))
const busy = computed(() => calculating.value || reportBusy.value)
const activeAnalysis = computed(() =>
  workspaceView.value === 'system' ? systemAnalysis.value : session.value
)
const workspaceSourceText = computed(() =>
  workspaceView.value === 'system' ? '来源：系统规则与公式计算' : '来源：AI 模型生成'
)
const modelStatusText = computed(() => {
  if (!configStatus.value) return '正在检查 AI 报告模型配置'
  if (!configStatus.value.configured) return 'AI 报告模型未配置'
  return `AI 报告 · ${configStatus.value.platform || 'AI'} · ${configStatus.value.modelName || configStatus.value.model}`
})
const analysisDateRange = computed(() => {
  if (!activeAnalysis.value) return '--'
  return activeAnalysis.value.beginDate === activeAnalysis.value.endDate
    ? activeAnalysis.value.endDate
    : `${activeAnalysis.value.beginDate} 至 ${activeAnalysis.value.endDate}`
})
const reportContent = computed(
  () => messages.value.find((item) => item.type === 'assistant' && item.content)?.content || ''
)
const canSendQuestion = computed(() =>
  Boolean(
    activeConversationId.value && reportContent.value && question.value.trim() && !reportBusy.value
  )
)
const reportStatusTone = computed<ReportStatusTone>(() => {
  if (['preparing', 'connecting', 'waiting', 'generating'].includes(reportStatus.value)) {
    return 'active'
  }
  if (reportStatus.value === 'completed') return 'success'
  if (['stopped', 'interrupted'].includes(reportStatus.value)) return 'warning'
  if (reportStatus.value === 'failed') return 'danger'
  return 'neutral'
})
const reportStatusTagType = computed<ReportStatusTagType>(() => {
  if (reportStatusTone.value === 'active') return 'primary'
  if (reportStatusTone.value === 'success') return 'success'
  if (reportStatusTone.value === 'warning') return 'warning'
  if (reportStatusTone.value === 'danger') return 'danger'
  return 'info'
})
const reportStatusIcon = computed(() => {
  if (reportStatus.value === 'preparing') return 'ep:loading'
  if (reportStatus.value === 'connecting') return 'ep:connection'
  if (reportStatus.value === 'waiting') return 'ep:timer'
  if (reportStatus.value === 'generating') return 'ep:magic-stick'
  if (reportStatus.value === 'completed') return 'ep:circle-check-filled'
  if (reportStatus.value === 'stopped') return 'ep:video-pause'
  if (reportStatus.value === 'interrupted') return 'ep:warning-filled'
  if (reportStatus.value === 'failed') return 'ep:circle-close-filled'
  return 'ep:document-add'
})
const reportStatusTitle = computed(() => {
  if (reportStatus.value === 'preparing') return '正在准备分析数据'
  if (reportStatus.value === 'connecting') return '正在连接 AI 模型'
  if (reportStatus.value === 'waiting') return '模型已连接，等待首段响应'
  if (reportStatus.value === 'generating') {
    return streamPurpose.value === 'report' ? 'AI 报告正在生成' : 'AI 正在生成回答'
  }
  if (reportStatus.value === 'completed') {
    return streamPurpose.value === 'report' ? 'AI 报告生成完成' : 'AI 回答生成完成'
  }
  if (reportStatus.value === 'stopped') return '生成已停止'
  if (reportStatus.value === 'interrupted') return '模型连接已中断'
  if (reportStatus.value === 'failed') return 'AI 生成失败'
  return 'AI 报告待生成'
})
const reportStatusLabel = computed(() => {
  if (reportStatus.value === 'preparing') return '准备数据'
  if (reportStatus.value === 'connecting') return '连接中'
  if (reportStatus.value === 'waiting') return '等待响应'
  if (reportStatus.value === 'generating') return '生成中'
  if (reportStatus.value === 'completed') return '已完成'
  if (reportStatus.value === 'stopped') return '已停止'
  if (reportStatus.value === 'interrupted') return '已中断'
  if (reportStatus.value === 'failed') return '失败'
  return '未开始'
})
const reportStatusDescription = computed(() => {
  if (reportStatusDetail.value) return reportStatusDetail.value
  if (reportStatus.value === 'preparing') return '正在汇总持仓、成交和行情数据并创建分析会话'
  if (reportStatus.value === 'connecting') return '数据包已经准备完成，正在建立流式连接'
  if (reportStatus.value === 'waiting')
    return '连接保持正常，模型正在读取数据，首段内容返回后会自动显示'
  if (reportStatus.value === 'generating') {
    return streamPurpose.value === 'report'
      ? '已收到模型响应，报告内容正在逐段写入下方工作区'
      : '已收到模型响应，追问答案正在逐段写入下方工作区'
  }
  if (reportStatus.value === 'completed') {
    return streamPurpose.value === 'report'
      ? '报告已完整生成，可以复制、下载或继续追问'
      : '本次追问已经回答完成，可以继续提问'
  }
  if (reportStatus.value === 'stopped') return '已按你的操作停止，已经生成的内容会继续保留'
  if (reportStatus.value === 'interrupted')
    return '连接意外关闭，已经生成的内容会保留，可以重新生成'
  if (reportStatus.value === 'failed') return '请求未能完成，请检查模型配置或网络后重新生成'
  return configStatus.value?.configured
    ? `选择分析周期后生成 AI ${periodLabel.value}`
    : '完成 AI 密钥和模型配置后即可生成报告'
})
const reportPrimaryActionLabel = computed(() =>
  reportContent.value ? `重新生成 AI ${periodLabel.value}` : `生成 AI ${periodLabel.value}`
)
const showReportTiming = computed(() => Boolean(reportStartedAt.value))
const reportElapsedLabel = computed(() => {
  if (!reportStartedAt.value) return '--'
  const endTime = reportFinishedAt.value || statusClock.value
  return formatElapsed(Math.max(0, Math.floor((endTime - reportStartedAt.value) / 1000)))
})
const reportResponseActivity = computed(() => {
  if (!lastResponseAt.value) return '尚未收到模型首段响应'
  const seconds = Math.max(0, Math.floor((statusClock.value - lastResponseAt.value) / 1000))
  if (!reportBusy.value) return `最后响应 ${formatDate(lastResponseAt.value, 'HH:mm:ss')}`
  if (seconds < 2) return '刚刚收到模型响应'
  return `最近响应 ${seconds} 秒前`
})

const getPeriodLabel = (value: StockAiAnalysisPeriod) => {
  if (value === 'DAILY') return '日报'
  if (value === 'MONTHLY') return '月报'
  if (value === 'CUSTOM') return '自定义区间'
  return '周报'
}

const disableFutureDate = (date: Date) => date.getTime() > Date.now()

const formatElapsed = (seconds: number) => {
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes} 分 ${remainingSeconds.toString().padStart(2, '0')} 秒`
}

const resetReportRun = () => {
  reportStartedAt.value = Date.now()
  reportFinishedAt.value = undefined
  lastResponseAt.value = undefined
  statusClock.value = Date.now()
  reportStatusDetail.value = ''
}

const updateReportStatus = (status: ReportRunStatus, detail = '') => {
  reportStatus.value = status
  reportStatusDetail.value = detail
  statusClock.value = Date.now()
  if (runningReportStatuses.includes(status)) {
    reportStartedAt.value ??= Date.now()
    reportFinishedAt.value = undefined
  } else if (status !== 'idle' && reportStartedAt.value) {
    reportFinishedAt.value = Date.now()
  }
}

const abortCurrentStream = (markStopped: boolean) => {
  const controller = abortController.value
  if (!controller || controller.signal.aborted) return
  if (markStopped) {
    updateReportStatus(
      'stopped',
      streamPurpose.value === 'report'
        ? '已停止生成报告，已经返回的报告内容会继续保留'
        : '已停止生成回答，已经返回的回答内容会继续保留'
    )
  }
  controller.abort()
  if (abortController.value === controller) abortController.value = undefined
}

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

const validateDateRange = () => {
  if (period.value !== 'CUSTOM' || customDateRange.value.length === 2) return true
  message.warning('请选择完整的自定义日期区间')
  return false
}

const buildAnalysisRequest = () => ({
  period: period.value,
  beginDate: period.value === 'CUSTOM' ? customDateRange.value[0] : undefined,
  endDate: period.value === 'CUSTOM' ? customDateRange.value[1] : undefined
})

const runSystemAnalysis = async () => {
  if (!validateDateRange()) return
  calculating.value = true
  try {
    systemAnalysis.value = await StockAiAnalysisApi.analyzeDashboard(buildAnalysisRequest())
    workspaceView.value = 'system'
    dashboardView.value = 'overview'
    message.success('系统数据分析已更新')
  } finally {
    calculating.value = false
  }
}

const generateAiReport = async () => {
  if (!configStatus.value?.configured) {
    message.warning('请先配置并启用 AI 密钥和聊天模型')
    return
  }
  if (!validateDateRange()) return
  workspaceView.value = 'report'
  streamPurpose.value = 'report'
  resetReportRun()
  updateReportStatus('preparing')
  try {
    const created = await StockAiAnalysisApi.createSession(buildAnalysisRequest())
    session.value = created
    messages.value = []
    activeConversationId.value = created.conversationId
    activeTitle.value = created.title.replace('[股票AI] ', '')
    loadHistory().catch(() => undefined)
    await sendStream(
      created.initialPrompt,
      `已提交${getPeriodLabel(created.period)}数据包 · ${created.positionCount} 个持仓 · ${created.tradeCount} 条成交 · ${created.marketBarCount} 条日线`,
      'report'
    )
  } catch {
    if (reportStatus.value === 'preparing') {
      updateReportStatus('failed', '分析会话创建失败，请检查服务状态后重新生成')
    }
  }
}

const sendStream = async (
  content: string,
  displayContent: string,
  purpose: StreamPurpose = 'question'
) => {
  if (!activeConversationId.value) return
  const controller = new AbortController()
  abortController.value = controller
  streamPurpose.value = purpose
  if (purpose === 'question') resetReportRun()
  updateReportStatus('connecting')
  let firstChunk = true
  let failed = false
  let closedNormally = false
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
      controller,
      true,
      false,
      async (event) => {
        const result = JSON.parse(event.data)
        if (result.code !== 0) {
          failed = true
          updateReportStatus('failed', `模型返回错误：${result.msg}`)
          message.error(`AI 分析失败：${result.msg}`)
          controller.abort()
          return
        }
        const receive = result.data?.receive
        if (!receive || (!receive.content && !receive.reasoningContent)) return

        lastResponseAt.value = Date.now()
        updateReportStatus('generating')
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
          updateReportStatus('interrupted', '流式连接意外中断，已生成内容会保留，可以重新生成')
          message.error('AI 流式响应中断，请稍后重试')
        }
        throw error
      },
      () => {
        closedNormally = true
        if (controller.signal.aborted || failed) return
        if (firstChunk) {
          updateReportStatus('interrupted', '模型连接已经关闭，但没有返回任何报告内容')
          return
        }
        updateReportStatus('completed')
      },
      undefined,
      async () => {
        if (!controller.signal.aborted && abortController.value === controller) {
          updateReportStatus('waiting')
        }
      }
    )
  } catch {
    if (!controller.signal.aborted && !['interrupted', 'failed'].includes(reportStatus.value)) {
      updateReportStatus('failed', '流式响应处理失败，请重新生成')
    }
  } finally {
    if (abortController.value === controller) abortController.value = undefined
    if (firstChunk) {
      const assistant = messages.value[messages.value.length - 1]
      if (assistant?.type === 'assistant' && !assistant.content && !assistant.reasoningContent) {
        messages.value.splice(pendingUserIndex + 1, 1)
      }
    }
    if (
      !controller.signal.aborted &&
      !closedNormally &&
      !['interrupted', 'failed'].includes(reportStatus.value)
    ) {
      updateReportStatus('interrupted', '流式连接提前结束，已生成内容会保留，可以重新生成')
    }
  }
}

const stopStream = () => {
  abortCurrentStream(true)
}

const sendQuestion = async () => {
  const content = question.value.trim()
  if (!content || !activeConversationId.value || reportBusy.value || !reportContent.value) return
  question.value = ''
  await sendStream(content, content, 'question')
}

const askQuickQuestion = async (content: string) => {
  question.value = content
  await sendQuestion()
}

const handleEnter = () => {
  if (!isComposing.value) sendQuestion()
}

const handleCompositionEnd = () => {
  window.setTimeout(() => (isComposing.value = false), 100)
}

const openHistory = async (item: StockAiAnalysisHistoryVO) => {
  if (item.conversationId === activeConversationId.value) return
  abortCurrentStream(false)
  reportStartedAt.value = undefined
  reportFinishedAt.value = undefined
  lastResponseAt.value = undefined
  updateReportStatus('idle')
  loadingConversation.value = true
  session.value = undefined
  messages.value = []
  period.value = item.period
  activeConversationId.value = item.conversationId
  activeTitle.value = item.title.replace('[股票AI] ', '')
  try {
    const [snapshot, list] = await Promise.all([
      StockAiAnalysisApi.getSession(item.conversationId),
      ChatMessageApi.getChatMessageListByConversationId(item.conversationId)
    ])
    session.value = snapshot
    const chatMessages = list as ChatMessageVO[]
    let initialUserFound = false
    messages.value = chatMessages.map((chatMessage) => {
      if (chatMessage.type === 'user' && !initialUserFound) {
        initialUserFound = true
        return {
          ...chatMessage,
          content: `已提交${getPeriodLabel(item.period)}数据包`
        }
      }
      return chatMessage
    })
    workspaceView.value = 'report'
    const hasAssistantContent = messages.value.some(
      (chatMessage) => chatMessage.type === 'assistant' && chatMessage.content
    )
    updateReportStatus(
      hasAssistantContent ? 'completed' : 'interrupted',
      hasAssistantContent
        ? '历史 AI 报告已加载，可以继续追问、复制或下载'
        : '该历史会话没有可展示的 AI 报告内容，可以重新生成'
    )
    await scrollToBottom()
  } catch {
    updateReportStatus('failed', '历史报告加载失败，请刷新列表后重试')
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
    reportStartedAt.value = undefined
    reportFinishedAt.value = undefined
    lastResponseAt.value = undefined
    updateReportStatus('idle')
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
  statusTimer = window.setInterval(() => {
    statusClock.value = Date.now()
  }, 1000)
  await Promise.all([loadConfigStatus(), loadHistory()])
})

onBeforeUnmount(() => {
  abortCurrentStream(false)
  if (statusTimer) window.clearInterval(statusTimer)
})
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
.configuration-warning,
.workspace-switch,
.source-label {
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

.workspace-switch {
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding: 8px 14px;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  border-left: 1px solid var(--el-border-color-light);
}

.source-label {
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.source-label--report {
  color: var(--el-color-primary);
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

.analysis-view-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding: 8px 14px;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  border-left: 1px solid var(--el-border-color-light);
}

.analysis-view-switch > span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.warning-tooltip {
  max-width: 520px;
  line-height: 22px;
}

.report-workspace {
  margin-top: 12px;
}

.report-control {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 96px;
  padding: 14px 16px;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.report-control--active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
}

.report-control--success {
  border-color: var(--el-color-success-light-7);
}

.report-control--warning {
  background: var(--el-color-warning-light-9);
  border-color: var(--el-color-warning-light-7);
}

.report-control--danger {
  background: var(--el-color-danger-light-9);
  border-color: var(--el-color-danger-light-7);
}

.report-control__status,
.report-status-title,
.report-runtime,
.report-control__actions {
  display: flex;
  align-items: center;
}

.report-control__status {
  gap: 12px;
  min-width: 0;
}

.report-status-icon {
  display: grid;
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  font-size: 22px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 6px;
  place-items: center;
}

.report-status-icon--active {
  animation: report-status-pulse 1.6s ease-in-out infinite;
}

.report-control--success .report-status-icon {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  border-color: var(--el-color-success-light-7);
}

.report-control--warning .report-status-icon {
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-9);
  border-color: var(--el-color-warning-light-7);
}

.report-control--danger .report-status-icon {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border-color: var(--el-color-danger-light-7);
}

.report-control__copy {
  min-width: 0;
}

.report-status-title {
  flex-wrap: wrap;
  gap: 8px;
}

.report-status-title strong {
  font-size: 15px;
  line-height: 24px;
}

.report-control__copy p {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
}

.report-runtime {
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.report-runtime span {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.report-control__actions {
  flex: 0 0 auto;
  justify-content: flex-end;
}

.report-progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  overflow: hidden;
  background: var(--el-color-primary-light-8);
}

.report-progress span {
  display: block;
  width: 32%;
  height: 100%;
  background: var(--el-color-primary);
  animation: report-progress 1.5s ease-in-out infinite;
}

@keyframes report-status-pulse {
  0%,
  100% {
    opacity: 0.72;
  }

  50% {
    opacity: 1;
  }
}

@keyframes report-progress {
  from {
    transform: translateX(-110%);
  }

  to {
    transform: translateX(330%);
  }
}

.analysis-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  min-height: 650px;
  margin-top: 8px;
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
  line-height: 20px;
  text-align: center;
}

.empty-report :deep(.el-button) {
  margin-top: 18px;
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

.empty-assistant-state {
  display: flex;
  gap: 7px;
  align-items: center;
  min-height: 42px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
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
  flex-direction: column;
  align-items: stretch;
  padding: 14px 16px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
}

.quick-question-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-question-row button {
  min-height: 26px;
  padding: 3px 9px;
  font: inherit;
  font-size: 12px;
  color: var(--el-color-primary);
  cursor: pointer;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 4px;
}

.quick-question-row button:hover {
  background: var(--el-color-primary-light-8);
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
  padding: 2px 5px;
  font-size: 11px;
  color: var(--el-color-primary);
  text-align: center;
  white-space: nowrap;
  background: var(--el-color-primary-light-9);
  border-radius: 4px;
  align-self: start;
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

  .report-control {
    align-items: flex-start;
    flex-direction: column;
  }

  .report-control__actions {
    width: 100%;
  }

  .analysis-view-switch {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace-switch {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace-switch :deep(.el-segmented),
  .analysis-view-switch :deep(.el-segmented) {
    width: 100%;
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

  .workspace-switch :deep(.el-segmented__item-label),
  .analysis-view-switch :deep(.el-segmented__item-label) {
    font-size: 11px;
  }

  .custom-range-picker {
    width: 100% !important;
  }

  .report-control__status {
    align-items: flex-start;
  }

  .report-control__actions :deep(.el-button) {
    width: 100%;
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
