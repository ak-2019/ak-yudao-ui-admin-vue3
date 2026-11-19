<template>
  <Dialog
    v-model="dialogVisible"
    title="交易计划"
    width="min(1120px, calc(100vw - 24px))"
    class="trade-plan-dialog"
  >
    <div class="plan-context-bar">
      <div>
        <strong>{{ contextTitle }}</strong>
        <span>计划建立时间由服务端记录，事后修改不会覆盖原始时间</span>
      </div>
      <el-button
        type="primary"
        :disabled="!contextStockId && !selectedSearchStock"
        v-hasPermi="['finance:stock-trade-plan:create']"
        @click="startCreate"
      >
        <Icon icon="ep:plus" class="mr-5px" />新建计划
      </el-button>
    </div>

    <div class="plan-workspace">
      <aside class="plan-list-pane">
        <div v-if="!fixedStock" class="stock-search-block">
          <span class="pane-label">选择股票</span>
          <el-select
            v-model="selectedSearchStockId"
            filterable
            remote
            clearable
            :remote-method="searchStocks"
            :loading="stockSearchLoading"
            placeholder="搜索股票代码或名称"
            @change="handleSearchStockChange"
          >
            <el-option
              v-for="stock in stockOptions"
              :key="stock.id"
              :label="`${stock.name} · ${stock.code}`"
              :value="stock.id"
            />
          </el-select>
        </div>

        <div class="plan-list-heading">
          <span class="pane-label">已保存计划</span>
          <el-select v-model="statusFilter" clearable placeholder="全部状态" @change="loadPlans">
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>

        <div v-loading="listLoading" class="plan-list">
          <button
            v-for="plan in plans"
            :key="plan.id"
            type="button"
            class="plan-list-item"
            :class="{ 'plan-list-item--active': form.id === plan.id }"
            @click="selectPlan(plan)"
          >
            <span class="plan-list-item__top">
              <strong>{{ plan.name }} · {{ plan.strategyType || '未命名策略' }}</strong>
              <el-tag size="small" effect="plain" :type="statusTypes[plan.status]">
                {{ statusLabels[plan.status] }}
              </el-tag>
            </span>
            <span>{{ plan.code }} · 建立于 {{ formatTime(plan.establishedTime) }}</span>
            <span class="plan-list-item__flags">
              <em v-if="isPlanModified(plan)">事后调整过计划</em>
              <em v-if="plan.reviewModifiedTime">已补充事后复盘</em>
            </span>
          </button>
          <el-empty
            v-if="plans.length === 0 && !listLoading"
            :image-size="60"
            description="暂无计划"
          />
        </div>
      </aside>

      <section class="plan-editor-pane">
        <div v-if="editorReady" class="plan-editor-heading">
          <div>
            <span class="pane-label">{{ form.id ? '编辑计划' : '建立事前计划' }}</span>
            <strong>{{ editorStockLabel }}</strong>
          </div>
          <div v-if="selectedPlan" class="time-audit">
            <el-tag effect="plain" type="success"
              >事前建立 {{ formatTime(selectedPlan.establishedTime) }}</el-tag
            >
            <el-tag v-if="isPlanModified(selectedPlan)" effect="plain" type="warning">
              计划修改 {{ formatTime(selectedPlan.planModifiedTime) }}
            </el-tag>
            <el-tag v-if="selectedPlan.reviewModifiedTime" effect="plain" type="info">
              复盘补录 {{ formatTime(selectedPlan.reviewModifiedTime) }}
            </el-tag>
          </div>
        </div>

        <template v-if="editorReady">
          <section v-if="fixedStock?.trackId" class="ai-plan-panel">
            <div class="ai-plan-panel__heading">
              <div>
                <span class="pane-label">AI 计划助手</span>
                <strong>生成草稿后先审阅，不会自动保存或执行</strong>
              </div>
              <el-button
                type="primary"
                plain
                :loading="recommendationStatus === 'loading'"
                v-hasPermi="['finance:stock-ai-analysis:generate']"
                @click="generateRecommendation"
              >
                <Icon icon="ep:magic-stick" class="mr-5px" />
                {{ recommendation ? '重新生成' : 'AI 推荐计划' }}
              </el-button>
            </div>

            <div v-if="recommendationStatus === 'loading'" class="ai-plan-state">
              <Icon icon="ep:loading" class="is-loading" />
              <div>
                <strong>正在准备单股事实并生成结构化草稿</strong>
                <span>页面可以保持打开，当前表单不会被修改。</span>
              </div>
            </div>

            <el-alert
              v-else-if="recommendationStatus === 'error'"
              type="error"
              :closable="false"
              show-icon
              :title="recommendationError || 'AI 计划草稿生成失败'"
            >
              <template #default> 当前表单已保留，可检查模型或数据状态后重新生成。 </template>
            </el-alert>

            <div v-else-if="recommendation" class="ai-plan-review">
              <div class="ai-plan-meta">
                <el-tag type="primary" effect="plain">AI 草稿</el-tag>
                <el-tag :type="confidenceTagType" effect="plain">
                  {{ confidenceLabel }}
                </el-tag>
                <span>{{ recommendation.modelName }}</span>
                <span>数据截至 {{ formatTime(recommendation.dataAsOf) }}</span>
              </div>

              <div class="ai-plan-summary-grid">
                <div>
                  <span>交易风格</span>
                  <strong>{{ recommendation.draft.tradeStyle || '数据不足' }}</strong>
                </div>
                <div>
                  <span>策略类型</span>
                  <strong>{{ recommendation.draft.strategyType || '数据不足' }}</strong>
                </div>
                <div>
                  <span>计划买入区间</span>
                  <strong>{{ formatRecommendationRange() }}</strong>
                </div>
                <div>
                  <span>止损 / 目标</span>
                  <strong>
                    {{ formatRecommendationNumber(recommendation.draft.stopLossPrice) }} /
                    {{ formatRecommendationNumber(recommendation.draft.targetPrice) }}
                  </strong>
                </div>
              </div>

              <div class="ai-plan-section">
                <span>买入逻辑与执行条件</span>
                <p>{{ recommendation.draft.entryLogic || '数据不足' }}</p>
                <p>触发：{{ recommendation.draft.triggerCondition || '数据不足' }}</p>
                <p>失效：{{ recommendation.draft.invalidationCondition || '数据不足' }}</p>
              </div>

              <div class="ai-plan-columns">
                <div class="ai-plan-section">
                  <span>核心证据</span>
                  <ul>
                    <li v-for="item in recommendation.evidence" :key="item">{{ item }}</li>
                    <li v-if="recommendation.evidence.length === 0">暂无可靠证据</li>
                  </ul>
                </div>
                <div class="ai-plan-section ai-plan-section--risk">
                  <span>主要风险</span>
                  <ul>
                    <li v-for="item in recommendation.risks" :key="item">{{ item }}</li>
                    <li v-if="recommendation.risks.length === 0">暂无结构化风险</li>
                  </ul>
                </div>
              </div>

              <el-collapse
                v-if="recommendation.missingData.length || recommendation.warnings.length"
              >
                <el-collapse-item title="数据缺口与系统校验提示" name="quality">
                  <ul class="quality-list">
                    <li v-for="item in recommendation.missingData" :key="`missing-${item}`">
                      缺失：{{ item }}
                    </li>
                    <li v-for="item in recommendation.warnings" :key="`warning-${item}`">
                      提示：{{ item }}
                    </li>
                  </ul>
                </el-collapse-item>
              </el-collapse>

              <div class="ai-plan-actions">
                <span>填入后仍需点击底部“建立计划/保存修改”才会持久化。</span>
                <el-button type="primary" @click="applyRecommendation">填入计划</el-button>
              </div>
            </div>
          </section>

          <div class="template-strip">
            <span>快捷模板</span>
            <el-button
              v-for="item in templates"
              :key="item.key"
              size="small"
              :type="activeTemplate === item.key ? 'primary' : 'default'"
              :plain="activeTemplate !== item.key"
              @click="applyTemplate(item)"
            >
              {{ item.name }}
            </el-button>
            <small>仅预填结构与示例，不生成价格、止损或仓位</small>
          </div>

          <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
            <div class="form-grid form-grid--three">
              <el-form-item label="计划状态" prop="status">
                <el-select v-model="form.status">
                  <el-option
                    v-for="item in statusOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="交易风格">
                <el-input
                  v-model="form.tradeStyle"
                  maxlength="32"
                  placeholder="如：短线、趋势、波段"
                />
              </el-form-item>
              <el-form-item label="策略类型">
                <el-input
                  v-model="form.strategyType"
                  maxlength="64"
                  placeholder="如：突破、回踩低吸"
                />
              </el-form-item>
            </div>

            <div class="form-grid form-grid--two">
              <el-form-item label="买入逻辑">
                <el-input
                  v-model="form.entryLogic"
                  type="textarea"
                  :rows="3"
                  maxlength="2000"
                  show-word-limit
                  placeholder="为什么买，依赖哪些事实与假设"
                />
              </el-form-item>
              <el-form-item label="触发条件">
                <el-input
                  v-model="form.triggerCondition"
                  type="textarea"
                  :rows="3"
                  maxlength="1000"
                  show-word-limit
                  placeholder="满足什么条件才执行"
                />
              </el-form-item>
            </div>
            <el-form-item label="逻辑失效条件">
              <el-input
                v-model="form.invalidationCondition"
                type="textarea"
                :rows="2"
                maxlength="1000"
                show-word-limit
                placeholder="出现什么事实后放弃该计划"
              />
            </el-form-item>

            <div class="form-grid form-grid--four">
              <el-form-item label="计划买入下限" prop="plannedBuyPriceMin">
                <el-input-number
                  v-model="form.plannedBuyPriceMin"
                  :min="0.001"
                  :precision="3"
                  :controls="false"
                />
              </el-form-item>
              <el-form-item label="计划买入上限" prop="plannedBuyPriceMax">
                <el-input-number
                  v-model="form.plannedBuyPriceMax"
                  :min="0.001"
                  :precision="3"
                  :controls="false"
                />
              </el-form-item>
              <el-form-item label="止损参考" prop="stopLossPrice">
                <el-input-number
                  v-model="form.stopLossPrice"
                  :min="0.001"
                  :precision="3"
                  :controls="false"
                />
              </el-form-item>
              <el-form-item label="目标参考" prop="targetPrice">
                <el-input-number
                  v-model="form.targetPrice"
                  :min="0.001"
                  :precision="3"
                  :controls="false"
                />
              </el-form-item>
            </div>

            <el-collapse v-model="advancedSections" class="advanced-sections">
              <el-collapse-item name="risk" title="风险预算与持有周期">
                <div class="form-grid form-grid--three">
                  <el-form-item label="计划仓位上限（%）" prop="maxPositionRate">
                    <el-input-number
                      v-model="form.maxPositionRate"
                      :min="0"
                      :max="100"
                      :precision="2"
                      :controls="false"
                    />
                  </el-form-item>
                  <el-form-item label="最大可承受亏损">
                    <el-input-number
                      v-model="form.maxLossAmount"
                      :min="0"
                      :precision="3"
                      :controls="false"
                    />
                  </el-form-item>
                  <el-form-item label="计划持有天数">
                    <el-input-number
                      v-model="form.plannedHoldingDays"
                      :min="1"
                      :max="3650"
                      :controls="false"
                    />
                  </el-form-item>
                </div>
              </el-collapse-item>
              <el-collapse-item name="review" title="事后复盘（不会回写事前建立时间）">
                <div class="review-warning">
                  <Icon
                    icon="ep:warning"
                  />以下内容属于事后事实和解释，保存后会单独记录复盘修改时间。
                </div>
                <div class="form-grid form-grid--two">
                  <el-form-item label="实际退出原因">
                    <el-input v-model="form.exitReason" maxlength="500" placeholder="退出后填写" />
                  </el-form-item>
                  <el-form-item label="计划变更原因">
                    <el-input
                      v-model="form.changeReason"
                      maxlength="500"
                      placeholder="修改事前计划时说明原因"
                    />
                  </el-form-item>
                  <el-form-item label="情绪标签">
                    <el-input
                      v-model="form.emotionTag"
                      maxlength="64"
                      placeholder="如：冷静、焦虑、冲动"
                    />
                  </el-form-item>
                  <el-form-item label="复盘备注">
                    <el-input
                      v-model="form.reviewRemark"
                      type="textarea"
                      :rows="2"
                      maxlength="2000"
                      show-word-limit
                    />
                  </el-form-item>
                </div>
              </el-collapse-item>
            </el-collapse>
          </el-form>
        </template>

        <el-empty v-else description="选择股票并新建计划，或从左侧打开已保存计划" />
      </section>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button
          v-if="form.id"
          type="danger"
          plain
          v-hasPermi="['finance:stock-trade-plan:delete']"
          @click="deletePlan"
        >
          <Icon icon="ep:delete" class="mr-5px" />删除计划
        </el-button>
        <span></span>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button
          v-if="editorReady"
          type="primary"
          :loading="submitLoading"
          v-hasPermi="[
            form.id ? 'finance:stock-trade-plan:update' : 'finance:stock-trade-plan:create'
          ]"
          @click="submitPlan"
        >
          {{ form.id ? '保存修改' : '建立计划' }}
        </el-button>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type { FormInstance, FormRules } from 'element-plus'
