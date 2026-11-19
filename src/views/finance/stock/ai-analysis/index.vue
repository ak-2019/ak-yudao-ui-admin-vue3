<template>
  <div class="stock-ai-page">
    <StockWorkspaceNav />
    <header class="command-bar">
      <div class="page-identity">
        <div class="page-icon"><Icon icon="ep:magic-stick" /></div>
        <div>
          <h1>股票操作 AI 复盘</h1>
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
        <el-button
          type="primary"
          plain
          v-hasPermi="['finance:stock-trade-plan:query']"
          @click="tradePlanDialogRef?.open()"
        >
          <Icon icon="ep:memo" class="mr-5px" />交易计划
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

    <section class="analysis-controls">
      <div class="scope-control">
        <span class="control-label">分析对象</span>
        <el-segmented
          v-model="analysisScope"
          :options="analysisScopeOptions"
          :disabled="busy || loadingConversation"
        />
        <span class="scope-description">{{ analysisScopeDescription }}</span>
      </div>

      <div class="date-control">
        <span class="control-label">分析区间</span>
        <div class="date-preset-list">
          <el-button
            v-for="item in datePresetOptions"
            :key="item.value"
            size="small"
            :type="datePreset === item.value ? 'primary' : 'default'"
            :plain="datePreset !== item.value"
            :disabled="busy || loadingConversation"
            @click="applyDatePreset(item.value)"
          >
            {{ item.label }}
          </el-button>
        </div>
        <el-date-picker
          v-if="datePreset === 'CUSTOM'"
          v-model="customDateRange"
          class="custom-range-picker"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          unlink-panels
          :clearable="false"
          :disabled="busy || loadingConversation"
          :disabled-date="disableFutureDate"
          :shortcuts="financeDateRangeShortcuts"
        />
        <span v-else class="selected-range">{{ selectedDateRangeLabel }}</span>
        <el-button
          class="system-analysis-button"
          type="primary"
          :loading="calculating"
          :disabled="generating || streaming || loadingConversation"
          v-hasPermi="['finance:stock-ai-analysis:query']"
          @click="runSystemAnalysis"
        >
          <Icon icon="ep:data-analysis" class="mr-5px" />
          计算系统分析
        </el-button>
      </div>
    </section>

    <div v-if="configStatus && !configStatus.configured" class="configuration-warning">
      <Icon icon="ep:warning" />
      <span>AI 报告暂不可用：{{ configStatus.message }}；系统数据分析仍可正常使用</span>
      <el-button link type="primary" @click="goToConfig('/ai/console/api-key')">配置密钥</el-button>
      <el-button link type="primary" @click="goToConfig('/ai/console/model')">配置模型</el-button>
    </div>

    <section class="research-workspace">
      <aside class="analysis-nav-panel" aria-label="AI 复盘分析导航">
        <div class="analysis-nav-heading">
          <span>分析导航</span>
          <small>选择一个任务进入主画布</small>
        </div>
        <div class="analysis-nav-groups">
          <div v-for="group in analysisNavigationGroups" :key="group.label" class="nav-group">
            <span class="nav-group-label">{{ group.label }}</span>
            <button
              v-for="item in group.items"
              :key="item.value"
              type="button"
              class="analysis-nav-item"
              :class="{ 'analysis-nav-item--active': activeView === item.value }"
              :aria-current="activeView === item.value ? 'page' : undefined"
              @click="setActiveView(item.value)"
            >
              <Icon :icon="item.icon" />
              <span>
                <strong>{{ item.label }}</strong>
                <small>{{ item.shortDescription }}</small>
              </span>
              <Icon icon="ep:arrow-right" class="nav-arrow" />
            </button>
          </div>
        </div>
      </aside>

      <main class="analysis-canvas">
        <header class="canvas-heading">
          <div class="canvas-identity">
            <span class="canvas-icon"><Icon :icon="activeViewMeta.icon" /></span>
            <div>
              <div class="canvas-title-line">
                <h2>{{ activeViewMeta.label }}</h2>
                <span class="source-label" :class="`source-label--${activeViewMeta.source}`">
                  <Icon :icon="activeViewMeta.sourceIcon" />
                  {{ activeViewMeta.sourceLabel }}
                </span>
              </div>
              <p>{{ activeViewMeta.description }}</p>
            </div>
          </div>
          <el-button
            v-if="activeView === 'history'"
            text
            circle
            title="刷新历史分析"
            :loading="loadingHistory"
            @click="loadHistory"
          >
            <Icon icon="ep:refresh" />
          </el-button>
        </header>

        <section class="metric-strip">
          <div class="metric-item metric-item--period">
            <span class="metric-label">当前分析区间</span>
            <strong>{{ analysisDateRange }}</strong>
          </div>
          <div
            v-for="item in analysisMetrics"
            :key="item.label"
            class="metric-item"
            :class="{ 'metric-item--warning': item.warning }"
          >
            <span class="metric-label">{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
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

        <StockAiDashboardPanel
          v-if="activeDashboardView"
          :key="activeView"
          :dashboard="systemAnalysis?.dashboard"
          :mode="activeDashboardView"
        />
        <StockAiCapabilityTrend
          v-else-if="activeView === 'capability'"
          @open-history="openHistoryByConversationId"
        />
        <StockAiRulePanel
          v-else-if="activeView === 'rules'"
          :current-conversation-id="activeConversationId"
          :report-content="reportContent"
          :begin-date="activeAnalysis?.beginDate || resolvePresetRange(datePreset)[0]"
          :end-date="activeAnalysis?.endDate || resolvePresetRange(datePreset)[1]"
          :period="period"
        />

        <template v-else-if="activeView === 'report'">
          <div
            ref="reportPanelRef"
            class="report-reader"
            :class="{ 'report-reader--fullscreen': reportFullscreen }"
          >
            <section class="report-control" :class="`report-control--${reportStatusTone}`">
              <div class="report-control__status">
                <span
                  class="report-status-icon"
                  :class="{ 'report-status-icon--active': reportBusy }"
                >
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

            <section class="conversation-panel">
              <div class="conversation-heading">
                <div>
                  <h2>{{ activeTitle || `${analysisScopeLabel} · ${periodLabel}` }}</h2>
                  <span v-if="activeConversationId" class="conversation-id">
                    会话 #{{ activeConversationId }}
                  </span>
                </div>
                <div class="report-actions">
                  <el-button v-if="reportContent" text title="复制报告" @click="copyReport">
                    <Icon icon="ep:copy-document" />
                  </el-button>
                  <el-button
                    v-if="reportContent"
                    text
                    title="下载 Markdown"
                    @click="downloadReport"
                  >
                    <Icon icon="ep:download" />
                  </el-button>
                  <el-button
                    text
                    :title="reportFullscreen ? '退出全屏（Esc）' : '全屏查看报告'"
                    :aria-label="reportFullscreen ? '退出全屏' : '全屏查看报告'"
                    @click="toggleReportFullscreen"
                  >
                    <Icon :icon="reportFullscreen ? 'zmdi:fullscreen-exit' : 'zmdi:fullscreen'" />
                  </el-button>
                </div>
              </div>

              <div ref="messageViewport" class="message-viewport" v-loading="loadingConversation">
                <div v-if="messages.length === 0 && !loadingConversation" class="empty-report">
                  <Icon icon="ep:document-add" />
                  <strong>{{
                    configStatus?.configured
                      ? `生成 AI ${analysisScopeLabel}${periodLabel}`
                      : 'AI 报告尚未配置'
                  }}</strong>
                  <span>{{
                    configStatus?.configured
                      ? analysisScopeEmptyDescription
                      : '完成密钥和模型配置后即可生成报告'
                  }}</span>
                  <el-button
                    v-if="configStatus?.configured && !reportBusy"
                    type="primary"
                    v-hasPermi="['finance:stock-ai-analysis:generate']"
                    @click="generateAiReport"
                  >
                    <Icon icon="ep:magic-stick" class="mr-5px" />
                    开始生成 {{ analysisScopeLabel }}{{ periodLabel }}
                  </el-button>
                </div>

                <article
                  v-for="item in messages"
                  :key="`${item.id}-${item.type}-${item.createTime}`"
                  class="message-row"
                  :class="`message-row--${item.type}`"
                >
                  <template v-if="item.type === 'user'">
                    <div class="user-message"
                      ><span>{{ item.content }}</span></div
                    >
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
          </div>
        </template>

        <StockAiInputContextPanel
          v-else-if="activeView === 'context'"
          class="standalone-context-panel"
          :content="aiInputContext"
          :analysis="session"
          :loading="generating || loadingConversation"
          @copy="copyAiInput"
          @download="downloadAiInput"
        />

        <section v-else class="history-panel history-panel--standalone">
          <div class="history-heading">
            <div>
              <h2>{{ analysisScopeLabel }}历史分析</h2>
              <span>{{ scopeHistory.length }} 个会话，点击后在 AI 深度报告中继续查看</span>
            </div>
          </div>
          <div class="history-list" v-loading="loadingHistory">
            <button
              v-for="item in scopeHistory"
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
            <div v-if="scopeHistory.length === 0 && !loadingHistory" class="history-empty">
              暂无{{ analysisScopeLabel }}分析
            </div>
          </div>
        </section>
      </main>

      <aside class="context-rail">
        <section class="rail-section">
          <div class="rail-heading">
            <span>本次分析</span>
            <el-tag size="small" effect="plain">{{ analysisScopeLabel }}</el-tag>
          </div>
          <dl class="analysis-summary-list">
            <div
              ><dt>日期范围</dt><dd>{{ selectedDateRangeLabel }}</dd></div
            >
            <div
              ><dt>当前任务</dt><dd>{{ activeViewMeta.label }}</dd></div
            >
            <div
              ><dt>数据来源</dt><dd>{{ activeViewMeta.sourceLabel }}</dd></div
            >
            <div
              ><dt>完整性提示</dt><dd>{{ activeAnalysis?.warnings?.length || 0 }} 项</dd></div
            >
          </dl>
        </section>

        <section class="rail-section rail-section--coverage">
          <div class="rail-heading"><span>数据覆盖</span></div>
          <div class="coverage-grid">
            <div v-for="item in analysisMetrics.slice(0, 4)" :key="item.label">
              <span>{{ item.label }}</span>
              <strong :class="{ 'warning-number': item.warning }">{{ item.value }}</strong>
            </div>
          </div>
        </section>

        <section class="rail-section">
          <div class="rail-heading"><span>下一步</span></div>
          <p class="next-step-copy">{{ activeViewMeta.guidance }}</p>
          <el-button
            v-if="activeViewMeta.source === 'system'"
            class="rail-primary-action"
            type="primary"
            plain
            :disabled="!configStatus?.configured"
            @click="setActiveView('report')"
          >
            <Icon icon="ep:magic-stick" class="mr-5px" />进入 AI 深度报告
          </el-button>
          <el-button
            v-else-if="activeView === 'report'"
            class="rail-primary-action"
            plain
            @click="setActiveView('context')"
          >
            <Icon icon="ep:collection" class="mr-5px" />核对输入证据
          </el-button>
          <el-button v-else class="rail-primary-action" plain @click="setActiveView('overview')">
            <Icon icon="ep:data-analysis" class="mr-5px" />返回决策总览
          </el-button>
        </section>

        <section class="rail-section rail-section--history">
          <div class="rail-heading">
            <span>最近分析</span>
            <button type="button" @click="setActiveView('history')">查看全部</button>
          </div>
          <div class="rail-history-list">
            <button
              v-for="item in scopeHistory.slice(0, 4)"
              :key="item.conversationId"
              type="button"
              @click="openHistory(item)"
            >
              <span>{{ item.title.replace('[股票AI] ', '') }}</span>
              <small>{{ formatHistoryTime(item.createTime) }}</small>
            </button>
            <span v-if="scopeHistory.length === 0" class="rail-empty">暂无历史分析</span>
          </div>
        </section>
      </aside>
    </section>

    <StockTradePlanDialog ref="tradePlanDialogRef" @saved="handleTradePlanSaved" />
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
  type StockAiAnalysisScope,
  type StockAiAnalysisSessionVO,
  type StockSystemAnalysisVO
} from '@/api/finance/stock/ai-analysis'
import MarkdownView from '@/components/MarkdownView/index.vue'
import StockAiCapabilityTrend from './components/StockAiCapabilityTrend.vue'
import StockAiDashboardPanel from './components/StockAiDashboardPanel.vue'
import StockAiInputContextPanel from './components/StockAiInputContextPanel.vue'
import StockAiRulePanel from './components/StockAiRulePanel.vue'
import StockTradePlanDialog from '../components/StockTradePlanDialog.vue'
import StockWorkspaceNav from '../components/StockWorkspaceNav.vue'
import download from '@/utils/download'
import { formatDate } from '@/utils/formatTime'
import { financeDateRangeShortcuts } from '@/views/finance/utils/dateShortcuts'
import { useClipboard } from '@vueuse/core'

