<template>
  <section class="rule-panel">
    <header class="panel-heading">
      <div>
        <h2>个人复盘规则</h2>
        <p>AI 只能提出草案，保存后才进入个人规则库；未触发和无法判断均不计入遵守率。</p>
      </div>
      <div class="heading-actions">
        <el-button circle title="刷新规则与执行记录" :loading="loading" @click="loadAll">
          <Icon icon="ep:refresh" />
        </el-button>
        <el-button
          v-hasPermi="['finance:stock-review-rule:update']"
          :disabled="!currentConversationId || !reportContent"
          @click="openCreate(true)"
        >
          <Icon icon="ep:magic-stick" class="mr-5px" />提取报告规则
        </el-button>
        <el-button
          v-hasPermi="['finance:stock-review-rule:update']"
          @click="templateVisible = true"
        >
          <Icon icon="ep:collection" class="mr-5px" />新手模板
        </el-button>
        <el-button
          type="primary"
          v-hasPermi="['finance:stock-review-rule:update']"
          @click="openCreate(false)"
        >
          <Icon icon="ep:plus" class="mr-5px" />自定义规则
        </el-button>
      </div>
    </header>

    <div v-loading="loading" class="panel-body">
      <div class="rule-metrics">
        <div>
          <span>启用规则</span>
          <strong>{{ enabledRules.length }}</strong>
        </div>
        <div>
          <span>草案</span>
          <strong>{{ rules.filter((item) => item.status === 'DRAFT').length }}</strong>
        </div>
        <div>
          <span>可判断执行</span>
          <strong>{{ judgeableCount }}</strong>
        </div>
        <div>
          <span>规则遵守率</span>
          <strong>{{ adherenceRate }}</strong>
        </div>
        <div>
          <span>人工纠正</span>
          <strong>{{ executions.filter((item) => item.correctedStatus).length }}</strong>
        </div>
      </div>

      <section v-if="!rules.length && !loading" class="onboarding-band">
        <div class="onboarding-copy">
          <span class="onboarding-icon"><Icon icon="ep:guide" /></span>
          <div>
            <strong>第一次使用，不需要从零编写</strong>
            <p>选模板并审阅 → 保存或启用 → 下一周期按当前分析区间检查。</p>
          </div>
        </div>
        <div class="onboarding-steps" aria-label="个人规则上手步骤">
          <span><b>1</b>选择模板</span>
          <Icon icon="ep:arrow-right" />
          <span><b>2</b>确认阈值</span>
          <Icon icon="ep:arrow-right" />
          <span><b>3</b>查看证据</span>
        </div>
        <el-button type="primary" @click="templateVisible = true">选择新手模板</el-button>
      </section>

      <div class="rule-layout">
        <section class="rule-library">
          <div class="section-heading">
            <div>
              <strong>规则库</strong>
              <span>{{ rules.length }} 条，规则编辑不会覆盖已冻结的历史执行快照</span>
            </div>
            <el-segmented v-model="ruleFilter" :options="ruleFilterOptions" size="small" />
          </div>

          <el-empty
            v-if="!filteredRules.length"
            :image-size="64"
            description="暂无符合条件的规则"
          />
          <div v-else class="rule-list">
            <article v-for="rule in filteredRules" :key="rule.id" class="rule-row">
              <div class="rule-type" :class="`rule-type--${rule.ruleType.toLowerCase()}`">
                {{ ruleTypeLabel(rule.ruleType) }}
              </div>
              <div class="rule-copy">
                <div class="rule-name-line">
                  <strong>{{ rule.name }}</strong>
                  <el-tag size="small" effect="plain" :type="statusTagType(rule.status)">
                    {{ ruleStatusLabel(rule.status) }}
                  </el-tag>
                  <el-tag v-if="rule.sourceReportId" size="small" effect="plain" type="primary">
                    AI 草案已确认
                  </el-tag>
                  <el-tag v-else size="small" effect="plain">用户创建</el-tag>
                </div>
                <p>{{ rule.triggerCondition || structuredRuleText(rule) || '未填写触发条件' }}</p>
                <div class="rule-meta">
                  <span>{{ rule.scope || '综合复盘' }}</span>
                  <span>{{ rule.checkPeriod || '按需检查' }}</span>
                  <span v-if="rule.expectedAction">动作：{{ rule.expectedAction }}</span>
                </div>
              </div>
              <div class="rule-actions">
                <el-button
                  text
                  title="按当前分析区间重建执行"
                  :disabled="rule.status !== 'ENABLED' || !beginDate || !endDate"
                  v-hasPermi="['finance:stock-review-rule:update']"
                  @click="rebuildRule(rule)"
                >
                  <Icon icon="ep:data-analysis" />
                </el-button>
                <el-dropdown
                  trigger="click"
                  v-hasPermi="['finance:stock-review-rule:update']"
                  @command="(command) => handleRuleCommand(rule, command)"
                >
                  <el-button text title="规则操作"><Icon icon="ep:more-filled" /></el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="edit" :disabled="rule.status === 'ARCHIVED'">
                        编辑
                      </el-dropdown-item>
                      <el-dropdown-item
                        v-if="rule.status !== 'ENABLED' && rule.status !== 'ARCHIVED'"
                        command="enable"
                      >
                        启用
                      </el-dropdown-item>
                      <el-dropdown-item v-if="rule.status === 'ENABLED'" command="disable">
                        停用
                      </el-dropdown-item>
                      <el-dropdown-item
                        command="archive"
                        divided
                        :disabled="rule.status === 'ARCHIVED'"
                      >
                        归档
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </article>
          </div>
        </section>

        <section class="execution-library">
          <div class="section-heading">
            <div>
              <strong>周期执行</strong>
              <span>系统计算与用户纠正分层展示</span>
            </div>
          </div>
          <el-empty
            v-if="!executions.length"
            :image-size="64"
            description="启用规则后可按当前分析区间重建执行"
          />
          <div v-else class="execution-list">
            <article
              v-for="execution in executions.slice(0, 12)"
              :key="execution.id"
              class="execution-row"
            >
              <div class="execution-status" :class="statusClass(execution.effectiveStatus)">
                <Icon :icon="statusIcon(execution.effectiveStatus)" />
              </div>
              <div class="execution-copy">
                <div>
                  <strong>{{ execution.ruleName }}</strong>
                  <el-tag size="small" effect="plain">系统结果</el-tag>
                  <el-tag
                    v-if="execution.correctedStatus"
                    size="small"
                    effect="plain"
                    type="warning"
                  >
                    用户已纠正
                  </el-tag>
                </div>
                <p>
                  {{ execution.beginDate }} 至 {{ execution.endDate }} ·
                  {{ executionStatusLabel(execution.effectiveStatus) }}
                </p>
                <span>
                  触发 {{ execution.triggerCount }} · 可判断 {{ execution.judgeableCount }} ·
                  超额影响 {{ formatPercent(execution.excessReturnImpact) }}
                </span>
              </div>
              <div class="execution-actions">
                <el-button text title="查看证据" @click="openEvidence(execution)">
                  <Icon icon="ep:view" />
                </el-button>
                <el-button
                  text
                  title="人工纠正"
                  v-hasPermi="['finance:stock-review-rule:update']"
                  @click="openCorrection(execution)"
                >
                  <Icon icon="ep:edit-pen" />
                </el-button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>

    <el-dialog
      v-model="templateVisible"
      title="选择新手规则模板"
      width="880px"
      append-to-body
      destroy-on-close
    >
      <div class="template-intro">
        <Icon icon="ep:info-filled" />
        <span
          >先从 2 至 3
          条规则开始，观察两周后再调整。选择模板只会填入表单，不会自动保存或启用。</span
        >
      </div>
      <div class="template-list">
        <article v-for="item in starterTemplates" :key="item.id" class="template-row">
          <div class="template-icon" :class="`template-icon--${item.rule.ruleType.toLowerCase()}`">
            <Icon :icon="item.icon" />
          </div>
          <div class="template-copy">
            <div>
              <strong>{{ item.rule.name }}</strong>
              <el-tag size="small" effect="plain">{{ item.level }}</el-tag>
              <el-tag size="small" effect="plain">{{ periodLabel(item.rule.checkPeriod) }}</el-tag>
            </div>
            <p>{{ item.description }}</p>
            <span>{{ structuredFormText(item.rule) }}</span>
          </div>
          <el-button type="primary" plain @click="useTemplate(item)">使用模板</el-button>
        </article>
      </div>
    </el-dialog>

    <el-dialog
      v-model="candidateVisible"
      title="审阅报告中的规则候选"
      width="900px"
      append-to-body
      destroy-on-close
    >
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="以下内容来自 AI 报告且尚未回测。请逐条审阅，系统不会自动保存或启用。"
      />
      <div class="candidate-list">
        <article v-for="(item, index) in reportCandidates" :key="index" class="candidate-row">
          <div class="candidate-order">{{ index + 1 }}</div>
          <div class="candidate-copy">
            <div>
              <strong>{{ item.name }}</strong>
              <el-tag size="small" effect="plain" type="primary">AI 候选</el-tag>
              <el-tag size="small" effect="plain">{{ ruleTypeLabel(item.ruleType) }}</el-tag>
            </div>
            <p>{{ item.triggerCondition || '报告未明确触发条件，请在审阅时补充' }}</p>
            <span v-if="item.expectedAction">建议动作：{{ item.expectedAction }}</span>
          </div>
          <el-button type="primary" plain @click="reviewCandidate(item)">审阅并填入</el-button>
        </article>
      </div>
    </el-dialog>

    <el-dialog
      v-model="formVisible"
      :title="form.id ? '编辑复盘规则' : form.sourceReportId ? '确认 AI 规则草案' : '新建复盘规则'"
      width="860px"
      append-to-body
      destroy-on-close
    >
      <el-alert
        v-if="form.sourceReportId"
        class="draft-alert"
        type="warning"
        :closable="false"
        show-icon
        title="这是从 AI 报告提取的未回测候选。请核对内容和阈值；只有点击保存后才进入规则库。"
      />
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="92px">
        <div class="form-grid">
          <el-form-item label="规则名称" prop="name" class="form-span-2">
            <el-input v-model="form.name" maxlength="120" show-word-limit />
          </el-form-item>
          <el-form-item label="规则类型" prop="ruleType">
            <el-select v-model="form.ruleType">
              <el-option label="保持" value="KEEP" />
              <el-option label="改进" value="IMPROVE" />
              <el-option label="禁止" value="PROHIBIT" />
            </el-select>
          </el-form-item>
          <el-form-item label="保存状态" prop="status">
            <el-select v-model="form.status">
              <el-option label="草案" value="DRAFT" />
              <el-option label="直接启用" value="ENABLED" />
              <el-option label="停用" value="DISABLED" />
            </el-select>
          </el-form-item>
          <el-form-item label="适用范围">
            <el-input v-model="form.scope" placeholder="例如：综合复盘、短线交易" />
          </el-form-item>
          <el-form-item label="检查周期">
            <el-select v-model="form.checkPeriod" clearable>
              <el-option label="每日" value="DAILY" />
              <el-option label="每周" value="WEEKLY" />
              <el-option label="每月" value="MONTHLY" />
              <el-option label="自定义" value="CUSTOM" />
            </el-select>
          </el-form-item>
          <el-form-item label="触发条件" prop="triggerCondition" class="form-span-2">
            <el-input
              v-model="form.triggerCondition"
              type="textarea"
              :rows="2"
              maxlength="1000"
              placeholder="明确什么时候检查这条规则"
            />
          </el-form-item>
          <el-form-item label="期望动作" class="form-span-2">
            <el-input v-model="form.expectedAction" type="textarea" :rows="2" maxlength="1000" />
          </el-form-item>
          <el-form-item label="失效条件" class="form-span-2">
            <el-input
              v-model="form.invalidationCondition"
              maxlength="1000"
              placeholder="例如：交易策略或风险承受能力发生变化时重新评估"
            />
          </el-form-item>
        </div>

        <section class="rule-preview" :class="`rule-preview--${previewTone}`">
          <div class="rule-preview__heading">
            <Icon :icon="previewIcon" />
            <div>
              <strong>系统会如何执行</strong>
              <span>{{ previewStatusText }}</span>
            </div>
          </div>
          <p>{{ rulePreview }}</p>
          <span v-if="structuredConfigHint" class="rule-preview__warning">
            <Icon icon="ep:warning-filled" />{{ structuredConfigHint }}
          </span>
        </section>

        <el-collapse class="advanced-rules">
          <el-collapse-item title="结构化自动检查（可选）" name="advanced">
            <div class="structured-help">
              配置后系统可自动判定；留空时规则仅作为文字提醒。禁止类规则触发即算违反，保持/改进类还需配置遵守条件。
            </div>
            <div class="structured-heading">触发条件</div>
            <div class="structured-grid">
              <el-select v-model="form.evaluationMetric" clearable placeholder="指标">
                <el-option v-for="item in metricOptions" :key="item.value" v-bind="item" />
              </el-select>
              <el-select v-model="form.evaluationOperator" clearable placeholder="关系">
                <el-option v-for="item in operatorOptions" :key="item.value" v-bind="item" />
              </el-select>
              <el-input-number
                v-model="form.thresholdValue"
                :precision="4"
                controls-position="right"
              />
              <span class="metric-unit">{{ selectedMetric?.unit || '数值' }}</span>
            </div>
            <div v-if="selectedMetric" class="metric-description">
              <strong>{{ selectedMetric.label }}</strong>
              <span>{{ selectedMetric.description }}</span>
              <el-button text @click="applySuggestedThreshold('evaluation')">
                使用参考值 {{ selectedMetric.suggestedValue }}{{ selectedMetric.unit }}
              </el-button>
            </div>
            <div v-if="form.ruleType !== 'PROHIBIT'" class="structured-heading">遵守条件</div>
            <div v-if="form.ruleType !== 'PROHIBIT'" class="structured-grid">
              <el-select v-model="form.adherenceMetric" clearable placeholder="指标">
                <el-option v-for="item in metricOptions" :key="item.value" v-bind="item" />
              </el-select>
              <el-select v-model="form.adherenceOperator" clearable placeholder="关系">
                <el-option v-for="item in operatorOptions" :key="item.value" v-bind="item" />
              </el-select>
              <el-input-number
                v-model="form.adherenceThresholdValue"
                :precision="4"
                controls-position="right"
              />
              <span class="metric-unit">{{ selectedAdherenceMetric?.unit || '数值' }}</span>
            </div>
            <div
              v-if="form.ruleType !== 'PROHIBIT' && selectedAdherenceMetric"
              class="metric-description"
            >
              <strong>{{ selectedAdherenceMetric.label }}</strong>
              <span>{{ selectedAdherenceMetric.description }}</span>
              <el-button text @click="applySuggestedThreshold('adherence')">
                使用参考值 {{ selectedAdherenceMetric.suggestedValue
                }}{{ selectedAdherenceMetric.unit }}
              </el-button>
            </div>
          </el-collapse-item>
        </el-collapse>

        <el-form-item label="备注" class="rule-note">
          <el-input v-model="form.note" type="textarea" :rows="2" maxlength="2000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveRule">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="correctionVisible" title="人工纠正规则判定" width="520px" append-to-body>
      <el-form label-width="90px">
        <el-form-item label="规则">
          <span>{{ correctingExecution?.ruleName }}</span>
        </el-form-item>
        <el-form-item label="系统结果">
          <el-tag effect="plain">{{
            executionStatusLabel(correctingExecution?.systemStatus)
          }}</el-tag>
        </el-form-item>
        <el-form-item label="纠正结果" required>
          <el-select v-model="correctionForm.correctedStatus">
            <el-option label="遵守" value="ADHERED" />
            <el-option label="违反" value="VIOLATED" />
            <el-option label="无法判断" value="NOT_JUDGABLE" />
          </el-select>
        </el-form-item>
        <el-form-item label="纠正原因" required>
          <el-input
            v-model="correctionForm.correctionReason"
            type="textarea"
            :rows="4"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="correctionVisible = false">取消</el-button>
        <el-button type="primary" :loading="correcting" @click="submitCorrection"
          >提交纠正</el-button
        >
      </template>
    </el-dialog>

    <el-drawer v-model="evidenceVisible" title="规则执行证据" size="520px" append-to-body>
      <template v-if="evidenceExecution">
        <div class="evidence-summary">
          <strong>{{ evidenceExecution.ruleName }}</strong>
          <span>{{ evidenceExecution.beginDate }} 至 {{ evidenceExecution.endDate }}</span>
          <el-tag effect="plain"
            >系统：{{ executionStatusLabel(evidenceExecution.systemStatus) }}</el-tag
          >
          <el-tag v-if="evidenceExecution.correctedStatus" effect="plain" type="warning">
            用户：{{ executionStatusLabel(evidenceExecution.correctedStatus) }}
          </el-tag>
        </div>
        <div class="evidence-block">
          <h3>证据编号</h3>
          <el-tag
            v-for="item in parseJsonList(evidenceExecution.evidenceJson)"
            :key="item"
            effect="plain"
          >
            {{ item }}
          </el-tag>
          <el-empty
            v-if="!parseJsonList(evidenceExecution.evidenceJson).length"
            :image-size="48"
            description="没有结构化证据"
          />
        </div>
        <div class="evidence-block">
          <h3>当期冻结规则</h3>
          <pre>{{ formatJson(evidenceExecution.ruleSnapshotJson) }}</pre>
        </div>
        <div v-if="evidenceExecution.correctionReason" class="evidence-block">
          <h3>人工纠正审计</h3>
          <p>{{ evidenceExecution.correctionReason }}</p>
          <span>{{ evidenceExecution.correctedTime }}</span>
        </div>
      </template>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import {
  StockReviewRuleApi,
  type StockReviewRuleExecutionStatus,
  type StockReviewRuleExecutionVO,
  type StockReviewRulePeriod,
  type StockReviewRuleSaveVO,
  type StockReviewRuleStatus,
  type StockReviewRuleType,
  type StockReviewRuleVO
} from '@/api/finance/stock/review-rule'