import { StockApi, type FinanceMarket, type StockSearchVO } from '@/api/finance/stock'
import {
  StockTradePlanApi,
  type StockTradePlanRecommendationDraftVO,
  type StockTradePlanRecommendationVO,
  type StockTradePlanSaveVO,
  type StockTradePlanStatus,
  type StockTradePlanTemplateVO,
  type StockTradePlanVO
} from '@/api/finance/stock/trade-plan'

defineOptions({ name: 'FinanceStockTradePlanDialog' })

export interface StockTradePlanDialogContext {
  trackId?: number
  stockId?: number
  market?: FinanceMarket | null
  code?: string | null
  name?: string | null
  episodeId?: string
}

interface TradePlanForm {
  id?: number
  stockId?: number
  episodeId: string
  status: StockTradePlanStatus
  tradeStyle: string
  strategyType: string
  entryLogic: string
  triggerCondition: string
  invalidationCondition: string
  plannedBuyPriceMin?: number
  plannedBuyPriceMax?: number
  stopLossPrice?: number
  targetPrice?: number
  maxPositionRate?: number
  maxLossAmount?: number
  plannedHoldingDays?: number
  exitReason: string
  changeReason: string
  emotionTag: string
  reviewRemark: string
}

const emit = defineEmits<{ saved: [] }>()
const message = useMessage()
const dialogVisible = ref(false)
const listLoading = ref(false)
const submitLoading = ref(false)
const recommendationStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const recommendation = ref<StockTradePlanRecommendationVO>()
const recommendationError = ref('')
const stockSearchLoading = ref(false)
const fixedStock = ref<StockTradePlanDialogContext>()
const selectedSearchStockId = ref<number>()
const stockOptions = ref<StockSearchVO[]>([])
const plans = ref<StockTradePlanVO[]>([])
const templates = ref<StockTradePlanTemplateVO[]>([])
const statusFilter = ref<StockTradePlanStatus>()
const activeTemplate = ref<string>()
const advancedSections = ref<string[]>([])
const formRef = ref<FormInstance>()
let stockSearchRequestId = 0