defineOptions({ name: 'FinanceStockAiAnalysis' })

const router = useRouter()
const message = useMessage()
const { copy } = useClipboard({ legacy: true })

type DashboardView = 'overview' | 'episodes' | 'stocks' | 'attribution' | 'discipline'
type AnalysisView = DashboardView | 'capability' | 'rules' | 'report' | 'context' | 'history'
type AnalysisSource = 'system' | 'ai' | 'evidence' | 'history'
type DatePreset = 'TODAY' | 'WEEK' | 'MONTH' | 'LAST_5' | 'LAST_20' | 'YEAR' | 'CUSTOM'
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

interface ScopeWorkspaceState {
  period: StockAiAnalysisPeriod
  datePreset: DatePreset
  customDateRange: [string, string]
  activeView: AnalysisView
  systemAnalysis?: StockSystemAnalysisVO
  session?: StockAiAnalysisSessionVO
  aiInputContext: string
  messages: ChatMessageVO[]
  activeConversationId?: number
  activeTitle: string
  question: string
  reportStatus: ReportRunStatus
  reportStatusDetail: string
  streamPurpose: StreamPurpose
  reportStartedAt?: number
  reportFinishedAt?: number
  lastResponseAt?: number
}

const runningReportStatuses: ReportRunStatus[] = [
  'preparing',
  'connecting',
  'waiting',
  'generating'
]
const streamingReportStatuses: ReportRunStatus[] = ['connecting', 'waiting', 'generating']
const dashboardViews: AnalysisView[] = [
  'overview',
  'episodes',
  'stocks',
  'attribution',
  'discipline'
]
const analysisNavigationGroups: Array<{
  label: string
  items: Array<{
    label: string
    value: AnalysisView
    icon: string
    shortDescription: string
  }>
}> = [
  {
    label: '本期复盘',
    items: [
      {
        label: '决策总览',
        value: 'overview',
        icon: 'ep:data-analysis',
        shortDescription: '先看结果与关键决策'
      },
      {
        label: '交易回合',
        value: 'episodes',
        icon: 'ep:connection',
        shortDescription: '按建仓到退出复盘'
      },
      {
        label: '逐股表现',
        value: 'stocks',
        icon: 'ep:trend-charts',
        shortDescription: '比较个股贡献与表现'
      },
      {
        label: '收益归因',
        value: 'attribution',
        icon: 'ep:pie-chart',
        shortDescription: '拆解市场、行业与选股'
      },
      {
        label: '纪律审计',
        value: 'discipline',
        icon: 'ep:checked',
        shortDescription: '检查计划、风险与数据'
      }
    ]
  },
  {
    label: '能力建设',
    items: [
      {
        label: '长期能力',
        value: 'capability',
        icon: 'ep:histogram',
        shortDescription: '观察多周期能力趋势'
      },
      { label: '个人规则', value: 'rules', icon: 'ep:list', shortDescription: '沉淀并验证复盘规则' }
    ]
  },
  {
    label: 'AI 与证据',
    items: [
      {
        label: 'AI 深度报告',
        value: 'report',
        icon: 'ep:magic-stick',
        shortDescription: '生成报告并继续追问'
      },
      {
        label: '输入证据',
        value: 'context',
        icon: 'ep:collection',
        shortDescription: '核对发送给模型的数据'
      },
      {
        label: '历史分析',
        value: 'history',
        icon: 'ep:clock',
        shortDescription: '恢复过去报告与对话'
      }
    ]
  }
]
const analysisViewMeta: Record<
  AnalysisView,
  {
    label: string
    icon: string
    source: AnalysisSource
    sourceIcon: string
    sourceLabel: string
    description: string
    guidance: string
  }