defineOptions({ name: 'StockAiRulePanel' })

const props = defineProps<{
  currentConversationId?: number
  reportContent?: string
  beginDate?: string
  endDate?: string
  period?: StockReviewRulePeriod
}>()

type RuleFilter = 'ACTIVE' | 'ALL' | StockReviewRuleStatus
type RuleForm = StockReviewRuleSaveVO & { id?: number; sourceReportId?: string }
type RuleConditionKind = 'evaluation' | 'adherence'
interface MetricOption {
  label: string
  value: string
  unit: string
  description: string
  suggestedValue: number
}
interface StarterTemplate {
  id: string
  icon: string
  level: string
  description: string
  rule: RuleForm
}

const message = useMessage()
const loading = ref(false)
const saving = ref(false)
const correcting = ref(false)
const rules = ref<StockReviewRuleVO[]>([])
const executions = ref<StockReviewRuleExecutionVO[]>([])
const ruleFilter = ref<RuleFilter>('ACTIVE')
const templateVisible = ref(false)
const candidateVisible = ref(false)
const formVisible = ref(false)
const correctionVisible = ref(false)
const evidenceVisible = ref(false)
const formRef = ref<FormInstance>()
const correctingExecution = ref<StockReviewRuleExecutionVO>()
const evidenceExecution = ref<StockReviewRuleExecutionVO>()
const reportCandidates = ref<RuleForm[]>([])