const emptyForm = (): TradePlanForm => ({
  episodeId: '',
  status: 'DRAFT',
  tradeStyle: '',
  strategyType: '',
  entryLogic: '',
  triggerCondition: '',
  invalidationCondition: '',
  exitReason: '',
  changeReason: '',
  emotionTag: '',
  reviewRemark: ''
})
const form = reactive<TradePlanForm>(emptyForm())

const statusOptions: Array<{ label: string; value: StockTradePlanStatus }> = [
  { label: '草稿', value: 'DRAFT' },
  { label: '执行中', value: 'ACTIVE' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已归档', value: 'ARCHIVED' }
]
const statusLabels: Record<StockTradePlanStatus, string> = {
  DRAFT: '草稿',
  ACTIVE: '执行中',
  COMPLETED: '已完成',
  ARCHIVED: '已归档'
}
const statusTypes: Record<StockTradePlanStatus, 'info' | 'primary' | 'success' | 'warning'> = {
  DRAFT: 'info',
  ACTIVE: 'primary',
  COMPLETED: 'success',
  ARCHIVED: 'warning'
}

const selectedSearchStock = computed(() =>
  stockOptions.value.find((item) => item.id === selectedSearchStockId.value)
)
const contextStockId = computed(() => fixedStock.value?.stockId)
const queryStockId = computed(() => contextStockId.value || selectedSearchStockId.value)
const selectedPlan = computed(() => plans.value.find((item) => item.id === form.id))
const editorReady = computed(() => Boolean(form.stockId))
const contextTitle = computed(() => {
  if (fixedStock.value?.stockId) {
    return `${fixedStock.value.name || '股票'} · ${fixedStock.value.code || fixedStock.value.stockId}`
  }
  return '个人交易计划库'
})
const editorStockLabel = computed(() => {
  if (selectedPlan.value) return `${selectedPlan.value.name} · ${selectedPlan.value.code}`
  if (fixedStock.value?.stockId) return contextTitle.value
  const stock = selectedSearchStock.value
  return stock ? `${stock.name} · ${stock.code}` : '未选择股票'
})
const confidenceLabel = computed(() => {
  const labels = { HIGH: '高置信度', MEDIUM: '中置信度', LOW: '低置信度' }
  return recommendation.value ? labels[recommendation.value.confidence] : '低置信度'
})
const confidenceTagType = computed<'success' | 'warning' | 'info'>(() => {
  if (recommendation.value?.confidence === 'HIGH') return 'success'
  if (recommendation.value?.confidence === 'MEDIUM') return 'warning'
  return 'info'
})

const validateBuyRange = (_rule: unknown, _value: unknown, callback: (error?: Error) => void) => {
  if (
    form.plannedBuyPriceMin != null &&
    form.plannedBuyPriceMax != null &&
    form.plannedBuyPriceMin > form.plannedBuyPriceMax
  ) {
    callback(new Error('计划买入下限不能高于上限'))
    return
  }
  callback()
}
const validateTarget = (_rule: unknown, _value: unknown, callback: (error?: Error) => void) => {
  if (
    form.stopLossPrice != null &&
    form.targetPrice != null &&
    form.stopLossPrice >= form.targetPrice
  ) {
    callback(new Error('止损参考必须低于目标参考'))
    return
  }
  callback()
}
const rules: FormRules<TradePlanForm> = {
  status: [{ required: true, message: '请选择计划状态', trigger: 'change' }],
  plannedBuyPriceMin: [{ validator: validateBuyRange, trigger: 'change' }],
  plannedBuyPriceMax: [{ validator: validateBuyRange, trigger: 'change' }],
  stopLossPrice: [{ validator: validateTarget, trigger: 'change' }],
  targetPrice: [{ validator: validateTarget, trigger: 'change' }]
}

const resetForm = (stockId?: number, episodeId?: string) => {
  Object.assign(form, emptyForm(), { stockId, episodeId: episodeId || '' })
  activeTemplate.value = undefined
  advancedSections.value = []
  nextTick(() => formRef.value?.clearValidate())
}

const resetRecommendation = () => {
  recommendationStatus.value = 'idle'
  recommendation.value = undefined
  recommendationError.value = ''
}

const loadPlans = async () => {
  listLoading.value = true
  try {
    plans.value = await StockTradePlanApi.getList({
      stockId: queryStockId.value,
      status: statusFilter.value
    })
  } finally {
    listLoading.value = false
  }
}

const loadTemplates = async () => {
  if (templates.value.length === 0) templates.value = await StockTradePlanApi.getTemplates()
}

const open = async (context?: StockTradePlanDialogContext) => {
  fixedStock.value = context?.stockId ? context : undefined
  selectedSearchStockId.value = undefined
  stockOptions.value = []
  statusFilter.value = undefined
  resetForm(context?.stockId, context?.episodeId)
  resetRecommendation()
  dialogVisible.value = true
  await Promise.all([loadPlans(), loadTemplates()])
}

const startCreate = () => resetForm(queryStockId.value, fixedStock.value?.episodeId)

const generateRecommendation = async () => {
  const trackId = fixedStock.value?.trackId
  if (!trackId || recommendationStatus.value === 'loading') return
  recommendationStatus.value = 'loading'
  recommendationError.value = ''
  try {
    recommendation.value = await StockTradePlanApi.recommend(trackId)
    recommendationStatus.value = 'success'
  } catch (error) {
    recommendationStatus.value = 'error'
    recommendationError.value = error instanceof Error ? error.message : 'AI 计划草稿生成失败'
  }
}

const draftFieldKeys: Array<keyof StockTradePlanRecommendationDraftVO> = [
  'tradeStyle',
  'strategyType',
  'entryLogic',
  'triggerCondition',
  'invalidationCondition',
  'plannedBuyPriceMin',
  'plannedBuyPriceMax',
  'stopLossPrice',
  'targetPrice',
  'maxPositionRate',
  'maxLossAmount',
  'plannedHoldingDays'
]

const isEmptyValue = (value: unknown) => value === undefined || value === null || value === ''

const fillRecommendation = (overwrite: boolean) => {
  const draft = recommendation.value?.draft
  if (!draft) return
  draftFieldKeys.forEach((key) => {
    const nextValue = draft[key]
    if (nextValue == null || (!overwrite && !isEmptyValue(form[key]))) return
    ;(form[key] as string | number | undefined) = nextValue
  })
  form.status = 'DRAFT'
  advancedSections.value = Array.from(new Set([...advancedSections.value, 'risk']))
  nextTick(() => formRef.value?.clearValidate())
}

const applyRecommendation = async () => {
  if (!recommendation.value) return
  const hasConflict = draftFieldKeys.some(
    (key) => recommendation.value?.draft[key] != null && !isEmptyValue(form[key])
  )
  if (!hasConflict) {
    fillRecommendation(false)
    message.success('AI 草稿已填入，请审阅后手动保存')
    return
  }
  try {
    await message.confirm(
      '当前计划已有内容。确定使用 AI 草稿覆盖已有计划字段吗？事后复盘字段不会被覆盖。'
    )
    fillRecommendation(true)
    message.success('AI 草稿已覆盖计划字段，请审阅后手动保存')
  } catch {
    fillRecommendation(false)
    message.success('AI 草稿仅填入原先为空的字段，请审阅后手动保存')
  }
}

const formatRecommendationNumber = (value?: number | null) =>
  value == null ? '数据不足' : value.toFixed(3)

const formatRecommendationRange = () => {
  const draft = recommendation.value?.draft
  if (!draft) return '数据不足'
  const min = formatRecommendationNumber(draft.plannedBuyPriceMin)
  const max = formatRecommendationNumber(draft.plannedBuyPriceMax)
  return min === '数据不足' && max === '数据不足' ? min : `${min} - ${max}`
}

const selectPlan = (plan: StockTradePlanVO) => {
  Object.assign(form, {
    id: plan.id,
    stockId: plan.stockId,
    episodeId: plan.episodeId || '',
    status: plan.status,
    tradeStyle: plan.tradeStyle || '',
    strategyType: plan.strategyType || '',
    entryLogic: plan.entryLogic || '',
    triggerCondition: plan.triggerCondition || '',
    invalidationCondition: plan.invalidationCondition || '',
    plannedBuyPriceMin: plan.plannedBuyPriceMin ?? undefined,
    plannedBuyPriceMax: plan.plannedBuyPriceMax ?? undefined,
    stopLossPrice: plan.stopLossPrice ?? undefined,
    targetPrice: plan.targetPrice ?? undefined,
    maxPositionRate: plan.maxPositionRate ?? undefined,
    maxLossAmount: plan.maxLossAmount ?? undefined,
    plannedHoldingDays: plan.plannedHoldingDays ?? undefined,
    exitReason: plan.exitReason || '',
    changeReason: plan.changeReason || '',
    emotionTag: plan.emotionTag || '',
    reviewRemark: plan.reviewRemark || ''
  })
  activeTemplate.value = undefined
  advancedSections.value = [
    ...(plan.maxPositionRate != null ||
    plan.maxLossAmount != null ||
    plan.plannedHoldingDays != null
      ? ['risk']
      : []),
    ...(plan.reviewModifiedTime ? ['review'] : [])
  ]
  nextTick(() => formRef.value?.clearValidate())
}

const applyTemplate = (template: StockTradePlanTemplateVO) => {
  activeTemplate.value = template.key
  form.strategyType = template.strategyType
  form.entryLogic = `${template.name}：请补充本次计划的事实依据与执行逻辑`
  form.triggerCondition = template.triggerExample
  form.invalidationCondition = template.invalidationExample
}

const searchStocks = async (keyword: string) => {
  const normalized = keyword.trim()
  const requestId = ++stockSearchRequestId
  if (!normalized) {
    stockOptions.value = []
    return
  }
  stockSearchLoading.value = true
  try {
    const result = await StockApi.search({ keyword: normalized })
    if (requestId === stockSearchRequestId) stockOptions.value = result
  } finally {
    if (requestId === stockSearchRequestId) stockSearchLoading.value = false
  }
}

const handleSearchStockChange = async () => {
  resetForm(selectedSearchStockId.value)
  await loadPlans()
}

const optionalText = (value: string) => value.trim() || undefined
const buildPayload = (): StockTradePlanSaveVO => ({
  stockId: form.stockId!,
  status: form.status,
  episodeId: optionalText(form.episodeId),
  tradeStyle: optionalText(form.tradeStyle),
  strategyType: optionalText(form.strategyType),
  entryLogic: optionalText(form.entryLogic),
  triggerCondition: optionalText(form.triggerCondition),
  invalidationCondition: optionalText(form.invalidationCondition),
  plannedBuyPriceMin: form.plannedBuyPriceMin,
  plannedBuyPriceMax: form.plannedBuyPriceMax,
  stopLossPrice: form.stopLossPrice,
  targetPrice: form.targetPrice,
  maxPositionRate: form.maxPositionRate,
  maxLossAmount: form.maxLossAmount,
  plannedHoldingDays: form.plannedHoldingDays,
  exitReason: optionalText(form.exitReason),
  changeReason: optionalText(form.changeReason),
  emotionTag: optionalText(form.emotionTag),
  reviewRemark: optionalText(form.reviewRemark)
})

const submitPlan = async () => {
  if (!form.stockId || !(await formRef.value?.validate())) return
  submitLoading.value = true
  try {
    let savedId = form.id
    if (form.id) {
      await StockTradePlanApi.update({ id: form.id, ...buildPayload() })
      message.success('交易计划已更新，原始建立时间保持不变')
    } else {
      savedId = await StockTradePlanApi.create(buildPayload())
      message.success('事前交易计划已建立')
    }
    await loadPlans()
    const saved = plans.value.find((item) => item.id === savedId)
    if (saved) selectPlan(saved)
    emit('saved')
  } finally {
    submitLoading.value = false
  }
}

const deletePlan = async () => {
  if (!form.id) return
  await message.delConfirm('确定删除该交易计划吗？历史成交和持仓数据不会受影响。')
  await StockTradePlanApi.delete(form.id)
  message.success('交易计划已删除')
  resetForm(queryStockId.value, fixedStock.value?.episodeId)
  await loadPlans()
  emit('saved')
}

const isPlanModified = (plan: StockTradePlanVO) =>
  dayjs(plan.planModifiedTime).diff(dayjs(plan.establishedTime), 'second') > 0
const formatTime = (value?: string | null) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '--'

defineExpose({ open })
</script>

<style scoped>
.plan-context-bar,
.plan-list-heading,
.plan-list-item__top,
.plan-editor-heading,
.ai-plan-panel__heading,
.ai-plan-state,
.ai-plan-meta,
.ai-plan-actions,
.template-strip,
.dialog-footer,
.time-audit,
.review-warning {
  display: flex;
  align-items: center;
}

.plan-context-bar {
  justify-content: space-between;
  gap: 16px;
  padding: 10px 12px;
  margin-bottom: 12px;
  background: var(--el-fill-color-light);
  border-left: 3px solid var(--el-color-primary);
}

.plan-context-bar strong,
.plan-context-bar span {
  display: block;
}

.plan-context-bar span {
  margin-top: 3px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.plan-workspace {
  display: grid;
  grid-template-columns: minmax(250px, 0.34fr) minmax(0, 1fr);
  min-height: 560px;
  border: 1px solid var(--el-border-color-light);
}

.plan-list-pane {
  min-width: 0;
  padding: 14px;
  background: var(--el-fill-color-extra-light);
  border-right: 1px solid var(--el-border-color-light);
}

.stock-search-block {
  margin-bottom: 16px;
}

.stock-search-block .el-select,
.form-grid .el-select,
.form-grid .el-input-number {
  width: 100%;
}

.pane-label {
  display: block;
  margin-bottom: 7px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.plan-list-heading {
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.plan-list-heading .pane-label {
  margin: 0;
}

.plan-list-heading .el-select {
  width: 112px;
}

.plan-list {
  max-height: 510px;
  min-height: 300px;
  overflow-y: auto;
}

.plan-list-item {
  width: 100%;
  padding: 11px 10px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.plan-list-item:hover,
.plan-list-item--active {
  background: var(--el-color-primary-light-9);
}

.plan-list-item--active {
  box-shadow: inset 3px 0 0 var(--el-color-primary);
}

.plan-list-item__top {
  justify-content: space-between;
  gap: 6px;
}

.plan-list-item > span:not(.plan-list-item__top) {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.plan-list-item__flags {
  min-height: 16px;
}

.plan-list-item__flags em {
  margin-right: 8px;
  font-style: normal;
  color: var(--el-color-warning);
}

.plan-editor-pane {
  min-width: 0;
  padding: 16px 18px;
  overflow-x: hidden;
}

.plan-editor-heading {
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.plan-editor-heading .pane-label {
  margin-bottom: 4px;
}

.time-audit {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.ai-plan-panel {
  padding: 14px;
  margin-top: 14px;
  background: var(--el-bg-color-page);
  border: 1px solid var(--el-color-primary-light-7);
  border-left: 3px solid var(--el-color-primary);
}

.ai-plan-panel__heading {
  justify-content: space-between;
  gap: 12px;
}

.ai-plan-panel__heading .pane-label {
  margin-bottom: 4px;
}

.ai-plan-state {
  gap: 10px;
  padding: 18px 4px 4px;
  color: var(--el-color-primary);
}

.ai-plan-state svg {
  flex: 0 0 auto;
  font-size: 24px;
}

.ai-plan-state strong,
.ai-plan-state span {
  display: block;
}

.ai-plan-state span,
.ai-plan-meta,
.ai-plan-actions > span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.ai-plan-review {
  padding-top: 12px;
}

.ai-plan-meta {
  flex-wrap: wrap;
  gap: 8px;
}

.ai-plan-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.ai-plan-summary-grid > div {
  min-width: 0;
  padding: 9px 10px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.ai-plan-summary-grid span,
.ai-plan-summary-grid strong {
  display: block;
  overflow-wrap: anywhere;
}

.ai-plan-summary-grid span,
.ai-plan-section > span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.ai-plan-summary-grid strong {
  margin-top: 4px;
  font-size: 13px;
}

.ai-plan-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.ai-plan-section {
  padding: 10px;
  margin-top: 10px;
  background: var(--el-bg-color);
  border-left: 3px solid var(--el-color-success);
}

.ai-plan-section--risk {
  border-left-color: var(--el-color-danger);
}

.ai-plan-section p {
  margin: 5px 0 0;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.ai-plan-section ul,
.quality-list {
  padding-left: 18px;
  margin: 6px 0 0;
}

.ai-plan-section li,
.quality-list li {
  margin: 4px 0;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.ai-plan-actions {
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  margin-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.template-strip {
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 0 4px;
}

.template-strip > span {
  margin-right: 2px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.template-strip small {
  flex: 1 1 180px;
  color: var(--el-text-color-placeholder);
}

.form-grid {
  display: grid;
  gap: 0 14px;
}

.form-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.form-grid--four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.advanced-sections {
  border-top: 1px solid var(--el-border-color-lighter);
}

.review-warning {
  gap: 6px;
  padding: 8px 10px;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-9);
}

.dialog-footer {
  width: 100%;
  gap: 10px;
}

.dialog-footer > span {
  flex: 1;
}

@media (width <= 760px) {
  .plan-context-bar,
  .plan-editor-heading,
  .ai-plan-panel__heading,
  .ai-plan-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .plan-context-bar .el-button {
    width: 100%;
  }

  .plan-workspace {
    display: block;
    min-height: 0;
  }

  .plan-list-pane {
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  .plan-list {
    max-height: 220px;
  }

  .time-audit {
    justify-content: flex-start;
  }

  .form-grid--two,
  .form-grid--three,
  .form-grid--four,
  .ai-plan-summary-grid,
  .ai-plan-columns {
    grid-template-columns: 1fr;
  }

  .ai-plan-panel__heading .el-button,
  .ai-plan-actions .el-button {
    width: 100%;
  }

  .dialog-footer {
    flex-wrap: wrap;
  }

  .dialog-footer > span {
    display: none;
  }
}
</style>