> = {
  overview: {
    label: '决策总览',
    icon: 'ep:data-analysis',
    source: 'system',
    sourceIcon: 'ep:cpu',
    sourceLabel: '系统确定性结果',
    description: '用规则与公式先确认本期收益、风险、关键决策和数据覆盖。',
    guidance: '先定位影响最大的正负决策，再进入交易回合核对过程证据。'
  },
  episodes: {
    label: '交易回合',
    icon: 'ep:connection',
    source: 'system',
    sourceIcon: 'ep:cpu',
    sourceLabel: '系统确定性结果',
    description: '按一轮建仓、持有和退出重组流水，检查每个回合的真实结果。',
    guidance: '优先查看亏损、数据不完整或明显跑输基准的交易回合。'
  },
  stocks: {
    label: '逐股表现',
    icon: 'ep:trend-charts',
    source: 'system',
    sourceIcon: 'ep:cpu',
    sourceLabel: '系统确定性结果',
    description: '横向比较各股票的收益贡献、持有表现和相对基准结果。',
    guidance: '识别主要盈利来源和拖累项，再结合收益归因判断是否属于选股能力。'
  },
  attribution: {
    label: '收益归因',
    icon: 'ep:pie-chart',
    source: 'system',
    sourceIcon: 'ep:cpu',
    sourceLabel: '系统确定性结果',
    description: '拆分市场、行业、个股、择时、仓位与费用对结果的影响。',
    guidance: '先判断收益来自市场环境还是独立决策，再决定哪些经验值得复用。'
  },
  discipline: {
    label: '纪律审计',
    icon: 'ep:checked',
    source: 'system',
    sourceIcon: 'ep:cpu',
    sourceLabel: '系统确定性结果',
    description: '核对交易计划、纪律执行、风险项和数据完整性。',
    guidance: '把明确违反计划的行为转为下一周期可检查的个人规则。'
  },
  capability: {
    label: '长期能力',
    icon: 'ep:histogram',
    source: 'system',
    sourceIcon: 'ep:cpu',
    sourceLabel: '系统历史统计',
    description: '跨周期观察选股、买入、卖出、仓位和纪律能力是否改善。',
    guidance: '不要只看单次分数，结合样本数、数据完整度和历史证据判断趋势。'
  },
  rules: {
    label: '个人规则',
    icon: 'ep:list',
    source: 'system',
    sourceIcon: 'ep:user',
    sourceLabel: '用户确认规则',
    description: '将复盘结论沉淀为下一周期可执行、可验证的个人交易规则。',
    guidance: '从少量高频错误开始，每条规则都要有明确指标、阈值和适用范围。'
  },
  report: {
    label: 'AI 深度报告',
    icon: 'ep:magic-stick',
    source: 'ai',
    sourceIcon: 'ep:magic-stick',
    sourceLabel: 'AI 模型推断',
    description: '基于系统事实数据生成结构化复盘，并支持围绕报告继续追问。',
    guidance: '先确认报告状态和输入数据，再把 AI 观点与系统确定性结果交叉核对。'
  },
  context: {
    label: '输入证据',
    icon: 'ep:collection',
    source: 'evidence',
    sourceIcon: 'ep:document',
    sourceLabel: '当次模型输入',
    description: '完整查看发送给 AI 的持仓、交易、行情与规则上下文。',
    guidance: '若报告结论异常，先检查日期、样本覆盖、行情缺失和具体输入事实。'
  },
  history: {
    label: '历史分析',
    icon: 'ep:clock',
    source: 'history',
    sourceIcon: 'ep:clock',
    sourceLabel: '历史会话快照',
    description: '按当前分析对象恢复过去生成的报告、输入数据和追问记录。',
    guidance: '选择历史会话后会进入 AI 深度报告，可继续追问、复制或下载。'
  }
}
const analysisScopeOptions = [
  { label: '综合复盘', value: 'COMPREHENSIVE' },
  { label: '当前持仓', value: 'POSITION' },
  { label: '已清仓', value: 'CLOSED_POSITION' },
  { label: '交易流水', value: 'TRADE_RECORD' }
]
const datePresetOptions: Array<{ label: string; value: DatePreset }> = [
  { label: '今日', value: 'TODAY' },
  { label: '本周', value: 'WEEK' },
  { label: '本月', value: 'MONTH' },
  { label: '近 5 交易日', value: 'LAST_5' },
  { label: '近 20 交易日', value: 'LAST_20' },
  { label: '今年', value: 'YEAR' },
  { label: '自定义', value: 'CUSTOM' }
]
const analysisScopeDescriptionMap: Record<StockAiAnalysisScope, string> = {
  COMPREHENSIVE: '持仓、成交、清仓与行情的联合复盘',
  POSITION: '当前持仓快照与所选区间行情表现',
  CLOSED_POSITION: '按清仓日期复盘已实现盈亏与退出质量',
  TRADE_RECORD: '按成交日期检查交易行为、费用与纪律'
}
const analysisScopeEmptyDescriptionMap: Record<StockAiAnalysisScope, string> = {
  COMPREHENSIVE: '汇总持仓、成交、清仓和行情数据，生成综合账户复盘',
  POSITION: '分析当前持仓集中度、相对基准表现、技术状态与条件化计划',
  CLOSED_POSITION: '分析区间清仓胜率、盈亏因子、超额收益与重复行为模式',
  TRADE_RECORD: '区分证券买卖、资金划转和公司行为，检查频次、费用与纪律'
}
const quickPromptMap: Record<StockAiAnalysisScope, string[]> = {
  COMPREHENSIVE: [
    '为什么跑输基准？',
    '哪三笔交易最需要复盘？',
    '当前最大风险是什么？',
    '给出下一周期检查清单'
  ],
  POSITION: [
    '哪只持仓风险贡献最大？',
    '哪些持仓跑输基准？',
    '给出逐股触发与失效条件',
    '仓位集中度如何调整？'
  ],
  CLOSED_POSITION: [
    '最常见的亏损模式是什么？',
    '哪些清仓时机质量最差？',
    '盈利与亏损样本有何差异？',
    '给出未回测规则草案'
  ],
  TRADE_RECORD: [
    '是否存在追涨杀跌？',
    '交易费用侵蚀有多大？',
    '哪些交易频率异常？',
    '给出纪律检查清单'
  ]
}