const createForm = (): RuleForm => ({
  name: '',
  ruleType: 'IMPROVE',
  status: 'DRAFT',
  scope: '综合复盘',
  triggerCondition: '',
  expectedAction: '',
  invalidationCondition: '',
  checkPeriod: props.period || 'WEEKLY',
  note: ''
})
const form = reactive<RuleForm>(createForm())
const correctionForm = reactive({
  correctedStatus: 'NOT_JUDGABLE' as 'ADHERED' | 'VIOLATED' | 'NOT_JUDGABLE',
  correctionReason: ''
})

const ruleFilterOptions = [
  { label: '有效', value: 'ACTIVE' },
  { label: '启用', value: 'ENABLED' },
  { label: '草案', value: 'DRAFT' },
  { label: '全部', value: 'ALL' }
]
const metricOptions: MetricOption[] = [
  {
    label: '追高买入次数',
    value: 'CHASE_BUY_COUNT',
    unit: '次',
    description: '分析区间内，买入日涨幅达到系统追高识别条件的成交次数。',
    suggestedValue: 0
  },
  {
    label: '恐慌卖出次数',
    value: 'PANIC_SELL_COUNT',
    unit: '次',
    description: '分析区间内，卖出日跌幅达到系统恐慌卖出识别条件的成交次数。',
    suggestedValue: 0
  },
  {
    label: '日内回转次数',
    value: 'SAME_DAY_ROUND_TRIP_COUNT',
    unit: '次',
    description: '同一股票在同一交易日同时出现买入和卖出的次数。',
    suggestedValue: 0
  },
  {
    label: '交易费用',
    value: 'TOTAL_FEE',
    unit: '元',
    description: '分析区间内证券交易产生的佣金、税费及其他费用合计。',
    suggestedValue: 100
  },
  {
    label: '证券交易次数',
    value: 'SECURITY_TRADE_COUNT',
    unit: '次',
    description: '分析区间内买入和卖出证券的成交记录总数。',
    suggestedValue: 10
  },
  {
    label: '清仓胜率',
    value: 'CLOSED_WIN_RATE',
    unit: '%',
    description: '分析区间内盈利清仓样本数占全部可判断清仓样本数的百分比。',
    suggestedValue: 50
  },
  {
    label: '超额收益',
    value: 'EXCESS_RETURN',
    unit: '%',
    description: '账户或样本收益减去同期市场基准收益后的百分比。',
    suggestedValue: 0
  },
  {
    label: '账户最大回撤',
    value: 'ACCOUNT_MAX_DRAWDOWN',
    unit: '%',
    description: '历史资产快照覆盖区间内，从净值高点到后续低点的最大跌幅。',
    suggestedValue: 10
  },
  {
    label: '总仓位比例',
    value: 'POSITION_RATIO',
    unit: '%',
    description: '全部持仓市值占账户总资产的百分比，阈值填写 80 表示 80%。',
    suggestedValue: 80
  },
  {
    label: '最大单票仓位',
    value: 'LARGEST_POSITION_RATIO',
    unit: '%',
    description: '最大单只股票市值占全部持仓市值的百分比，阈值填写 30 表示 30%。',
    suggestedValue: 30
  },
  {
    label: '计划违反次数',
    value: 'PLAN_VIOLATION_COUNT',
    unit: '次',
    description: '具备可信事前交易计划的样本中，被系统确定性判定违反计划的次数。',
    suggestedValue: 0
  },
  {
    label: '计划遵守率',
    value: 'PLAN_ADHERENCE_RATE',
    unit: '%',
    description: '可判断的事前交易计划检查项中，遵守项所占百分比。',
    suggestedValue: 80
  }
]
const operatorOptions = [
  { label: '<', value: 'LT' },
  { label: '≤', value: 'LTE' },
  { label: '=', value: 'EQ' },
  { label: '≥', value: 'GTE' },
  { label: '>', value: 'GT' }
]
const starterTemplates: StarterTemplate[] = [
  {
    id: 'avoid-chase-buy',
    icon: 'ep:top-right',
    level: '短线纪律',
    description: '只要本周出现一次系统可识别的追高买入，就记录为违反。',
    rule: {
      name: '禁止追高买入',
      ruleType: 'PROHIBIT',
      status: 'DRAFT',
      scope: '短线交易',
      triggerCondition: '本周存在系统可识别的追高买入行为。',
      expectedAction: '停止临时追单，等待回踩企稳或放量突破确认后再审阅交易计划。',
      invalidationCondition: '交易策略不再包含短线择时，或系统追高识别口径调整时重新评估。',
      checkPeriod: 'WEEKLY',
      evaluationMetric: 'CHASE_BUY_COUNT',
      evaluationOperator: 'GT',
      thresholdValue: 0,
      note: '新手模板：先观察两周，再结合证据调整规则。'
    }
  },
  {
    id: 'limit-largest-position',
    icon: 'ep:pie-chart',
    level: '仓位控制',
    description: '最大单只股票占全部持仓超过 30% 时记录为违反，降低单票集中风险。',
    rule: {
      name: '限制单票仓位',
      ruleType: 'PROHIBIT',
      status: 'DRAFT',
      scope: '全部持仓',
      triggerCondition: '任一股票占全部持仓的比例超过 30%。',
      expectedAction: '停止继续加仓，并根据流动性和交易计划将单票仓位降低到 30% 以内。',
      invalidationCondition: '账户仓位管理上限调整后重新评估阈值。',
      checkPeriod: 'DAILY',
      evaluationMetric: 'LARGEST_POSITION_RATIO',
      evaluationOperator: 'GT',
      thresholdValue: 30,
      note: '新手模板：30% 为参考上限，不代表适合所有风险承受能力。'
    }
  },
  {
    id: 'follow-trade-plan',
    icon: 'ep:list',
    level: '计划纪律',
    description: '存在可信事前计划且系统识别到违反行为时记录，避免用结果倒推过程。',
    rule: {
      name: '禁止违反事前交易计划',
      ruleType: 'PROHIBIT',
      status: 'DRAFT',
      scope: '计划交易',
      triggerCondition: '本周存在系统可确定性判断的事前交易计划违反行为。',
      expectedAction: '暂停新增计划外交易，先核对违反证据并完成本次复盘。',
      invalidationCondition: '交易计划缺失或只有事后补录时，本规则不可判断而不是自动违反。',
      checkPeriod: 'WEEKLY',
      evaluationMetric: 'PLAN_VIOLATION_COUNT',
      evaluationOperator: 'GT',
      thresholdValue: 0,
      note: '新手模板：只有成交前已保存的结构化计划才作为确定性纪律证据。'
    }
  }
]
const formRules: FormRules = {
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  ruleType: [{ required: true, message: '请选择规则类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择保存状态', trigger: 'change' }],
  triggerCondition: [
    {
      validator: (_rule, value, callback) => {
        if (value?.trim() || form.evaluationMetric) callback()
        else callback(new Error('自然语言触发条件和结构化触发指标至少填写一项'))
      },
      trigger: 'blur'
    }
  ]
}

const enabledRules = computed(() => rules.value.filter((item) => item.status === 'ENABLED'))
const filteredRules = computed(() => {
  if (ruleFilter.value === 'ALL') return rules.value
  if (ruleFilter.value === 'ACTIVE') return rules.value.filter((item) => item.status !== 'ARCHIVED')
  return rules.value.filter((item) => item.status === ruleFilter.value)
})
const judgeableCount = computed(
  () =>
    executions.value.filter(
      (item) => item.effectiveStatus === 'ADHERED' || item.effectiveStatus === 'VIOLATED'
    ).length
)
const adheredCount = computed(
  () => executions.value.filter((item) => item.effectiveStatus === 'ADHERED').length
)
const adherenceRate = computed(() =>
  judgeableCount.value ? `${((adheredCount.value / judgeableCount.value) * 100).toFixed(1)}%` : '--'
)
const selectedMetric = computed(() =>
  metricOptions.find((item) => item.value === form.evaluationMetric)
)
const selectedAdherenceMetric = computed(() =>
  metricOptions.find((item) => item.value === form.adherenceMetric)
)
const evaluationConfigState = computed(() =>
  conditionConfigState(form.evaluationMetric, form.evaluationOperator, form.thresholdValue)
)
const adherenceConfigState = computed(() =>
  conditionConfigState(form.adherenceMetric, form.adherenceOperator, form.adherenceThresholdValue)
)
const structuredConfigHint = computed(() => {
  if (evaluationConfigState.value === 'PARTIAL')
    return '自动触发条件未填完整：指标、关系和阈值必须同时填写。'
  if (form.ruleType !== 'PROHIBIT' && evaluationConfigState.value === 'COMPLETE') {
    if (adherenceConfigState.value === 'EMPTY')
      return '保持/改进规则已配置自动触发条件，还需要配置自动遵守条件。'
    if (adherenceConfigState.value === 'PARTIAL')
      return '自动遵守条件未填完整：指标、关系和阈值必须同时填写。'
  }
  return ''
})
const previewTone = computed(() => {
  if (structuredConfigHint.value) return 'warning'
  if (form.status === 'ENABLED') return 'active'
  return 'draft'
})
const previewIcon = computed(() =>
  structuredConfigHint.value
    ? 'ep:warning-filled'
    : form.status === 'ENABLED'
      ? 'ep:video-play'
      : 'ep:document'
)
const previewStatusText = computed(() => {
  if (structuredConfigHint.value) return '还不能保存为自动检查规则'
  if (form.status === 'ENABLED') return '保存后可按分析区间执行'
  if (form.status === 'DISABLED') return '保存后暂不参与执行'
  return '草案仅保存，不参与执行'
})
const rulePreview = computed(() => {
  if (evaluationConfigState.value !== 'COMPLETE') {
    return form.triggerCondition?.trim()
      ? `系统会保存文字提醒：“${form.triggerCondition.trim()}”。未配置完整自动检查条件前，不会自动判定遵守或违反。`
      : '填写自然语言触发条件，或配置完整的结构化指标、关系和阈值。'
  }
  const triggerText = structuredFormText(form)
  if (form.ruleType === 'PROHIBIT') {
    return `当${triggerText}时触发，并直接判定为“违反”；未达到条件记为“未触发”，不计入遵守率。`
  }
  if (adherenceConfigState.value === 'COMPLETE') {
    return `当${triggerText}时触发；再检查${conditionText(
      form.adherenceMetric,
      form.adherenceOperator,
      form.adherenceThresholdValue
    )}，满足则判定“遵守”，否则判定“违反”。`
  }
  return `当${triggerText}时触发，但当前没有完整遵守条件，系统无法自动判定遵守或违反。`
})