const now = new Date()
const todayText = formatDate(now, 'YYYY-MM-DD')
const thirtyDaysAgo = new Date(now)
thirtyDaysAgo.setDate(now.getDate() - 29)
const defaultCustomRange: [string, string] = [formatDate(thirtyDaysAgo, 'YYYY-MM-DD'), todayText]
const createScopeWorkspace = (): ScopeWorkspaceState => ({
  period: 'WEEKLY',
  datePreset: 'WEEK',
  customDateRange: [...defaultCustomRange],
  activeView: 'overview',
  aiInputContext: '',
  messages: [],
  activeTitle: '',
  question: '',
  reportStatus: 'idle',
  reportStatusDetail: '',
  streamPurpose: 'report'
})
const analysisScope = ref<StockAiAnalysisScope>('COMPREHENSIVE')
const scopeWorkspaces = reactive<Record<StockAiAnalysisScope, ScopeWorkspaceState>>({
  COMPREHENSIVE: createScopeWorkspace(),
  POSITION: createScopeWorkspace(),
  CLOSED_POSITION: createScopeWorkspace(),
  TRADE_RECORD: createScopeWorkspace()
})
const currentScopeWorkspace = computed(() => scopeWorkspaces[analysisScope.value])
const period = computed({
  get: () => currentScopeWorkspace.value.period,
  set: (value: StockAiAnalysisPeriod) => (currentScopeWorkspace.value.period = value)
})
const datePreset = computed({
  get: () => currentScopeWorkspace.value.datePreset,
  set: (value: DatePreset) => (currentScopeWorkspace.value.datePreset = value)
})
const customDateRange = computed({
  get: () => currentScopeWorkspace.value.customDateRange,
  set: (value: [string, string]) => (currentScopeWorkspace.value.customDateRange = value)
})
const activeView = computed({
  get: () => currentScopeWorkspace.value.activeView,
  set: (value: AnalysisView) => (currentScopeWorkspace.value.activeView = value)
})
const systemAnalysis = computed({
  get: () => currentScopeWorkspace.value.systemAnalysis,
  set: (value: StockSystemAnalysisVO | undefined) =>
    (currentScopeWorkspace.value.systemAnalysis = value)
})
const session = computed({
  get: () => currentScopeWorkspace.value.session,
  set: (value: StockAiAnalysisSessionVO | undefined) =>
    (currentScopeWorkspace.value.session = value)
})
const aiInputContext = computed({
  get: () => currentScopeWorkspace.value.aiInputContext,
  set: (value: string) => (currentScopeWorkspace.value.aiInputContext = value)
})
const messages = computed({
  get: () => currentScopeWorkspace.value.messages,
  set: (value: ChatMessageVO[]) => (currentScopeWorkspace.value.messages = value)
})
const activeConversationId = computed({
  get: () => currentScopeWorkspace.value.activeConversationId,
  set: (value: number | undefined) => (currentScopeWorkspace.value.activeConversationId = value)
})
const activeTitle = computed({
  get: () => currentScopeWorkspace.value.activeTitle,
  set: (value: string) => (currentScopeWorkspace.value.activeTitle = value)
})
const question = computed({
  get: () => currentScopeWorkspace.value.question,
  set: (value: string) => (currentScopeWorkspace.value.question = value)
})
const reportStatus = computed({
  get: () => currentScopeWorkspace.value.reportStatus,
  set: (value: ReportRunStatus) => (currentScopeWorkspace.value.reportStatus = value)
})
const reportStatusDetail = computed({
  get: () => currentScopeWorkspace.value.reportStatusDetail,
  set: (value: string) => (currentScopeWorkspace.value.reportStatusDetail = value)
})
const streamPurpose = computed({
  get: () => currentScopeWorkspace.value.streamPurpose,
  set: (value: StreamPurpose) => (currentScopeWorkspace.value.streamPurpose = value)
})
const reportStartedAt = computed({
  get: () => currentScopeWorkspace.value.reportStartedAt,
  set: (value: number | undefined) => (currentScopeWorkspace.value.reportStartedAt = value)
})
const reportFinishedAt = computed({
  get: () => currentScopeWorkspace.value.reportFinishedAt,
  set: (value: number | undefined) => (currentScopeWorkspace.value.reportFinishedAt = value)
})
const lastResponseAt = computed({
  get: () => currentScopeWorkspace.value.lastResponseAt,
  set: (value: number | undefined) => (currentScopeWorkspace.value.lastResponseAt = value)
})
const configStatus = ref<StockAiAnalysisConfigStatusVO>()
const history = ref<StockAiAnalysisHistoryVO[]>([])
const calculating = ref(false)
const loadingHistory = ref(false)
const loadingConversation = ref(false)
const abortController = ref<AbortController>()
const messageViewport = ref<HTMLElement>()
const reportPanelRef = ref<HTMLElement>()
const tradePlanDialogRef = ref<InstanceType<typeof StockTradePlanDialog>>()
const isComposing = ref(false)
const reportFullscreen = ref(false)
const statusClock = ref(Date.now())
let statusTimer: number | undefined
let originalBodyOverflow = ''