const loadAll = async () => {
  loading.value = true
  try {
    const [ruleList, executionList] = await Promise.all([
      StockReviewRuleApi.getList(),
      StockReviewRuleApi.getExecutionList()
    ])
    rules.value = ruleList || []
    executions.value = executionList || []
  } finally {
    loading.value = false
  }
}

const resetForm = (data?: Partial<RuleForm>) => {
  Object.assign(form, createForm(), data || {})
  nextTick(() => formRef.value?.clearValidate())
}

const openCreate = (fromReport: boolean) => {
  if (fromReport) {
    const candidates = extractReportRuleCandidates(props.reportContent || '')
    if (!candidates.length) {
      message.warning('当前报告没有可可靠提取的“下一周期规则”，已为你打开新手模板。')
      templateVisible.value = true
      return
    }
    reportCandidates.value = candidates
    candidateVisible.value = true
    return
  }
  resetForm({ status: 'DRAFT' })
  formVisible.value = true
}

const useTemplate = (template: StarterTemplate) => {
  resetForm({ ...template.rule })
  templateVisible.value = false
  formVisible.value = true
}

const reviewCandidate = (candidate: RuleForm) => {
  resetForm(candidate)
  candidateVisible.value = false
  formVisible.value = true
}

const applySuggestedThreshold = (kind: RuleConditionKind) => {
  if (kind === 'evaluation' && selectedMetric.value) {
    form.thresholdValue = selectedMetric.value.suggestedValue
    if (!form.evaluationOperator) form.evaluationOperator = defaultOperator(form.evaluationMetric)
    return
  }
  if (kind === 'adherence' && selectedAdherenceMetric.value) {
    form.adherenceThresholdValue = selectedAdherenceMetric.value.suggestedValue
    if (!form.adherenceOperator) form.adherenceOperator = defaultOperator(form.adherenceMetric)
  }
}

const openEdit = (rule: StockReviewRuleVO) => {
  resetForm({
    id: rule.id,
    name: rule.name,
    ruleType: rule.ruleType,
    status: rule.status === 'ARCHIVED' ? 'DISABLED' : rule.status,
    scope: rule.scope || undefined,
    triggerCondition: rule.triggerCondition || undefined,
    expectedAction: rule.expectedAction || undefined,
    invalidationCondition: rule.invalidationCondition || undefined,
    checkPeriod: rule.checkPeriod || undefined,
    evaluationMetric: rule.evaluationMetric || undefined,
    evaluationOperator: rule.evaluationOperator || undefined,
    thresholdValue: rule.thresholdValue ?? undefined,
    adherenceMetric: rule.adherenceMetric || undefined,
    adherenceOperator: rule.adherenceOperator || undefined,
    adherenceThresholdValue: rule.adherenceThresholdValue ?? undefined,
    sourceReportId: rule.sourceReportId || undefined,
    sampleCount: rule.sampleCount ?? undefined,
    note: rule.note || undefined
  })
  formVisible.value = true
}