const resolvePresetRange = (preset: DatePreset): [string, string] => {
  const end = new Date()
  const endText = formatDate(end, 'YYYY-MM-DD')
  if (preset === 'TODAY') return [endText, endText]
  if (preset === 'WEEK') {
    const start = new Date(end)
    const day = start.getDay()
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1))
    return [formatDate(start, 'YYYY-MM-DD'), endText]
  }
  if (preset === 'MONTH') {
    return [formatDate(new Date(end.getFullYear(), end.getMonth(), 1), 'YYYY-MM-DD'), endText]
  }
  if (preset === 'YEAR') {
    return [formatDate(new Date(end.getFullYear(), 0, 1), 'YYYY-MM-DD'), endText]
  }
  if (preset === 'LAST_5' || preset === 'LAST_20') {
    const requiredDays = preset === 'LAST_5' ? 5 : 20
    const start = new Date(end)
    let remaining = requiredDays
    while (remaining > 0) {
      const day = start.getDay()
      if (day !== 0 && day !== 6) remaining -= 1
      if (remaining > 0) start.setDate(start.getDate() - 1)
    }
    return [formatDate(start, 'YYYY-MM-DD'), endText]
  }
  return customDateRange.value
}

const analysisScopeLabel = computed(
  () => analysisScopeOptions.find((item) => item.value === analysisScope.value)?.label || '综合复盘'
)
const analysisScopeDescription = computed(() => analysisScopeDescriptionMap[analysisScope.value])
const analysisScopeEmptyDescription = computed(
  () => analysisScopeEmptyDescriptionMap[analysisScope.value]
)
const quickPrompts = computed(() => quickPromptMap[analysisScope.value])
const scopeHistory = computed(() =>
  history.value.filter((item) => (item.scope || 'COMPREHENSIVE') === analysisScope.value)
)
const periodLabel = computed(
  () => datePresetOptions.find((item) => item.value === datePreset.value)?.label || '自定义'
)
const selectedDateRangeLabel = computed(() => {
  const range = resolvePresetRange(datePreset.value)
  return range[0] === range[1] ? range[1] : `${range[0]} 至 ${range[1]}`
})
const generating = computed(() => reportStatus.value === 'preparing')
const streaming = computed(() => streamingReportStatuses.includes(reportStatus.value))
const reportBusy = computed(() => runningReportStatuses.includes(reportStatus.value))
const busy = computed(() => calculating.value || reportBusy.value || loadingConversation.value)
const activeViewMeta = computed(() => analysisViewMeta[activeView.value])
const activeDashboardView = computed<DashboardView | undefined>(() =>
  dashboardViews.includes(activeView.value) ? (activeView.value as DashboardView) : undefined
)
const activeAnalysis = computed(() =>
  ['report', 'context', 'history'].includes(activeView.value)
    ? session.value || systemAnalysis.value
    : systemAnalysis.value || session.value
)
const modelStatusText = computed(() => {
  if (!configStatus.value) return '正在检查 AI 报告模型配置'
  if (!configStatus.value.configured) return 'AI 报告模型未配置'
  return `AI 报告 · ${configStatus.value.platform || 'AI'} · ${configStatus.value.modelName || configStatus.value.model}`
})
const analysisDateRange = computed(() => {
  if (!activeAnalysis.value) return selectedDateRangeLabel.value
  return activeAnalysis.value.beginDate === activeAnalysis.value.endDate
    ? activeAnalysis.value.endDate
    : `${activeAnalysis.value.beginDate} 至 ${activeAnalysis.value.endDate}`
})
const analysisMetrics = computed(() => {
  const analysis = activeAnalysis.value
  const missingValue = analysis?.missingMarketDataCount ?? '--'
  if (analysisScope.value === 'POSITION') {
    return [
      { label: '当前持仓', value: analysis?.positionCount ?? '--' },
      {
        label: '持仓代理收益',
        value:
          analysis?.dashboard?.performance?.currentPositionProxyReturn == null
            ? '--'
            : `${analysis.dashboard.performance.currentPositionProxyReturn.toFixed(2)}%`
      },
      { label: '持仓股票', value: analysis?.stockCount ?? '--' },
      { label: '行情日线', value: analysis?.marketBarCount ?? '--' },
      { label: '行情缺失', value: missingValue, warning: Boolean(analysis?.missingMarketDataCount) }
    ]
  }
  if (analysisScope.value === 'CLOSED_POSITION') {
    return [
      { label: '清仓样本', value: analysis?.dashboard?.trades?.closedPositionCount ?? '--' },
      { label: '盈利样本', value: analysis?.dashboard?.trades?.profitableClosedCount ?? '--' },
      { label: '亏损样本', value: analysis?.dashboard?.trades?.losingClosedCount ?? '--' },
      { label: '涉及股票', value: analysis?.stockCount ?? '--' },
      { label: '行情缺失', value: missingValue, warning: Boolean(analysis?.missingMarketDataCount) }
    ]
  }
  if (analysisScope.value === 'TRADE_RECORD') {
    return [
      { label: '全部流水', value: analysis?.tradeCount ?? '--' },
      { label: '证券买卖', value: analysis?.dashboard?.trades?.securityTradeCount ?? '--' },
      { label: '买入笔数', value: analysis?.dashboard?.trades?.buyCount ?? '--' },
      { label: '卖出笔数', value: analysis?.dashboard?.trades?.sellCount ?? '--' },
      { label: '涉及股票', value: analysis?.stockCount ?? '--' }
    ]
  }
  return [
    { label: '当前持仓', value: analysis?.positionCount ?? '--' },
    { label: '周期成交', value: analysis?.tradeCount ?? '--' },
    { label: '涉及股票', value: analysis?.stockCount ?? '--' },
    { label: '行情日线', value: analysis?.marketBarCount ?? '--' },
    { label: '行情缺失', value: missingValue, warning: Boolean(analysis?.missingMarketDataCount) }
  ]
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
  if (reportStatus.value === 'preparing')
    return `正在汇总${analysisScopeLabel.value}数据并创建独立分析会话`
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
    ? `选择分析区间后生成 AI ${analysisScopeLabel.value}${periodLabel.value}`
    : '完成 AI 密钥和模型配置后即可生成报告'
})
const reportPrimaryActionLabel = computed(() =>
  reportContent.value
    ? `重新生成${analysisScopeLabel.value}${periodLabel.value}`
    : `生成${analysisScopeLabel.value}${periodLabel.value}`
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

const applyDatePreset = (preset: DatePreset) => {
  datePreset.value = preset
  if (preset === 'CUSTOM') {
    period.value = 'CUSTOM'
    return
  }
  customDateRange.value = resolvePresetRange(preset)
  if (preset === 'TODAY') period.value = 'DAILY'
  else if (preset === 'WEEK') period.value = 'WEEKLY'
  else if (preset === 'MONTH') period.value = 'MONTHLY'
  else period.value = 'CUSTOM'
}

const setActiveView = (view: AnalysisView) => {
  activeView.value = view
}

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
  scope: analysisScope.value,
  period: period.value,
  beginDate: period.value === 'CUSTOM' ? customDateRange.value[0] : undefined,
  endDate: period.value === 'CUSTOM' ? customDateRange.value[1] : undefined
})