const normalizePayload = (): RuleForm => {
  const payload = { ...form }
  if (!payload.evaluationMetric) {
    payload.evaluationOperator = undefined
    payload.thresholdValue = undefined
  }
  if (payload.ruleType === 'PROHIBIT' || !payload.adherenceMetric) {
    payload.adherenceMetric = undefined
    payload.adherenceOperator = undefined
    payload.adherenceThresholdValue = undefined
  }
  return payload
}

const saveRule = async () => {
  await formRef.value?.validate()
  if (structuredConfigHint.value) {
    message.warning(structuredConfigHint.value)
    return
  }
  saving.value = true
  try {
    const payload = normalizePayload()
    if (payload.id) await StockReviewRuleApi.update(payload as RuleForm & { id: number })
    else await StockReviewRuleApi.create(payload)
    message.success(payload.id ? '规则已更新' : '规则已保存')
    formVisible.value = false
    await loadAll()
  } finally {
    saving.value = false
  }
}

const handleRuleCommand = async (rule: StockReviewRuleVO, command: string) => {
  if (command === 'edit') return openEdit(rule)
  const targetStatus =
    command === 'enable' ? 'ENABLED' : command === 'disable' ? 'DISABLED' : 'ARCHIVED'
  if (targetStatus === 'ARCHIVED')
    await message.confirm('归档后不可恢复，历史执行仍会保留。确认归档？')
  await StockReviewRuleApi.updateStatus({ id: rule.id, status: targetStatus })
  message.success(
    targetStatus === 'ENABLED'
      ? '规则已启用'
      : targetStatus === 'DISABLED'
        ? '规则已停用'
        : '规则已归档'
  )
  await loadAll()
}

const rebuildRule = async (rule: StockReviewRuleVO) => {
  if (!props.beginDate || !props.endDate) return
  await StockReviewRuleApi.rebuildExecution({
    ruleId: rule.id,
    periodType: props.period || 'CUSTOM',
    beginDate: props.beginDate,
    endDate: props.endDate
  })
  message.success(`已重建“${rule.name}”的周期执行结果`)
  executions.value = await StockReviewRuleApi.getExecutionList()
}

const openCorrection = (execution: StockReviewRuleExecutionVO) => {
  correctingExecution.value = execution
  correctionForm.correctedStatus =
    execution.correctedStatus === 'ADHERED' || execution.correctedStatus === 'VIOLATED'
      ? execution.correctedStatus
      : 'NOT_JUDGABLE'
  correctionForm.correctionReason = execution.correctionReason || ''
  correctionVisible.value = true
}

const submitCorrection = async () => {
  if (!correctingExecution.value || !correctionForm.correctionReason.trim()) {
    message.warning('请填写纠正原因')
    return
  }
  correcting.value = true
  try {
    await StockReviewRuleApi.correctExecution({
      id: correctingExecution.value.id,
      correctedStatus: correctionForm.correctedStatus,
      correctionReason: correctionForm.correctionReason.trim()
    })
    message.success('人工纠正已记录，并保留系统原始判定')
    correctionVisible.value = false
    executions.value = await StockReviewRuleApi.getExecutionList()
  } finally {
    correcting.value = false
  }
}

const openEvidence = (execution: StockReviewRuleExecutionVO) => {
  evidenceExecution.value = execution
  evidenceVisible.value = true
}

const parseJsonList = (value: string) => {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}
const formatJson = (value: string) => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value || '--'
  }
}
const conditionConfigState = (
  metric?: string,
  operator?: string,
  threshold?: number
): 'EMPTY' | 'PARTIAL' | 'COMPLETE' => {
  const values = [Boolean(metric), Boolean(operator), threshold !== undefined && threshold !== null]
  if (values.every(Boolean)) return 'COMPLETE'
  if (values.some(Boolean)) return 'PARTIAL'
  return 'EMPTY'
}
const defaultOperator = (metric?: string) =>
  metric === 'CLOSED_WIN_RATE' || metric === 'EXCESS_RETURN' || metric === 'PLAN_ADHERENCE_RATE'
    ? 'LT'
    : 'GT'
const conditionText = (metric?: string, operator?: string, threshold?: number) => {
  const metricItem = metricOptions.find((item) => item.value === metric)
  const operatorLabel =
    operatorOptions.find((item) => item.value === operator)?.label || operator || ''
  return `${metricItem?.label || metric || '未选择指标'} ${operatorLabel} ${threshold ?? '--'}${metricItem?.unit || ''}`
}
const structuredFormText = (rule: Partial<RuleForm>) =>
  conditionText(rule.evaluationMetric, rule.evaluationOperator, rule.thresholdValue)
const periodLabel = (value?: string) =>
  ({ DAILY: '每日', WEEKLY: '每周', MONTHLY: '每月', CUSTOM: '自定义' })[value || 'CUSTOM'] ||
  '自定义'

const cleanMarkdownText = (value: string) =>
  value
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^[\s>*#`_~-]+|[\s*_`]+$/g, '')
    .trim()

const fieldValue = (block: string, labels: string[]) => {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const match = block.match(
    new RegExp(
      `(?:^|\\n)\\s*(?:[-*+]\\s*)?(?:\\*\\*)?(?:${escaped})(?:\\*\\*)?\\s*[：:]\\s*(.+?)(?=\\n|$)`,
      'i'
    )
  )
  return match ? cleanMarkdownText(match[1]) : ''
}

const inferRuleType = (block: string): StockReviewRuleType => {
  const explicit = fieldValue(block, ['规则类型', '类型'])
  if (/禁止/.test(explicit)) return 'PROHIBIT'
  if (/保持/.test(explicit)) return 'KEEP'
  if (/改进/.test(explicit)) return 'IMPROVE'
  if (/禁止|不得|严禁|避免/.test(block)) return 'PROHIBIT'
  if (/保持|继续|坚持/.test(block)) return 'KEEP'
  return 'IMPROVE'
}

const inferPeriod = (block: string): StockReviewRulePeriod => {
  const explicit = fieldValue(block, ['检查周期', '验证周期']) || block
  if (/每日|每天|日报/.test(explicit)) return 'DAILY'
  if (/每月|月度|月报/.test(explicit)) return 'MONTHLY'
  if (/自定义/.test(explicit)) return 'CUSTOM'
  return 'WEEKLY'
}

const normalizeCandidateName = (value: string, index: number) => {
  const cleaned = cleanMarkdownText(value)
    .replace(/^规则\s*[一二三四五六七八九十\d]+\s*[：:、.)-]?\s*/i, '')
    .replace(/^(名称|规则名称)\s*[：:]\s*/i, '')
  return cleaned.slice(0, 120) || `AI 规则候选 ${index + 1}`
}