const runSystemAnalysis = async () => {
  if (!validateDateRange()) return
  calculating.value = true
  try {
    systemAnalysis.value = await StockAiAnalysisApi.analyzeDashboard(buildAnalysisRequest())
    activeView.value = 'overview'
    message.success(`${analysisScopeLabel.value}系统分析已更新`)
  } finally {
    calculating.value = false
  }
}

const handleTradePlanSaved = async () => {
  if (systemAnalysis.value && !busy.value) await runSystemAnalysis()
}

const buildSubmittedSummary = (created: StockAiAnalysisSessionVO) => {
  const scopeLabel =
    analysisScopeOptions.find((item) => item.value === created.scope)?.label || '综合复盘'
  if (created.scope === 'POSITION') {
    return `已提交${scopeLabel}${periodLabel.value}数据包 · ${created.positionCount} 个持仓 · ${created.marketBarCount} 条日线`
  }
  if (created.scope === 'CLOSED_POSITION') {
    return `已提交${scopeLabel}${periodLabel.value}数据包 · ${created.dashboard.trades.closedPositionCount} 个清仓样本 · ${created.marketBarCount} 条日线`
  }
  if (created.scope === 'TRADE_RECORD') {
    return `已提交${scopeLabel}${periodLabel.value}数据包 · ${created.tradeCount} 条流水 · ${created.dashboard.trades.securityTradeCount} 笔证券买卖`
  }
  return `已提交综合复盘${periodLabel.value}数据包 · ${created.positionCount} 个持仓 · ${created.tradeCount} 条流水 · ${created.marketBarCount} 条日线`
}

const generateAiReport = async () => {
  if (!configStatus.value?.configured) {
    message.warning('请先配置并启用 AI 密钥和聊天模型')
    return
  }
  if (!validateDateRange()) return
  activeView.value = 'report'
  streamPurpose.value = 'report'
  resetReportRun()
  updateReportStatus('preparing')
  aiInputContext.value = ''
  try {
    const created = await StockAiAnalysisApi.createSession(buildAnalysisRequest())
    session.value = created
    aiInputContext.value = created.initialPrompt
    messages.value = []
    activeConversationId.value = created.conversationId
    activeTitle.value = created.title.replace('[股票AI] ', '')
    loadHistory().catch(() => undefined)
    await sendStream(created.initialPrompt, buildSubmittedSummary(created), 'report')
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
  updateReportStatus('waiting')

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
      undefined
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
  if (item.conversationId === activeConversationId.value) {
    activeView.value = 'report'
    return
  }
  abortCurrentStream(false)
  analysisScope.value = item.scope || 'COMPREHENSIVE'
  await nextTick()
  reportStartedAt.value = undefined
  reportFinishedAt.value = undefined
  lastResponseAt.value = undefined
  updateReportStatus('idle')
  loadingConversation.value = true
  session.value = undefined
  aiInputContext.value = ''
  messages.value = []
  period.value = 'CUSTOM'
  datePreset.value = 'CUSTOM'
  if (item.beginDate && item.endDate) {
    customDateRange.value = [item.beginDate, item.endDate]
  }
  activeConversationId.value = item.conversationId
  activeTitle.value = item.title.replace('[股票AI] ', '')
  try {
    const [snapshot, list] = await Promise.all([
      StockAiAnalysisApi.getSession(item.conversationId),
      ChatMessageApi.getChatMessageListByConversationId(item.conversationId)
    ])
    const chatMessages = list as ChatMessageVO[]
    aiInputContext.value =
      chatMessages.find((chatMessage) => chatMessage.type === 'user')?.content ||
      snapshot.initialPrompt ||
      ''
    session.value = snapshot
    if (snapshot.beginDate && snapshot.endDate) {
      customDateRange.value = [snapshot.beginDate, snapshot.endDate]
    }
    let initialUserFound = false
    messages.value = chatMessages.map((chatMessage) => {
      if (chatMessage.type === 'user' && !initialUserFound) {
        initialUserFound = true
        return {
          ...chatMessage,
          content: `已提交${analysisScopeLabel.value}${getPeriodLabel(item.period)}数据包`
        }
      }
      return chatMessage
    })
    activeView.value = 'report'
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

const openHistoryByConversationId = async (conversationId: number) => {
  let item = history.value.find((historyItem) => historyItem.conversationId === conversationId)
  if (!item) {
    await loadHistory()
    item = history.value.find((historyItem) => historyItem.conversationId === conversationId)
  }
  if (!item) {
    message.warning('对应历史分析已删除或不可访问')
    return
  }
  await openHistory(item)
}

const deleteHistory = async (item: StockAiAnalysisHistoryVO) => {
  await message.delConfirm(`确认删除“${item.title.replace('[股票AI] ', '')}”及其全部对话吗？`)
  await ChatConversationApi.deleteChatConversationMy(item.conversationId)
  if (activeConversationId.value === item.conversationId) {
    activeConversationId.value = undefined
    activeTitle.value = ''
    session.value = undefined
    aiInputContext.value = ''
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

const copyAiInput = async () => {
  if (!aiInputContext.value) return
  await copy(aiInputContext.value)
  message.success('AI 输入数据已复制')
}

const downloadReport = () => {
  const date = session.value?.endDate || new Date().toISOString().slice(0, 10)
  download.markdown(
    new Blob([reportContent.value], { type: 'text/markdown;charset=utf-8' }),
    `股票操作-${analysisScopeLabel.value}-${periodLabel.value}-${date}.md`
  )
}

const downloadAiInput = () => {
  if (!aiInputContext.value) return
  const date = session.value?.endDate || new Date().toISOString().slice(0, 10)
  download.markdown(
    new Blob([aiInputContext.value], { type: 'text/markdown;charset=utf-8' }),
    `股票操作AI输入数据-${analysisScopeLabel.value}-${periodLabel.value}-${date}.md`
  )
}

const setReportFullscreen = (fullscreen: boolean) => {
  if (reportFullscreen.value === fullscreen) return
  reportFullscreen.value = fullscreen
  if (fullscreen) {
    originalBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    nextTick(() => reportPanelRef.value?.focus())
    return
  }
  document.body.style.overflow = originalBodyOverflow
}

const toggleReportFullscreen = () => setReportFullscreen(!reportFullscreen.value)

const handleFullscreenKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && reportFullscreen.value) setReportFullscreen(false)
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
  window.addEventListener('keydown', handleFullscreenKeydown)
  statusTimer = window.setInterval(() => {
    statusClock.value = Date.now()
  }, 1000)
  await Promise.all([loadConfigStatus(), loadHistory()])
})

onBeforeUnmount(() => {
  abortCurrentStream(false)
  window.removeEventListener('keydown', handleFullscreenKeydown)
  setReportFullscreen(false)
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
.canvas-title-line,
.canvas-identity,
.rail-heading,
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

.analysis-controls {
  display: grid;
  gap: 10px;
  padding: 10px 14px;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  border-left: 1px solid var(--el-border-color-light);
}

.scope-control,
.date-control,
.date-preset-list {
  display: flex;
  align-items: center;
}

.scope-control,
.date-control {
  gap: 10px;
  min-width: 0;
}

.control-label {
  flex: 0 0 64px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.scope-description,
.selected-range {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.scope-description {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-preset-list {
  flex-wrap: wrap;
  gap: 6px;
}

.date-preset-list :deep(.el-button + .el-button) {
  margin-left: 0;
}

.selected-range {
  min-width: 160px;
  font-variant-numeric: tabular-nums;
}

.system-analysis-button {
  margin-left: auto;
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

.research-workspace {
  display: grid;
  grid-template-columns: 224px minmax(620px, 1fr) 260px;
  align-items: start;
  min-height: 720px;
  margin-top: 12px;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.analysis-nav-panel {
  position: sticky;
  top: 12px;
  max-height: calc(100vh - 120px);
  min-width: 0;
  overflow-y: auto;
  border-right: 1px solid var(--el-border-color-light);
}

.analysis-nav-heading {
  display: flex;
  min-height: 62px;
  flex-direction: column;
  justify-content: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.analysis-nav-heading span,
.nav-group-label,
.rail-heading > span {
  font-size: 12px;
  font-weight: 700;
  color: var(--el-text-color-secondary);
}

.analysis-nav-heading small {
  margin-top: 3px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.analysis-nav-groups {
  padding: 8px;
}

.nav-group + .nav-group {
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px solid var(--el-border-color-extra-light);
}

.nav-group-label {
  display: block;
  padding: 5px 8px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.analysis-nav-item {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 14px;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 7px 8px;
  margin: 2px 0;
  font: inherit;
  color: var(--el-text-color-regular);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
}

.analysis-nav-item > :first-child {
  font-size: 17px;
  color: var(--el-text-color-secondary);
}

.analysis-nav-item span {
  min-width: 0;
}

.analysis-nav-item strong,
.analysis-nav-item small {
  display: block;
}

.analysis-nav-item strong {
  font-size: 13px;
  line-height: 19px;
}

.analysis-nav-item small {
  overflow: hidden;
  font-size: 10px;
  line-height: 15px;
  color: var(--el-text-color-placeholder);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-nav-item:hover {
  background: var(--el-fill-color-light);
}

.analysis-nav-item--active {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
  box-shadow: inset 3px 0 0 var(--el-color-primary);
}

.analysis-nav-item--active > :first-child,
.analysis-nav-item--active .nav-arrow {
  color: var(--el-color-primary);
}

.nav-arrow {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.analysis-canvas {
  min-width: 0;
  overflow-x: auto;
  border-right: 1px solid var(--el-border-color-light);
}

.canvas-heading {
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.canvas-identity {
  min-width: 0;
  gap: 11px;
}

.canvas-icon {
  display: grid;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  font-size: 18px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 5px;
  place-items: center;
}

.canvas-title-line {
  flex-wrap: wrap;
  gap: 8px;
}

.canvas-heading p {
  margin: 2px 0 0;
  overflow: hidden;
  font-size: 11px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-label {
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.source-label--ai {
  color: var(--el-color-primary);
}

.source-label--evidence {
  color: var(--el-color-success);
}

.source-label--history {
  color: var(--el-color-warning-dark-2);
}

.metric-strip {
  display: grid;
  grid-template-columns: minmax(220px, 1.7fr) repeat(5, minmax(100px, 1fr));
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
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

.report-reader {
  min-width: 0;
  background: var(--el-bg-color);
}

.report-reader--fullscreen {
  position: fixed;
  z-index: 3000;
  inset: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: var(--el-bg-color);
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
  border-bottom: 1px solid var(--el-border-color-light);
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

.conversation-panel {
  display: grid;
  grid-template-rows: 56px minmax(480px, 1fr) auto;
  min-width: 0;
  min-height: 650px;
}

.report-reader--fullscreen .report-control {
  min-height: 82px;
  border-right: 0;
  border-left: 0;
}

.report-reader--fullscreen .conversation-panel {
  grid-template-rows: 60px minmax(0, 1fr) auto;
  min-height: 0;
  overflow: hidden;
}

.report-reader--fullscreen .message-viewport {
  width: min(1080px, 100%);
  height: auto;
  max-height: none;
  min-height: 0;
  padding-right: 40px;
  padding-left: 40px;
  margin: 0 auto;
}

.report-reader--fullscreen .conversation-heading,
.report-reader--fullscreen .question-composer {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.report-reader--fullscreen .conversation-heading {
  border-right: 1px solid var(--el-border-color-lighter);
  border-left: 1px solid var(--el-border-color-lighter);
}

.report-reader--fullscreen .question-composer {
  border-right: 1px solid var(--el-border-color-lighter);
  border-left: 1px solid var(--el-border-color-lighter);
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

.report-actions :deep(.el-button) {
  min-width: 32px;
}

.report-actions :deep(.el-button + .el-button) {
  margin-left: 2px;
}

.message-viewport {
  height: calc(100vh - 430px);
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
}

.history-panel--standalone {
  min-height: 640px;
}

.history-heading {
  height: 56px;
}

.history-list {
  height: calc(100vh - 330px);
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

.standalone-context-panel {
  min-height: 640px;
}

.context-rail {
  position: sticky;
  top: 12px;
  max-height: calc(100vh - 120px);
  min-width: 0;
  overflow-y: auto;
  background: var(--el-fill-color-extra-light);
}

.rail-section {
  padding: 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.rail-heading {
  min-height: 24px;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.rail-heading button {
  padding: 0;
  font: inherit;
  font-size: 11px;
  color: var(--el-color-primary);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.analysis-summary-list {
  margin: 0;
}

.analysis-summary-list > div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.analysis-summary-list > div:last-child {
  border-bottom: 0;
}

.analysis-summary-list dt,
.analysis-summary-list dd {
  min-width: 0;
  margin: 0;
  font-size: 11px;
  line-height: 18px;
}

.analysis-summary-list dt {
  color: var(--el-text-color-placeholder);
}

.analysis-summary-list dd {
  color: var(--el-text-color-regular);
  text-align: right;
  overflow-wrap: anywhere;
}

.coverage-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--el-border-color-lighter);
}

.coverage-grid > div {
  display: flex;
  min-height: 62px;
  flex-direction: column;
  justify-content: center;
  padding: 8px;
  border-right: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.coverage-grid > div:nth-child(2n) {
  border-right: 0;
}

.coverage-grid > div:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.coverage-grid span {
  font-size: 10px;
  color: var(--el-text-color-placeholder);
}

.coverage-grid strong {
  margin-top: 3px;
  font-size: 16px;
}

.warning-number {
  color: var(--el-color-warning-dark-2);
}

.next-step-copy {
  margin: 0 0 12px;
  font-size: 11px;
  line-height: 19px;
  color: var(--el-text-color-secondary);
}

.rail-primary-action {
  width: 100%;
}

.rail-history-list {
  display: grid;
  gap: 4px;
}

.rail-history-list button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  padding: 6px 7px;
  font: inherit;
  color: var(--el-text-color-regular);
  text-align: left;
  cursor: pointer;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 4px;
}

.rail-history-list button:hover {
  border-color: var(--el-color-primary-light-7);
}

.rail-history-list span {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rail-history-list small,
.rail-empty {
  font-size: 10px;
  color: var(--el-text-color-placeholder);
}

.rail-empty {
  padding: 10px 0;
  text-align: center;
}

@media (width <= 1400px) {
  .research-workspace {
    grid-template-columns: 208px minmax(0, 1fr);
  }

  .context-rail {
    position: static;
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    max-height: none;
    border-top: 1px solid var(--el-border-color-light);
  }

  .rail-section {
    border-right: 1px solid var(--el-border-color-lighter);
    border-bottom: 0;
  }

  .rail-section:last-child {
    border-right: 0;
  }
}

@media (width <= 1100px) {
  .command-bar {
    align-items: flex-start;
  }

  .command-actions {
    max-width: 520px;
  }

  .date-control {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .system-analysis-button {
    margin-left: 74px;
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

  .research-workspace {
    grid-template-columns: 196px minmax(0, 1fr);
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

  .scope-control,
  .date-control {
    align-items: flex-start;
    flex-direction: column;
  }

  .control-label {
    flex-basis: auto;
  }

  .scope-control :deep(.el-segmented) {
    width: 100%;
  }

  .scope-description,
  .selected-range {
    min-width: 0;
  }

  .system-analysis-button {
    margin-left: 0;
  }

  .research-workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .analysis-nav-panel {
    position: static;
    max-height: none;
    overflow: hidden;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  .analysis-nav-heading {
    min-height: 52px;
  }

  .analysis-nav-groups {
    display: flex;
    gap: 8px;
    padding: 8px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .analysis-nav-groups::-webkit-scrollbar {
    display: none;
  }

  .nav-group,
  .nav-group + .nav-group {
    display: flex;
    flex: 0 0 auto;
    gap: 4px;
    padding-top: 0;
    margin-top: 0;
    border-top: 0;
  }

  .nav-group-label {
    display: none;
  }

  .analysis-nav-item {
    grid-template-columns: 18px auto;
    width: auto;
    min-width: 112px;
    min-height: 42px;
    margin: 0;
    white-space: nowrap;
  }

  .analysis-nav-item small,
  .nav-arrow {
    display: none;
  }

  .analysis-nav-item--active {
    box-shadow: inset 0 -3px 0 var(--el-color-primary);
  }

  .analysis-canvas {
    border-right: 0;
  }

  .context-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rail-section:nth-child(2n) {
    border-right: 0;
  }

  .rail-section:nth-child(n + 3) {
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .report-control {
    align-items: flex-start;
    flex-direction: column;
  }

  .report-control__actions {
    width: 100%;
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

  .analysis-controls {
    padding: 10px;
  }

  .scope-control :deep(.el-segmented__item-label) {
    font-size: 11px;
  }

  .date-preset-list {
    width: 100%;
  }

  .date-preset-list :deep(.el-button) {
    flex: 1 0 calc(33.333% - 6px);
  }

  .system-analysis-button {
    width: 100%;
  }

  .report-control__status {
    align-items: flex-start;
  }

  .report-control__actions :deep(.el-button) {
    width: 100%;
  }

  .report-reader--fullscreen .report-control {
    min-height: 112px;
  }

  .report-reader--fullscreen .message-viewport {
    padding-right: 14px;
    padding-left: 14px;
  }

  .report-reader--fullscreen .conversation-heading,
  .report-reader--fullscreen .question-composer {
    border-right: 0;
    border-left: 0;
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

  .canvas-heading {
    align-items: flex-start;
  }

  .canvas-title-line {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }

  .canvas-heading p {
    display: -webkit-box;
    white-space: normal;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .context-rail {
    grid-template-columns: minmax(0, 1fr);
  }

  .rail-section,
  .rail-section:nth-child(2n) {
    border-right: 0;
  }

  .rail-section:nth-child(n + 2) {
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .user-message {
    max-width: 90%;
  }
}
</style>