const splitRuleBlocks = (section: string, ruleHeadingLevel: number) => {
  const lines = section.split(/\r?\n/)
  const blocks: string[] = []
  let current: string[] = []
  const startPattern = new RegExp(
    `^\\s*(?:#{${ruleHeadingLevel}}\\s+\\S+|(?:[-*+]\\s+)?(?:\\d+[.、)]|规则\\s*[一二三四五六七八九十\\d]+[：:、.)-]))`,
    'i'
  )
  lines.forEach((line) => {
    if (startPattern.test(line) && current.some((item) => item.trim())) {
      blocks.push(current.join('\n'))
      current = []
    }
    current.push(line)
  })
  if (current.some((item) => item.trim())) blocks.push(current.join('\n'))
  return blocks
    .map((item) => item.trim())
    .filter((item) => item.length >= 12)
    .slice(0, 3)
}

const extractReportRuleCandidates = (report: string): RuleForm[] => {
  if (!report.trim()) return []
  const headingPattern =
    /^#{1,6}\s*(?:\d+[.、]?\s*)?(?:下一周期(?:三条)?规则|下一周期规则草案|规则草案)\s*$/gim
  const headings = [...report.matchAll(headingPattern)]
  if (!headings.length) return []
  const sectionHeadingLevel = headings[0][0].match(/^#+/)?.[0].length || 1
  const start = (headings[0].index || 0) + headings[0][0].length
  const rest = report.slice(start)
  const nextHeading = rest.search(new RegExp(`^#{1,${sectionHeadingLevel}}\\s+`, 'm'))
  const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest
  return splitRuleBlocks(section, Math.min(sectionHeadingLevel + 1, 6)).map((block, index) => {
    const titleLine = block
      .split(/\r?\n/)
      .map((item) => item.trim())
      .find(Boolean)
    const trigger = fieldValue(block, ['触发条件', '触发'])
    const expectedAction = fieldValue(block, [
      '禁止或执行动作',
      '禁止动作',
      '执行动作',
      '期望动作',
      '纠正动作',
      '行动'
    ])
    const invalidation = fieldValue(block, ['失效条件', '无效条件'])
    const scope = fieldValue(block, ['适用场景', '适用范围'])
    const sampleText = fieldValue(block, ['样本数', '样本量'])
    const sampleMatch = sampleText.match(/\d+/)
    return {
      name: normalizeCandidateName(
        fieldValue(block, ['规则名称', '名称']) || titleLine || '',
        index
      ),
      ruleType: inferRuleType(`${titleLine || ''}\n${expectedAction}\n${trigger}`),
      status: 'DRAFT',
      scope: scope || '综合复盘',
      triggerCondition: trigger,
      expectedAction,
      invalidationCondition: invalidation,
      checkPeriod: inferPeriod(block),
      sourceReportId: props.currentConversationId ? String(props.currentConversationId) : undefined,
      sampleCount: sampleMatch ? Number(sampleMatch[0]) : undefined,
      note: `来自 AI 报告的未回测候选，请核对后保存。\n\n原始候选：\n${block.slice(0, 1500)}`
    }
  })
}
const ruleTypeLabel = (value: StockReviewRuleType) =>
  ({ KEEP: '保持', IMPROVE: '改进', PROHIBIT: '禁止' })[value]
const ruleStatusLabel = (value: StockReviewRuleStatus) =>
  ({ DRAFT: '草案', ENABLED: '启用', DISABLED: '停用', ARCHIVED: '归档' })[value]
const statusTagType = (value: StockReviewRuleStatus) =>
  value === 'ENABLED'
    ? 'success'
    : value === 'DRAFT'
      ? 'info'
      : value === 'ARCHIVED'
        ? 'warning'
        : 'info'
const executionStatusLabel = (value?: StockReviewRuleExecutionStatus | null) =>
  value
    ? {
        NOT_TRIGGERED: '未触发',
        NOT_JUDGABLE: '无法判断',
        ADHERED: '遵守',
        VIOLATED: '违反'
      }[value]
    : '--'
const statusClass = (value: StockReviewRuleExecutionStatus) =>
  `execution-status--${value.toLowerCase()}`
const statusIcon = (value: StockReviewRuleExecutionStatus) =>
  value === 'ADHERED'
    ? 'ep:circle-check-filled'
    : value === 'VIOLATED'
      ? 'ep:warning-filled'
      : value === 'NOT_TRIGGERED'
        ? 'ep:remove-filled'
        : 'ep:question-filled'
const structuredRuleText = (rule: StockReviewRuleVO) =>
  rule.evaluationMetric
    ? conditionText(
        rule.evaluationMetric,
        rule.evaluationOperator || undefined,
        rule.thresholdValue ?? undefined
      )
    : ''
const formatPercent = (value: number | null | undefined) =>
  value === null || value === undefined ? '--' : `${Number(value).toFixed(2)}%`

onMounted(loadAll)

defineExpose({ reload: loadAll })
</script>

<style scoped lang="scss">
.rule-panel {
  margin-top: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.panel-heading,
.heading-actions,
.section-heading,
.rule-name-line,
.rule-meta,
.execution-copy > div,
.evidence-summary {
  display: flex;
  align-items: center;
}

.panel-heading {
  justify-content: space-between;
  gap: 16px;
  min-height: 76px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.panel-heading h2 {
  margin: 0;
  font-size: 15px;
  letter-spacing: 0;
}

.panel-heading p,
.section-heading span {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.heading-actions {
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.heading-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.panel-body {
  min-height: 240px;
}

.onboarding-band {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto auto;
  gap: 20px;
  align-items: center;
  padding: 14px 16px;
  background: var(--el-color-primary-light-9);
  border-bottom: 1px solid var(--el-color-primary-light-7);
}

.onboarding-copy,
.onboarding-steps,
.template-intro,
.template-copy > div,
.candidate-copy > div,
.rule-preview__heading,
.rule-preview__warning {
  display: flex;
  align-items: center;
}

.onboarding-copy {
  gap: 10px;
  min-width: 0;
}

.onboarding-icon {
  display: grid;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  font-size: 18px;
  color: var(--el-color-primary);
  background: var(--el-bg-color);
  border-radius: 4px;
  place-items: center;
}

.onboarding-copy p {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.onboarding-steps {
  gap: 9px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.onboarding-steps > span {
  white-space: nowrap;
}

.onboarding-steps b {
  display: inline-grid;
  width: 20px;
  height: 20px;
  margin-right: 5px;
  font-size: 11px;
  color: #fff;
  background: var(--el-color-primary);
  border-radius: 50%;
  place-items: center;
}

.template-intro {
  padding: 10px 12px;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  gap: 8px;
}

.template-list,
.candidate-list {
  border-top: 1px solid var(--el-border-color-lighter);
}

.template-row,
.candidate-row {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 104px;
  padding: 14px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.template-icon,
.candidate-order {
  display: grid;
  width: 36px;
  height: 36px;
  font-weight: 700;
  border-radius: 4px;
  place-items: center;
}

.template-icon--prohibit {
  color: #b42318;
  background: #fee2e2;
}

.template-icon--improve {
  color: #1d4ed8;
  background: #dbeafe;
}

.template-icon--keep {
  color: #166534;
  background: #dcfce7;
}

.candidate-list {
  margin-top: 12px;
}

.candidate-order {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.template-copy,
.candidate-copy {
  min-width: 0;
}

.template-copy > div,
.candidate-copy > div {
  flex-wrap: wrap;
  gap: 6px;
}

.template-copy p,
.candidate-copy p {
  margin: 7px 0 5px;
  line-height: 20px;
}

.template-copy > span,
.candidate-copy > span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.rule-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.rule-metrics > div {
  display: flex;
  flex-direction: column;
  min-height: 70px;
  padding: 11px 16px;
  border-left: 1px solid var(--el-border-color-lighter);
}

.rule-metrics > div:first-child {
  border-left: 0;
}

.rule-metrics span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.rule-metrics strong {
  margin-top: 5px;
  font-size: 20px;
}

.rule-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(340px, 0.8fr);
}

.rule-library,
.execution-library {
  min-width: 0;
  padding: 14px 16px 16px;
}

.execution-library {
  border-left: 1px solid var(--el-border-color-lighter);
}

.section-heading {
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  margin-bottom: 6px;
}

.section-heading > div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rule-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  min-height: 92px;
  padding: 12px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.rule-row:first-child,
.execution-row:first-child {
  border-top: 0;
}

.rule-type {
  display: grid;
  width: 52px;
  height: 30px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 4px;
  place-items: center;
}

.rule-type--keep {
  color: #166534;
  background: #dcfce7;
}

.rule-type--improve {
  color: #1d4ed8;
  background: #dbeafe;
}

.rule-type--prohibit {
  color: #b42318;
  background: #fee2e2;
}

.rule-copy,
.execution-copy {
  min-width: 0;
}

.rule-name-line,
.execution-copy > div {
  flex-wrap: wrap;
  gap: 6px;
}

.rule-copy p,
.execution-copy p {
  margin: 6px 0;
  line-height: 20px;
}

.rule-meta {
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.rule-actions,
.execution-actions {
  display: flex;
  align-items: center;
}

.rule-actions :deep(.el-button + .el-button),
.execution-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.execution-row {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
  min-height: 86px;
  padding: 11px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.execution-status {
  display: grid;
  width: 28px;
  height: 28px;
  font-size: 17px;
  border-radius: 4px;
  place-items: center;
}

.execution-status--adhered {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.execution-status--violated {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.execution-status--not_triggered,
.execution-status--not_judgable {
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
}

.execution-copy p {
  font-size: 12px;
}

.execution-copy > span {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.draft-alert {
  margin-bottom: 14px;
}

.rule-preview {
  padding: 12px 14px;
  margin: 2px 0 16px 92px;
  border: 1px solid var(--el-border-color-light);
  border-left-width: 3px;
}

.rule-preview--draft {
  background: var(--el-fill-color-lighter);
  border-left-color: var(--el-text-color-placeholder);
}

.rule-preview--active {
  background: var(--el-color-primary-light-9);
  border-left-color: var(--el-color-primary);
}

.rule-preview--warning {
  background: var(--el-color-warning-light-9);
  border-left-color: var(--el-color-warning);
}

.rule-preview__heading {
  gap: 8px;
}

.rule-preview__heading > div {
  display: flex;
  flex-direction: column;
}

.rule-preview__heading span {
  margin-top: 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.rule-preview p {
  margin: 9px 0 0;
  font-size: 13px;
  line-height: 21px;
}

.rule-preview__warning {
  gap: 5px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-color-warning-dark-2);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 12px;
}

.form-span-2 {
  grid-column: span 2;
}

.advanced-rules {
  margin: 0 0 16px 92px;
}

.structured-help {
  margin-bottom: 10px;
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
}

.structured-heading {
  margin: 6px 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--el-text-color-secondary);
}

.structured-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(90px, 0.7fr) minmax(130px, 0.8fr) 38px;
  gap: 8px;
  margin-bottom: 12px;
}

.structured-grid :deep(.el-input-number) {
  width: 100%;
}

.metric-unit {
  align-self: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.metric-description {
  display: grid;
  padding: 8px 10px;
  margin: -6px 0 12px;
  font-size: 12px;
  background: var(--el-fill-color-light);
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.metric-description > span {
  min-width: 0;
  color: var(--el-text-color-secondary);
}

.rule-note {
  margin-bottom: 0;
}

.evidence-summary {
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.evidence-summary > span {
  width: 100%;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.evidence-block {
  padding: 16px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.evidence-block h3 {
  margin: 0 0 10px;
  font-size: 14px;
  letter-spacing: 0;
}

.evidence-block :deep(.el-tag) {
  margin: 0 6px 6px 0;
}

.evidence-block pre {
  max-height: 360px;
  padding: 12px;
  overflow: auto;
  font-size: 12px;
  line-height: 20px;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.evidence-block p,
.evidence-block > span {
  font-size: 13px;
  line-height: 21px;
}

.evidence-block > span {
  color: var(--el-text-color-secondary);
}

@media (width <= 1100px) {
  .onboarding-band {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .onboarding-steps {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .rule-layout {
    grid-template-columns: 1fr;
  }

  .execution-library {
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 0;
  }
}

@media (width <= 760px) {
  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .heading-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .rule-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rule-metrics > div:nth-child(odd) {
    border-left: 0;
  }

  .rule-row {
    grid-template-columns: 48px minmax(0, 1fr);
  }

  .rule-actions {
    grid-column: 2;
  }

  .form-grid,
  .structured-grid {
    grid-template-columns: 1fr;
  }

  .form-span-2 {
    grid-column: auto;
  }

  .advanced-rules {
    margin-left: 0;
  }

  .rule-preview {
    margin-left: 0;
  }

  .metric-description {
    grid-template-columns: 1fr;
  }
}

@media (width <= 560px) {
  .onboarding-band,
  .template-row,
  .candidate-row {
    grid-template-columns: 1fr;
  }

  .onboarding-steps {
    grid-column: auto;
    overflow-x: auto;
  }

  .template-row > .el-button,
  .candidate-row > .el-button {
    width: 100%;
  }
}
</style>
