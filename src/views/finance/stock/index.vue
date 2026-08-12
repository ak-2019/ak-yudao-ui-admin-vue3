<template>
  <StockWorkspaceNav />
  <ContentWrap>
    <StockWorkspaceHeader
      v-model:selected-keys="selectedStockKeys"
      :active-group-name="activeGroup?.name"
      :stock-count="activeGroupTracks.length"
      :active-tracking-count="activeTrackingCount"
      :quote-issue-count="activeGroupQuoteIssueCount"
      :can-manage-tags="canUpdateGroup"
      :loading="loading || refreshLoading"
      :search-loading="searchLoading"
      :search-hint="stockSearchHint"
      :search-options="searchOptions"
      @manage-tags="stockTagManageRef?.open()"
      @refresh="handleWorkspaceRefresh"
      @search="searchStocks"
      @add="openStockPoolAdd"
      @image-add="stockImageAddRef?.open()"
    />

    <StockFilterPanel
      v-model:expanded="filterExpanded"
      v-model:province="selectedProvince"
      v-model:city="selectedCity"
      v-model:industry="selectedIndustry"
      v-model:tag-ids="selectedTagIds"
      v-model:tag-mode="tagMatchMode"
      v-model:date-range="trackingDateRange"
      :advanced-filter-count="advancedFilterCount"
      :active-filter-chips="activeFilterChips"
      :has-list-filters="hasListFilters"
      :province-options="provinceOptions"
      :city-options="cityOptions"
      :industry-options="industryOptions"
      :tags="tags"
      :tag-match-options="tagMatchOptions"
      :date-shortcuts="financeDateRangeShortcuts"
      @clear-chip="clearFilterChip"
      @reset="resetFilters"
    />

    <StockStatisticsSummary
      :win-rate="globalStatistics?.winRate"
      :sample-count="globalStatistics?.sampleCount ?? 0"
      :win-count="globalStatistics?.winCount ?? 0"
      :loss-count="globalStatistics?.lossCount ?? 0"
      :flat-count="globalStatistics?.flatCount ?? 0"
      :total="statisticsTotal"
      :distribution="statisticsDistribution"
      :visible-count="displayList.length"
      :active-tracking-count="visibleActiveTrackingCount"
      :average-cumulative-change="visibleAverageCumulativeChange"
      :quote-issue-count="visibleQuoteIssueCount"
    />
  </ContentWrap>

  <ContentWrap>
    <div class="group-tabs-row">
      <el-tabs v-model="activeGroupId" class="group-tabs">
        <el-tab-pane v-for="group in groups" :key="group.id" :name="group.id">
          <template #label>
            <span class="group-tab-label">
              <el-tooltip v-if="group.fixed" content="系统固定分组" placement="top">
                <Icon icon="ep:lock" class="group-tab-fixed-icon" />
              </el-tooltip>
              <span>{{ group.name }}</span>
              <span class="group-tab-count">{{ groupStockCounts.get(group.id) ?? 0 }}</span>
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>
      <div v-if="canUpdateGroup" class="group-actions">
        <el-tooltip content="新建分组" placement="top">
          <el-button circle aria-label="新建分组" @click="openCreateGroup">
            <Icon icon="ep:plus" />
          </el-button>
        </el-tooltip>
        <el-tooltip content="重命名当前分组" placement="top">
          <el-button
            circle
            aria-label="重命名当前分组"
            :disabled="!activeGroup || activeGroup.fixed"
            @click="openEditGroup"
          >
            <Icon icon="ep:edit" />
          </el-button>
        </el-tooltip>
        <el-tooltip content="删除当前分组" placement="top">
          <el-button
            circle
            type="danger"
            aria-label="删除当前分组"
            :disabled="!activeGroup || activeGroup.fixed || groups.length <= 1"
            @click="handleDeleteGroup"
          >
            <Icon icon="ep:delete" />
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <div class="group-workbar">
      <div class="group-workbar__scope">
        <el-segmented v-model="groupViewMode" :options="groupViewOptions" />
        <template v-if="groupViewMode === 'stocks'">
          <span class="group-result-summary">
            显示 <strong>{{ displayList.length }}</strong> / {{ activeGroupTracks.length }} 只
          </span>
          <el-segmented
            v-model="stockScopeFilter"
            :options="stockScopeOptions"
            class="stock-scope-filter"
          />
        </template>
      </div>
      <div class="group-workbar__tools">
        <el-segmented
          v-if="groupViewMode === 'stocks'"
          v-model="tableDensity"
          :options="tableDensityOptions"
          class="table-density-control"
        />
        <el-popover
          v-if="groupViewMode === 'stocks'"
          placement="bottom-end"
          width="min(420px, calc(100vw - 32px))"
          trigger="click"
        >
          <template #reference>
            <el-button>
              <Icon icon="ep:operation" class="mr-5px" />
              列设置
              <el-tag class="ml-6px" size="small" type="info" effect="plain">
                {{ visibleTableColumns.length }}
              </el-tag>
            </el-button>
          </template>
          <div class="column-settings">
            <div class="column-settings__heading">
              <strong>显示字段</strong>
              <span>{{ visibleTableColumns.length }} / {{ defaultTableColumns.length }}</span>
            </div>
            <el-checkbox-group
              v-model="visibleColumnKeys"
              class="column-settings__grid"
              @change="handleVisibleColumnsChanged"
            >
              <el-checkbox
                v-for="column in defaultTableColumns"
                :key="column.key"
                :value="column.key"
              >
                {{ column.label }}
              </el-checkbox>
            </el-checkbox-group>
            <div class="column-settings__actions">
              <el-button link type="primary" @click="applyColumnPreset('core')">
                核心字段
              </el-button>
              <el-button link type="primary" @click="applyColumnPreset('tracking')">
                跟踪分析
              </el-button>
              <el-button link type="primary" @click="showAllColumns">全部字段</el-button>
              <el-button link @click="resetColumnLayout">恢复默认</el-button>
            </div>
          </div>
        </el-popover>
        <el-dropdown
          v-if="canSyncTechnicalData || canSyncStockProfile || canSyncInformation"
          trigger="click"
          :disabled="dataSyncDisabled"
          @command="handleDataSyncCommand"
        >
          <el-button :loading="syncIndustryLoading || syncInformationLoading">
            <Icon icon="ep:refresh" class="mr-5px" />
            数据同步
            <Icon icon="ep:arrow-down" class="ml-5px" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-if="canSyncTechnicalData"
                command="market"
                :disabled="marketSyncTracks.length === 0"
              >
                <Icon icon="ep:data-line" class="mr-8px" />
                同步行情技术
                <el-tag class="ml-8px" size="small" type="info" effect="plain">
                  {{ marketSyncScopeLabel }}
                </el-tag>
              </el-dropdown-item>
              <el-dropdown-item
                v-if="canSyncStockProfile"
                command="profile"
                :divided="canSyncTechnicalData"
              >
                <Icon icon="ep:connection" class="mr-8px" />
                同步地域行业
                <el-tag class="ml-8px" size="small" type="info" effect="plain">
                  {{ profileSyncScopeLabel }}
                </el-tag>
              </el-dropdown-item>
              <el-dropdown-item
                v-if="canSyncInformation"
                command="information"
                :divided="canSyncTechnicalData || canSyncStockProfile"
                :disabled="activeGroupId === undefined || activeGroupTracks.length === 0"
              >
                <Icon icon="ep:document" class="mr-8px" />
                同步资讯公告研报
                <el-tag class="ml-8px" size="small" type="info" effect="plain">
                  {{ informationSyncScopeLabel }}
                </el-tag>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div v-if="groupViewMode === 'stocks' && selectedTracks.length > 0" class="selection-bar">
      <div class="selection-bar__summary">
        <Icon icon="ep:select" />
        <span>{{ activeGroup?.name || '当前分组' }}</span>
        <strong>{{ selectedTracks.length }}</strong> 只已选
      </div>
      <div class="selection-bar__actions">
        <el-button v-hasPermi="['finance:stock-track:update']" @click="openBatchTrackingPeriod">
          <Icon icon="ep:calendar" class="mr-5px" />
          设置或清空日期
        </el-button>
        <el-button v-hasPermi="['finance:stock-track:update']" @click="openBatchTagAssign">
          <Icon icon="ep:price-tag" class="mr-5px" />
          设置标签
        </el-button>
        <el-button v-hasPermi="['finance:stock-track:update']" @click="openBatchGroupAssign">
          <Icon icon="ep:collection-tag" class="mr-5px" />
          批量分组
        </el-button>
        <el-tooltip content="取消选择" placement="top">
          <el-button circle aria-label="取消选择" @click="clearTrackSelection">
            <Icon icon="ep:close" />
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <el-table
      v-if="groupViewMode === 'stocks'"
      :key="tableRenderKey"
      ref="stockTableRef"
      v-loading="loading"
      :class="['stock-table', `stock-table--${tableDensity}`]"
      :data="displayList"
      :size="tableDensity === 'compact' ? 'small' : 'default'"
      row-key="id"
      stripe
      table-layout="fixed"
      :empty-text="tableEmptyText"
      :row-class-name="stockRowClassName"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
    >
      <el-table-column type="selection" width="48" fixed reserve-selection />
      <el-table-column
        v-for="column in visibleTableColumns"
        :key="column.key"
        :prop="column.key"
        :label="column.label"
        :width="column.width"
        :min-width="column.minWidth"
        :align="column.align"
        :show-overflow-tooltip="column.showOverflowTooltip"
        sortable="custom"
        header-class-name="stock-draggable-column"
      >
        <template #header>
          <span class="stock-column-header">
            <el-tooltip content="拖动调整列顺序" placement="top">
              <Icon
                icon="ep:rank"
                class="stock-column-drag-handle"
                aria-hidden="true"
                @click.stop
              />
            </el-tooltip>
            <span>{{ column.label }}</span>
          </span>
        </template>
        <template #default="{ row }">
          <el-button
            v-if="column.key === 'name'"
            link
            class="stock-name-link"
            @click="openDetail(row)"
          >
            <span class="stock-name">{{ row.name }}</span>
            <span class="stock-name-link__code">{{ row.symbol }}</span>
          </el-button>
          <span v-else-if="column.key === 'symbol'" class="stock-code">{{ row.symbol }}</span>
          <template v-else-if="column.key === 'province'">{{ row.province || '--' }}</template>
          <template v-else-if="column.key === 'city'">{{ row.city || '--' }}</template>
          <template v-else-if="column.key === 'industry'">{{ row.industry || '--' }}</template>
          <div v-else-if="column.key === 'tags'" class="stock-tags">
            <el-tag
              v-for="tag in row.tags"
              :key="tag.id"
              size="small"
              effect="plain"
              :style="tagStyle(tag.color)"
            >
              {{ tag.name }}
            </el-tag>
            <span v-if="row.tags.length === 0">--</span>
          </div>
          <template v-else-if="column.key === 'market'">{{ marketLabels[row.market] }}</template>
          <div
            v-else-if="column.key === 'trackingStartDate'"
            :class="['tracking-cell', { 'tracking-cell--empty': !row.trackingStartDate }]"
          >
            <Icon icon="ep:calendar" />
            <span>{{ row.trackingStartDate || '未设置' }}</span>
          </div>
          <el-tag
            v-else-if="column.key === 'trackingEndDate' && row.trackingStartDate"
            :type="row.trackingEndDate ? 'info' : 'success'"
            size="small"
            effect="plain"
          >
            {{ row.trackingEndDate || '持续跟踪' }}
          </el-tag>
          <span v-else-if="column.key === 'trackingEndDate'" class="muted-value">未设置</span>
          <template v-else-if="column.key === 'openPrice'">
            {{ formatPrice(row.quote?.data?.openPrice) }}
          </template>
          <span
            v-else-if="column.key === 'latestPrice'"
            :class="changeClass(row.quote?.data?.changeAmount)"
          >
            {{ formatPrice(row.quote?.data?.latestPrice) }}
          </span>
          <template v-else-if="column.key === 'highPrice'">
            {{ formatPrice(row.quote?.data?.highPrice) }}
          </template>
          <template v-else-if="column.key === 'lowPrice'">
            {{ formatPrice(row.quote?.data?.lowPrice) }}
          </template>
          <span
            v-else-if="column.key === 'changePercent'"
            :class="['change-pill', changeClass(row.quote?.data?.changePercent)]"
          >
            {{ formatPercent(row.quote?.data?.changePercent) }}
          </span>
          <span
            v-else-if="column.key === 'fiveDayChangePercent'"
            :class="['change-pill', changeClass(row.priceChange?.fiveDayChangePercent)]"
          >
            {{ formatPercent(row.priceChange?.fiveDayChangePercent) }}
          </span>
          <span
            v-else-if="column.key === 'tenDayChangePercent'"
            :class="['change-pill', changeClass(row.priceChange?.tenDayChangePercent)]"
          >
            {{ formatPercent(row.priceChange?.tenDayChangePercent) }}
          </span>
          <span
            v-else-if="column.key === 'trackingCumulativeChangePercent'"
            :class="[
              'change-pill',
              'change-pill--strong',
              changeClass(row.priceChange?.trackingCumulativeChangePercent)
            ]"
          >
            {{ formatPercent(row.priceChange?.trackingCumulativeChangePercent) }}
          </span>
          <el-tag
            v-if="column.key === 'quoteStatus' && row.quoteLoading"
            type="info"
            effect="plain"
            size="small"
          >
            更新中
          </el-tag>
          <el-tag
            v-else-if="column.key === 'quoteStatus'"
            :type="statusTagType(row.quote?.status)"
            effect="plain"
            size="small"
          >
            {{ statusLabel(row.quote?.status) }}
          </el-tag>
          <template v-else-if="column.key === 'quoteTime'">
            {{ formatDateTime(row.quote?.sourceTime) }}
          </template>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="142" align="center" fixed="right">
        <template #default="{ row }">
          <div class="row-actions">
            <el-tooltip content="查看股票详情" placement="top">
              <el-button
                link
                type="primary"
                aria-label="查看股票详情"
                v-hasPermi="['finance:stock-track:query']"
                @click="openDetail(row)"
              >
                <Icon icon="ep:view" />
              </el-button>
            </el-tooltip>
            <el-tooltip content="AI 单股分析" placement="top">
              <el-button
                link
                type="success"
                aria-label="AI 单股分析"
                v-hasPermi="['finance:stock-ai-analysis:generate']"
                @click="openSingleAi(row)"
              >
                <Icon icon="ep:magic-stick" />
              </el-button>
            </el-tooltip>
            <el-dropdown
              v-if="canUpdateGroup || canDeleteTrack"
              trigger="click"
              @command="(command: StockRowCommand) => handleRowCommand(command, row)"
            >
              <el-button link type="primary" aria-label="更多股票操作">
                <Icon icon="ep:more-filled" />
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="canUpdateGroup" command="group">
                    <Icon icon="ep:collection-tag" class="mr-5px" />
                    设置分组
                  </el-dropdown-item>
                  <el-dropdown-item v-if="canUpdateGroup" command="tag">
                    <Icon icon="ep:price-tag" class="mr-5px" />
                    设置标签
                  </el-dropdown-item>
                  <el-dropdown-item v-if="canUpdateGroup" command="tracking">
                    <Icon icon="ep:calendar" class="mr-5px" />
                    设置或清空日期
                  </el-dropdown-item>
                  <el-dropdown-item v-if="canDeleteTrack" command="delete" divided>
                    <span class="danger-command">
                      <Icon icon="ep:delete" class="mr-5px" />
                      删除跟踪
                    </span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <GroupInformationPanel
      ref="groupInformationRef"
      v-else
      :active="groupViewMode === 'information'"
      :group-id="activeGroupId"
      :tracks="activeGroupTracks"
    />
  </ContentWrap>

  <el-alert
    class="investment-disclaimer"
    type="warning"
    :closable="false"
    show-icon
    title="行情、资讯和统计数据仅供参考，不构成投资建议。手工记录与外部市场数据已分别标记。"
  />

  <StockDetailDrawer ref="detailRef" @changed="getList" />
  <StockAiSingleAnalysisDrawer ref="aiSingleAnalysisRef" />
  <BatchStockPoolAddDialog ref="batchStockPoolAddRef" @finished="handleStockPoolAdded" />
  <StockImageAddDialog
    ref="stockImageAddRef"
    :tracked-symbols="trackedSymbols"
    @recognized="handleImageCandidates"
  />
  <BatchHistoryImportDialog ref="batchHistoryImportRef" @success="handleBatchUpdated" />
  <BatchTrackingPeriodDialog ref="batchTrackingPeriodRef" @success="handleBatchUpdated" />
  <StockGroupBatchAssignDialog ref="stockGroupBatchAssignRef" @success="handleBatchUpdated" />
  <StockTagManageDialog ref="stockTagManageRef" @changed="handleTagsChanged" />
  <StockTagAssignDialog ref="stockTagAssignRef" @success="handleTagsAssigned" />

  <el-dialog
    v-model="groupDialogVisible"
    :title="groupDialogMode === 'create' ? '新建分组' : '编辑分组'"
    width="min(420px, calc(100vw - 32px))"
    destroy-on-close
  >
    <el-form label-width="72px" @submit.prevent="submitGroup">
      <el-form-item label="名称" required>
        <el-input
          v-model="groupForm.name"
          maxlength="64"
          show-word-limit
          placeholder="请输入分组名称"
          @keyup.enter="submitGroup"
        />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number
          v-model="groupForm.sort"
          :min="0"
          :max="999999"
          controls-position="right"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="groupDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="groupSubmitLoading" @click="submitGroup">确定</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="assignDialogVisible"
    title="设置所属分组"
    width="min(480px, calc(100vw - 32px))"
    destroy-on-close
  >
    <div v-if="assigningTrack" class="assign-stock">
      <span class="stock-name">{{ assigningTrack.name }}</span>
      <span class="stock-code">{{ assigningTrack.symbol }}</span>
    </div>
    <el-checkbox-group v-model="assigningGroupIds" class="group-assign-options">
      <el-checkbox
        v-for="group in groups"
        :key="group.id"
        :value="group.id"
        :disabled="isManagedMembershipGroup(group)"
        border
      >
        <span>{{ group.name }}</span>
        <el-tag
          v-if="isManagedMembershipGroup(group)"
          class="ml-6px"
          size="small"
          type="info"
          effect="plain"
        >
          自动
        </el-tag>
      </el-checkbox>
    </el-checkbox-group>
    <template #footer>
      <el-button @click="assignDialogVisible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="assignSubmitLoading"
        :disabled="assigningGroupIds.length === 0"
        @click="submitGroupAssign"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import Sortable from 'sortablejs'
import { checkPermi } from '@/utils/permission'
import { financeDateRangeShortcuts } from '@/views/finance/utils/dateShortcuts'
import {
  FinanceMarket,
  MarketDataResult,
  MarketDataStatus,
  StockApi,
  StockGroupVO,
  StockIndustrySyncVO,
  StockMarketSearchVO,
  StockQuoteVO,
  StockPriceChangeVO,
  StockSearchVO,
  StockTagVO,
  StockTrackVO,
  StockWinRateVO
} from '@/api/finance/stock'
import BatchHistoryImportDialog from './components/BatchHistoryImportDialog.vue'
import BatchStockPoolAddDialog, {
  type StockPoolAddCandidate
} from './components/BatchStockPoolAddDialog.vue'
import BatchTrackingPeriodDialog from './components/BatchTrackingPeriodDialog.vue'
import GroupInformationPanel from './components/GroupInformationPanel.vue'
import StockGroupBatchAssignDialog from './components/StockGroupBatchAssignDialog.vue'
import StockDetailDrawer from './components/StockDetailDrawer.vue'
import StockAiSingleAnalysisDrawer from './components/StockAiSingleAnalysisDrawer.vue'
import StockTagAssignDialog from './components/StockTagAssignDialog.vue'
import StockTagManageDialog from './components/StockTagManageDialog.vue'
import StockFilterPanel from './components/StockFilterPanel.vue'
import StockImageAddDialog from './components/StockImageAddDialog.vue'
import StockStatisticsSummary from './components/StockStatisticsSummary.vue'
import StockWorkspaceHeader from './components/StockWorkspaceHeader.vue'
import StockWorkspaceNav from './components/StockWorkspaceNav.vue'
import { useStockWorkspaceCache } from './composables/useStockWorkspaceCache'

defineOptions({ name: 'FinanceStockAnalysis' })

type StockSearchSource = 'local' | 'market'
type StockRowCommand = 'group' | 'tag' | 'tracking' | 'delete'
type GroupViewMode = 'stocks' | 'information'
type TagMatchMode = 'ALL' | 'ANY'
type StockScopeFilter = 'ALL' | 'ACTIVE' | 'UNTRACKED' | 'QUOTE_ISSUE'
type TableDensity = 'compact' | 'standard'
type FilterChipKey = 'province' | 'city' | 'industry' | 'tags' | 'trackingDate'
type DataSyncCommand = 'market' | 'profile' | 'information'

interface StockSearchOption {
  key: string
  source: StockSearchSource
  stockId: number | null
  symbol: string
  market: FinanceMarket
  marketName: string
  code: string
  name: string
  provider: string | null
  local: boolean
  tracked: boolean
  disabled: boolean
}

interface StockTrackRow extends StockTrackVO {
  quote?: MarketDataResult<StockQuoteVO>
  quoteLoading: boolean
  priceChange?: StockPriceChangeVO
}

interface ActiveFilterChip {
  key: FilterChipKey
  label: string
}

type SortOrder = 'ascending' | 'descending' | null
type SortValue = number | string | null | undefined

interface TableSortChange {
  prop: string
  order: SortOrder
}

interface StockTableRef {
  $el: HTMLElement
  clearSelection: () => void
  sort: (prop: string, order: Exclude<SortOrder, null>) => void
  toggleRowSelection: (row: StockTrackRow, selected?: boolean) => void
}

const message = useMessage()
const workspaceCache = useStockWorkspaceCache()
const loading = ref(false)
const refreshLoading = ref(false)
const searchLoading = ref(false)
const syncIndustryLoading = ref(false)
const syncInformationLoading = ref(false)
const list = ref<StockTrackRow[]>([])
const groups = ref<StockGroupVO[]>([])
const tags = ref<StockTagVO[]>([])
const globalStatistics = ref<StockWinRateVO>()
const selectedStockKeys = ref<string[]>([])
const activeGroupId = ref<number>()
const selectedProvince = ref<string>()
const selectedCity = ref<string>()
const selectedIndustry = ref<string>()
const selectedTagIds = ref<number[]>([])
const tagMatchMode = ref<TagMatchMode>('ALL')
const trackingDateRange = ref<[string, string] | null>(null)
const selectedTracks = ref<StockTrackRow[]>([])
const groupViewMode = ref<GroupViewMode>('stocks')
const stockScopeFilter = ref<StockScopeFilter>('ALL')
const filterExpanded = ref(false)
const searchOptions = ref<StockSearchOption[]>([])
const stockSearchHint = ref('')
const detailRef = ref<InstanceType<typeof StockDetailDrawer>>()
const aiSingleAnalysisRef = ref<InstanceType<typeof StockAiSingleAnalysisDrawer>>()
const batchStockPoolAddRef = ref<InstanceType<typeof BatchStockPoolAddDialog>>()
const stockImageAddRef = ref<InstanceType<typeof StockImageAddDialog>>()
const batchHistoryImportRef = ref<InstanceType<typeof BatchHistoryImportDialog>>()
const batchTrackingPeriodRef = ref<InstanceType<typeof BatchTrackingPeriodDialog>>()
const stockGroupBatchAssignRef = ref<InstanceType<typeof StockGroupBatchAssignDialog>>()
const stockTagManageRef = ref<InstanceType<typeof StockTagManageDialog>>()
const stockTagAssignRef = ref<InstanceType<typeof StockTagAssignDialog>>()
const groupInformationRef = ref<InstanceType<typeof GroupInformationPanel>>()
const stockTableRef = ref<StockTableRef>()
const tableRenderKey = ref(0)
const groupDialogVisible = ref(false)
const groupDialogMode = ref<'create' | 'edit'>('create')
const groupSubmitLoading = ref(false)
const groupForm = reactive({ id: 0, name: '', sort: 0 })
const assignDialogVisible = ref(false)
const assignSubmitLoading = ref(false)
const assigningTrack = ref<StockTrackRow>()
const assigningGroupIds = ref<number[]>([])
let searchTimer: ReturnType<typeof setTimeout> | undefined
let searchRequestId = 0
let listRequestId = 0
let columnSortable: Sortable | undefined

const marketLabels: Record<FinanceMarket, string> = {
  SSE: '沪市',
  SZSE: '深市',
  BSE: '北交所'
}

const textCollator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })
const canUpdateGroup = checkPermi(['finance:stock-track:update'])
const canDeleteTrack = checkPermi(['finance:stock-track:delete'])
const canSyncStockProfile = checkPermi(['finance:stock:update'])
const canSyncTechnicalData = checkPermi(['finance:stock-daily-price:create'])
const canSyncInformation = checkPermi(['finance:stock-information:query'])
const tagMatchOptions = [
  { label: '全部匹配', value: 'ALL' },
  { label: '任一匹配', value: 'ANY' }
]
const groupViewOptions = [
  { label: '个股列表', value: 'stocks' },
  { label: '资讯公告研报', value: 'information' }
]
const stockScopeOptions = [
  { label: '全部', value: 'ALL' },
  { label: '持续跟踪', value: 'ACTIVE' },
  { label: '未设日期', value: 'UNTRACKED' },
  { label: '行情异常', value: 'QUOTE_ISSUE' }
]
const tableDensityOptions = [
  { label: '紧凑', value: 'compact' },
  { label: '标准', value: 'standard' }
]

const activeGroup = computed(() => groups.value.find((group) => group.id === activeGroupId.value))
const activeGroupTracks = computed(() =>
  activeGroupId.value === undefined
    ? []
    : list.value.filter((row) => row.groupIds.includes(activeGroupId.value as number))
)
const marketSyncTracks = computed(() =>
  selectedTracks.value.length > 0 ? selectedTracks.value : activeGroupTracks.value
)
const marketSyncScopeLabel = computed(() =>
  selectedTracks.value.length > 0
    ? `已选 ${selectedTracks.value.length} 只`
    : `当前分组 ${activeGroupTracks.value.length} 只`
)
const profileSyncScopeLabel = computed(() =>
  selectedTracks.value.length > 0 ? `已选 ${selectedTracks.value.length} 只` : '全部个股'
)
const informationSyncScopeLabel = computed(() => `当前分组 ${activeGroupTracks.value.length} 只`)
const dataSyncDisabled = computed(
  () =>
    syncIndustryLoading.value ||
    syncInformationLoading.value ||
    ((!canSyncTechnicalData || marketSyncTracks.value.length === 0) &&
      !canSyncStockProfile &&
      (!canSyncInformation ||
        activeGroupId.value === undefined ||
        activeGroupTracks.value.length === 0))
)

const today = dayjs().format('YYYY-MM-DD')
const isActiveTracking = (row: StockTrackRow) =>
  Boolean(
    row.trackingStartDate &&
    row.trackingStartDate <= today &&
    (!row.trackingEndDate || row.trackingEndDate >= today)
  )
const isQuoteIssue = (row: StockTrackRow) =>
  !row.quoteLoading && (!row.quote || row.quote.status === 'UNAVAILABLE')

const activeTrackingCount = computed(() => activeGroupTracks.value.filter(isActiveTracking).length)
const activeGroupQuoteIssueCount = computed(
  () => activeGroupTracks.value.filter(isQuoteIssue).length
)

const isManagedMembershipGroup = (group: StockGroupVO) =>
  group.systemKey === 'ALL' || group.systemKey === 'POSITION'

const groupStockCounts = computed(() => {
  const counts = new Map<number, number>()
  groups.value.forEach((group) => counts.set(group.id, 0))
  list.value.forEach((row) => {
    row.groupIds.forEach((groupId) => counts.set(groupId, (counts.get(groupId) ?? 0) + 1))
  })
  return counts
})

const toTextOptions = (values: Array<string | null>) =>
  Array.from(
    new Set(values.filter((value): value is string => Boolean(value && value.trim())))
  ).sort(textCollator.compare)

const provinceOptions = computed(() => toTextOptions(list.value.map((row) => row.province)))
const cityOptions = computed(() =>
  toTextOptions(
    list.value
      .filter((row) => !selectedProvince.value || row.province === selectedProvince.value)
      .map((row) => row.city)
  )
)
const industryOptions = computed(() => toTextOptions(list.value.map((row) => row.industry)))
const hasListFilters = computed(() =>
  Boolean(
    selectedProvince.value ||
    selectedCity.value ||
    selectedIndustry.value ||
    selectedTagIds.value.length > 0 ||
    trackingDateRange.value?.length === 2
  )
)

const advancedFilterCount = computed(
  () =>
    [
      selectedProvince.value,
      selectedCity.value,
      selectedIndustry.value,
      selectedTagIds.value.length > 0,
      trackingDateRange.value?.length === 2
    ].filter(Boolean).length
)
const activeFilterChips = computed<ActiveFilterChip[]>(() => {
  const chips: ActiveFilterChip[] = []
  if (selectedProvince.value)
    chips.push({ key: 'province', label: `省份：${selectedProvince.value}` })
  if (selectedCity.value) chips.push({ key: 'city', label: `城市：${selectedCity.value}` })
  if (selectedIndustry.value)
    chips.push({ key: 'industry', label: `行业：${selectedIndustry.value}` })
  if (selectedTagIds.value.length > 0) {
    const selectedTagNames = tags.value
      .filter((tag) => selectedTagIds.value.includes(tag.id))
      .map((tag) => tag.name)
    const preview = selectedTagNames.slice(0, 2).join('、')
    const remaining = selectedTagNames.length - 2
    chips.push({
      key: 'tags',
      label: `标签：${preview}${remaining > 0 ? ` 等 ${selectedTagNames.length} 项` : ''}`
    })
  }
  if (trackingDateRange.value?.length === 2) {
    chips.push({
      key: 'trackingDate',
      label: `跟踪：${trackingDateRange.value[0]} 至 ${trackingDateRange.value[1]}`
    })
  }
  return chips
})

const statisticsTotal = computed(
  () =>
    (globalStatistics.value?.winCount ?? 0) +
    (globalStatistics.value?.lossCount ?? 0) +
    (globalStatistics.value?.flatCount ?? 0)
)
const statisticsDistribution = computed(() => {
  const total = statisticsTotal.value
  if (total === 0) return { win: 0, loss: 0, flat: 0 }
  const win = ((globalStatistics.value?.winCount ?? 0) / total) * 100
  const loss = ((globalStatistics.value?.lossCount ?? 0) / total) * 100
  return { win, loss, flat: Math.max(0, 100 - win - loss) }
})

const sortValueGetters = {
  name: (row: StockTrackRow) => row.name,
  symbol: (row: StockTrackRow) => row.symbol,
  province: (row: StockTrackRow) => row.province,
  city: (row: StockTrackRow) => row.city,
  industry: (row: StockTrackRow) => row.industry,
  tags: (row: StockTrackRow) => row.tags.map((tag) => tag.name).join('、'),
  market: (row: StockTrackRow) => marketLabels[row.market],
  trackingStartDate: (row: StockTrackRow) => row.trackingStartDate,
  trackingEndDate: (row: StockTrackRow) => row.trackingEndDate,
  openPrice: (row: StockTrackRow) => row.quote?.data?.openPrice,
  latestPrice: (row: StockTrackRow) => row.quote?.data?.latestPrice,
  highPrice: (row: StockTrackRow) => row.quote?.data?.highPrice,
  lowPrice: (row: StockTrackRow) => row.quote?.data?.lowPrice,
  changePercent: (row: StockTrackRow) => row.quote?.data?.changePercent,
  fiveDayChangePercent: (row: StockTrackRow) => row.priceChange?.fiveDayChangePercent,
  tenDayChangePercent: (row: StockTrackRow) => row.priceChange?.tenDayChangePercent,
  trackingCumulativeChangePercent: (row: StockTrackRow) =>
    row.priceChange?.trackingCumulativeChangePercent,
  quoteStatus: (row: StockTrackRow) => statusLabel(row.quote?.status),
  quoteTime: (row: StockTrackRow) =>
    row.quote?.sourceTime ? dayjs(row.quote.sourceTime).valueOf() : null
} satisfies Record<string, (row: StockTrackRow) => SortValue>

type SortKey = keyof typeof sortValueGetters

interface StockTableColumn {
  key: SortKey
  label: string
  width?: number
  minWidth?: number
  align?: 'left' | 'center' | 'right'
  showOverflowTooltip?: boolean
}

const STOCK_COLUMN_ORDER_KEY = 'finance-stock-analysis:column-order'
const STOCK_VISIBLE_COLUMNS_KEY = 'finance-stock-analysis:visible-columns'
const STOCK_TABLE_DENSITY_KEY = 'finance-stock-analysis:table-density'
const defaultTableColumns: StockTableColumn[] = [
  { key: 'name', label: '股票名称', minWidth: 116 },
  { key: 'tags', label: '标签', minWidth: 180 },
  { key: 'trackingStartDate', label: '开始跟踪', width: 120, align: 'center' },
  { key: 'trackingEndDate', label: '结束跟踪', width: 120, align: 'center' },
  { key: 'fiveDayChangePercent', label: '跟踪 5 日涨幅', width: 140, align: 'right' },
  { key: 'tenDayChangePercent', label: '跟踪 10 日涨幅', width: 148, align: 'right' },
  {
    key: 'trackingCumulativeChangePercent',
    label: '跟踪累计涨幅',
    width: 148,
    align: 'right'
  },
  { key: 'changePercent', label: '涨幅', width: 104, align: 'right' },
  { key: 'industry', label: '行业', minWidth: 136, showOverflowTooltip: true },
  { key: 'openPrice', label: '开盘', width: 104, align: 'right' },
  { key: 'latestPrice', label: '最新', width: 104, align: 'right' },
  { key: 'highPrice', label: '最高', width: 104, align: 'right' },
  { key: 'lowPrice', label: '最低', width: 104, align: 'right' },
  { key: 'province', label: '省份', width: 104, showOverflowTooltip: true },
  { key: 'city', label: '城市', width: 112, showOverflowTooltip: true },
  { key: 'symbol', label: '股票代码', width: 128 },
  { key: 'market', label: '市场', width: 90, align: 'center' },
  { key: 'quoteStatus', label: '行情状态', width: 120, align: 'center' },
  { key: 'quoteTime', label: '行情时间', minWidth: 176 }
]

const columnPresets: Record<'core' | 'tracking', SortKey[]> = {
  core: [
    'name',
    'tags',
    'trackingStartDate',
    'fiveDayChangePercent',
    'tenDayChangePercent',
    'trackingCumulativeChangePercent',
    'changePercent',
    'latestPrice',
    'industry',
    'quoteStatus'
  ],
  tracking: [
    'name',
    'tags',
    'trackingStartDate',
    'trackingEndDate',
    'fiveDayChangePercent',
    'tenDayChangePercent',
    'trackingCumulativeChangePercent',
    'changePercent',
    'latestPrice',
    'industry',
    'province',
    'city'
  ]
}

const isSortKey = (value: unknown): value is SortKey =>
  typeof value === 'string' && value in sortValueGetters

const loadTableColumns = (): StockTableColumn[] => {
  try {
    const stored = localStorage.getItem(STOCK_COLUMN_ORDER_KEY)
    if (!stored) return defaultTableColumns.map((column) => ({ ...column }))
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return defaultTableColumns.map((column) => ({ ...column }))
    const storedKeys = Array.from(new Set(parsed.filter(isSortKey)))
    const orderedKeys = [
      ...storedKeys,
      ...defaultTableColumns.map((column) => column.key).filter((key) => !storedKeys.includes(key))
    ]
    return orderedKeys
      .map((key) => defaultTableColumns.find((column) => column.key === key))
      .filter((column): column is StockTableColumn => Boolean(column))
      .map((column) => ({ ...column }))
  } catch {
    return defaultTableColumns.map((column) => ({ ...column }))
  }
}

const tableColumns = ref<StockTableColumn[]>(loadTableColumns())

const loadVisibleColumnKeys = (): SortKey[] => {
  try {
    const stored = localStorage.getItem(STOCK_VISIBLE_COLUMNS_KEY)
    if (!stored) return defaultTableColumns.map((column) => column.key)
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return defaultTableColumns.map((column) => column.key)
    const keys = Array.from(new Set(parsed.filter(isSortKey)))
    return keys.length > 0 ? keys : defaultTableColumns.map((column) => column.key)
  } catch {
    return defaultTableColumns.map((column) => column.key)
  }
}

const loadTableDensity = (): TableDensity =>
  localStorage.getItem(STOCK_TABLE_DENSITY_KEY) === 'standard' ? 'standard' : 'compact'

const visibleColumnKeys = ref<SortKey[]>(loadVisibleColumnKeys())
const tableDensity = ref<TableDensity>(loadTableDensity())
const visibleTableColumns = computed(() => {
  const visibleKeys = new Set(visibleColumnKeys.value)
  return tableColumns.value.filter((column) => visibleKeys.has(column.key))
})

const sortState = reactive<{ prop: SortKey | null; order: SortOrder }>({
  prop: null,
  order: null
})

const matchesTrackingDateRange = (row: StockTrackRow) => {
  const range = trackingDateRange.value
  if (!range || range.length !== 2) return true
  if (!row.trackingStartDate) return false
  const [beginDate, endDate] = range
  return (
    row.trackingStartDate <= endDate &&
    (row.trackingEndDate === null || row.trackingEndDate >= beginDate)
  )
}

const matchesSelectedTags = (row: StockTrackRow) => {
  if (selectedTagIds.value.length === 0) return true
  const rowTagIds = new Set(row.tagIds)
  return tagMatchMode.value === 'ALL'
    ? selectedTagIds.value.every((tagId) => rowTagIds.has(tagId))
    : selectedTagIds.value.some((tagId) => rowTagIds.has(tagId))
}

const matchesStockScope = (row: StockTrackRow) => {
  if (stockScopeFilter.value === 'ACTIVE') return isActiveTracking(row)
  if (stockScopeFilter.value === 'UNTRACKED') return !row.trackingStartDate
  if (stockScopeFilter.value === 'QUOTE_ISSUE') return isQuoteIssue(row)
  return true
}

const filteredList = computed(() =>
  list.value.filter(
    (row) =>
      activeGroupId.value !== undefined &&
      row.groupIds.includes(activeGroupId.value) &&
      (!selectedProvince.value || row.province === selectedProvince.value) &&
      (!selectedCity.value || row.city === selectedCity.value) &&
      (!selectedIndustry.value || row.industry === selectedIndustry.value) &&
      matchesSelectedTags(row) &&
      matchesTrackingDateRange(row) &&
      matchesStockScope(row)
  )
)

const tableEmptyText = computed(() => {
  if (list.value.length === 0) return '暂无跟踪股票，请先搜索并添加'
  return hasListFilters.value || stockScopeFilter.value !== 'ALL'
    ? '当前分组和筛选条件下暂无股票'
    : '当前分组暂无股票'
})

const displayList = computed(() => {
  const rows = filteredList.value.map((row, index) => ({ row, index }))
  if (!sortState.prop || !sortState.order) return rows.map((item) => item.row)
  const getter = sortValueGetters[sortState.prop]
  const direction = sortState.order === 'ascending' ? 1 : -1
  return rows
    .sort((left, right) => {
      const leftValue = getter(left.row)
      const rightValue = getter(right.row)
      const leftEmpty = leftValue === undefined || leftValue === null || leftValue === ''
      const rightEmpty = rightValue === undefined || rightValue === null || rightValue === ''
      if (leftEmpty && rightEmpty) return left.index - right.index
      if (leftEmpty) return 1
      if (rightEmpty) return -1
      const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : textCollator.compare(String(leftValue), String(rightValue))
      return comparison === 0 ? left.index - right.index : comparison * direction
    })
    .map((item) => item.row)
})

const visibleActiveTrackingCount = computed(() => displayList.value.filter(isActiveTracking).length)
const visibleQuoteIssueCount = computed(() => displayList.value.filter(isQuoteIssue).length)
const visibleAverageCumulativeChange = computed(() => {
  const values = displayList.value
    .map((row) => row.priceChange?.trackingCumulativeChangePercent)
    .filter((value): value is number => value !== undefined && value !== null)
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
})

const loadWorkspaceSupplements = async (
  requestId: number,
  tracks: StockTrackVO[],
  refreshQuotes: boolean
) => {
  const [statisticsResult, priceChangesResult, quotesResult] = await Promise.allSettled([
    StockApi.getWinRate(),
    StockApi.getPriceChangeList(),
    tracks.length > 0
      ? StockApi.getQuotes({ trackIds: tracks.map((track) => track.id), refresh: refreshQuotes })
      : Promise.resolve([])
  ])
  if (requestId !== listRequestId) return
  if (statisticsResult.status === 'fulfilled') {
    globalStatistics.value = statisticsResult.value
  }
  const priceChanges = new Map(
    priceChangesResult.status === 'fulfilled'
      ? priceChangesResult.value.map((item) => [item.trackId, item])
      : []
  )
  const quotes = new Map(
    quotesResult.status === 'fulfilled'
      ? quotesResult.value.map((item) => [item.trackId, item.quote])
      : []
  )
  list.value.forEach((row) => {
    const priceChange = priceChanges.get(row.id)
    if (priceChange) row.priceChange = priceChange
    const quote = quotes.get(row.id)
    if (quote && (quote.status !== 'UNAVAILABLE' || !row.quote)) row.quote = quote
    row.quoteLoading = false
  })
}

const getList = async (refreshQuotes = false) => {
  const requestId = ++listRequestId
  let tracksToLoad: StockTrackVO[] = []
  loading.value = true
  try {
    const previousGroupId = activeGroupId.value
    const previousRows = new Map(list.value.map((row) => [row.id, row]))
    const workspaceResult = await workspaceCache.load()
    if (requestId !== listRequestId) return
    groups.value = workspaceResult.groups
    tags.value = workspaceResult.tags
    activeGroupId.value = groups.value.some((group) => group.id === previousGroupId)
      ? previousGroupId
      : groups.value[0]?.id
    tracksToLoad = workspaceResult.tracks
    list.value = tracksToLoad.map((track) => {
      const previousRow = previousRows.get(track.id)
      return {
        ...track,
        tagIds: track.tagIds ?? [],
        tags: track.tags ?? [],
        quote: previousRow?.quote,
        quoteLoading: true,
        priceChange: previousRow?.priceChange
      }
    })
  } finally {
    if (requestId === listRequestId) loading.value = false
  }
  if (requestId !== listRequestId) return
  const supplementPromise = loadWorkspaceSupplements(requestId, tracksToLoad, refreshQuotes)
  if (refreshQuotes) {
    await supplementPromise
  } else {
    void supplementPromise
  }
}

const handleWorkspaceRefresh = async () => {
  refreshLoading.value = true
  workspaceCache.invalidate()
  try {
    await getList(true)
  } finally {
    refreshLoading.value = false
  }
}

const toLocalSearchOption = (stock: StockSearchVO): StockSearchOption => {
  const tracked = list.value.some((row) => row.stockId === stock.id)
  return {
    key: `local:${stock.id}`,
    source: 'local',
    stockId: stock.id,
    symbol: stock.symbol,
    market: stock.market,
    marketName: stock.marketName,
    code: stock.code,
    name: stock.name,
    provider: null,
    local: true,
    tracked,
    disabled: stock.status !== 1 || tracked
  }
}

const toMarketSearchOption = (stock: StockMarketSearchVO): StockSearchOption => ({
  key: `market:${stock.market}:${stock.code}`,
  source: 'market',
  stockId: stock.stockId,
  symbol: stock.symbol,
  market: stock.market,
  marketName: stock.marketName,
  code: stock.code,
  name: stock.name,
  provider: stock.provider,
  local: stock.local,
  tracked: stock.tracked,
  disabled: stock.tracked
})

const searchStocks = (keyword: string) => {
  if (searchTimer) clearTimeout(searchTimer)
  const requestId = ++searchRequestId
  const normalizedKeyword = keyword.trim()
  if (!normalizedKeyword) {
    searchOptions.value = searchOptions.value.filter((option) =>
      selectedStockKeys.value.includes(option.key)
    )
    stockSearchHint.value = ''
    searchLoading.value = false
    return
  }
  searchTimer = setTimeout(async () => {
    searchLoading.value = true
    stockSearchHint.value = ''
    try {
      const [localResult, marketResult] = await Promise.allSettled([
        StockApi.search({ keyword: normalizedKeyword }),
        StockApi.marketSearch({ keyword: normalizedKeyword })
      ])
      if (requestId !== searchRequestId) return
      const localOptions =
        localResult.status === 'fulfilled' ? localResult.value.map(toLocalSearchOption) : []
      const marketOptions =
        marketResult.status === 'fulfilled'
          ? (marketResult.value.data ?? []).map(toMarketSearchOption)
          : []
      const selectedOptions = searchOptions.value.filter((option) =>
        selectedStockKeys.value.includes(option.key)
      )
      const mergedOptions = [...selectedOptions, ...localOptions, ...marketOptions]
      searchOptions.value = Array.from(
        new Map(mergedOptions.map((option) => [option.key, option])).values()
      )
      if (localResult.status === 'rejected' && marketResult.status === 'rejected') {
        stockSearchHint.value = '股票搜索失败，请稍后重试'
      } else if (localResult.status === 'rejected') {
        stockSearchHint.value = '本地股票池搜索失败，已展示真实行情结果'
      } else if (marketResult.status === 'rejected') {
        stockSearchHint.value = '真实行情搜索失败，仍可从本地股票池添加'
      } else if (marketResult.value.message) {
        stockSearchHint.value = marketResult.value.message
      } else if (searchOptions.value.length === 0) {
        stockSearchHint.value = '未找到匹配股票'
      }
    } finally {
      if (requestId === searchRequestId) searchLoading.value = false
    }
  }, 300)
}

const selectedAddOptions = () => {
  const selectedKeySet = new Set(selectedStockKeys.value)
  const selectedOptions = searchOptions.value.filter(
    (option) => selectedKeySet.has(option.key) && !option.disabled
  )
  const uniqueOptions = Array.from(
    new Map(selectedOptions.map((option) => [option.symbol, option])).values()
  )
  return uniqueOptions
}

const trackedSymbols = computed(() => list.value.map((row) => row.symbol))

const openStockPoolAddCandidates = (candidates: StockPoolAddCandidate[]) => {
  if (candidates.length === 0) return
  const groupId =
    activeGroup.value && !isManagedMembershipGroup(activeGroup.value)
      ? activeGroup.value.id
      : undefined
  const groupName = groupId === undefined ? '自选' : activeGroup.value?.name || '自选'
  batchStockPoolAddRef.value?.open(candidates, groupId, groupName)
}

const openStockPoolAdd = () => {
  const options = selectedAddOptions()
  if (options.length === 0) return
  const candidates: StockPoolAddCandidate[] = options.map((option) => ({
    key: option.key,
    source: option.source,
    stockId: option.stockId,
    symbol: option.symbol,
    market: option.market,
    code: option.code,
    name: option.name
  }))
  openStockPoolAddCandidates(candidates)
}

const handleImageCandidates = (candidates: StockPoolAddCandidate[]) => {
  openStockPoolAddCandidates(candidates)
}

const handleStockPoolAdded = async (succeededKeys: string[]) => {
  const succeededKeySet = new Set(succeededKeys)
  selectedStockKeys.value = selectedStockKeys.value.filter((key) => !succeededKeySet.has(key))
  searchOptions.value = searchOptions.value.filter((option) => !succeededKeySet.has(option.key))
  stockSearchHint.value = ''
  workspaceCache.invalidate()
  await getList()
}

const handleDelete = async (row: StockTrackRow) => {
  await message.delConfirm(`确定删除“${row.name}（${row.symbol}）”的跟踪记录吗？`)
  await StockApi.deleteTrack(row.id)
  workspaceCache.invalidate()
  message.success('已删除跟踪记录')
  await getList()
}

const handleRowCommand = async (command: StockRowCommand, row: StockTrackRow) => {
  if (command === 'group') {
    openGroupAssign(row)
    return
  }
  if (command === 'tracking') {
    openTrackingPeriod(row)
    return
  }
  if (command === 'tag') {
    openTagAssign([row])
    return
  }
  await handleDelete(row)
}

const openCreateGroup = () => {
  groupDialogMode.value = 'create'
  groupForm.id = 0
  groupForm.name = ''
  groupForm.sort = groups.value.reduce((max, group) => Math.max(max, group.sort), 0) + 10
  groupDialogVisible.value = true
}

const openEditGroup = () => {
  if (!activeGroup.value || activeGroup.value.fixed) return
  groupDialogMode.value = 'edit'
  groupForm.id = activeGroup.value.id
  groupForm.name = activeGroup.value.name
  groupForm.sort = activeGroup.value.sort
  groupDialogVisible.value = true
}

const submitGroup = async () => {
  const name = groupForm.name.trim()
  if (!name) {
    message.warning('请输入分组名称')
    return
  }
  groupSubmitLoading.value = true
  try {
    if (groupDialogMode.value === 'create') {
      await StockApi.createGroup({ name, sort: groupForm.sort })
      message.success('分组已创建')
    } else {
      await StockApi.updateGroup({ id: groupForm.id, name, sort: groupForm.sort })
      message.success('分组已更新')
    }
    groupDialogVisible.value = false
    workspaceCache.invalidate()
    await getList()
  } finally {
    groupSubmitLoading.value = false
  }
}

const handleDeleteGroup = async () => {
  if (!activeGroup.value || activeGroup.value.fixed) return
  await message.delConfirm(`确定删除分组“${activeGroup.value.name}”吗？`)
  await StockApi.deleteGroup(activeGroup.value.id)
  workspaceCache.invalidate()
  message.success('分组已删除')
  await getList()
}

const openGroupAssign = (row: StockTrackRow) => {
  assigningTrack.value = row
  assigningGroupIds.value = [...row.groupIds]
  assignDialogVisible.value = true
}

const submitGroupAssign = async () => {
  if (!assigningTrack.value || assigningGroupIds.value.length === 0) return
  assignSubmitLoading.value = true
  try {
    await StockApi.assignTrackGroups({
      trackId: assigningTrack.value.id,
      groupIds: assigningGroupIds.value
    })
    assigningTrack.value.groupIds = [...assigningGroupIds.value]
    assigningTrack.value.groupNames = groups.value
      .filter((group) => assigningGroupIds.value.includes(group.id))
      .map((group) => group.name)
    assignDialogVisible.value = false
    workspaceCache.invalidate()
    message.success('所属分组已更新')
  } finally {
    assignSubmitLoading.value = false
  }
}

const syncIndustry = async (trackIds: number[]) => {
  syncIndustryLoading.value = true
  try {
    const result: StockIndustrySyncVO = await StockApi.syncIndustry({ trackIds })
    message.success(
      `地域行业同步完成：更新 ${result.updatedCount}，跳过 ${result.skippedCount}，失败 ${result.failedCount}`
    )
    await getList()
  } finally {
    syncIndustryLoading.value = false
  }
}

const syncGroupInformation = async () => {
  if (activeGroupId.value === undefined || activeGroupTracks.value.length === 0) {
    message.warning('当前分组暂无可同步股票')
    return
  }
  syncInformationLoading.value = true
  try {
    const types = ['NEWS', 'ANNOUNCEMENT', 'RESEARCH'] as const
    const results = await Promise.allSettled(
      types.map((type) =>
        StockApi.syncGroupInformation({ groupId: activeGroupId.value as number, type })
      )
    )
    const summaries = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    )
    const rejectedCount = results.length - summaries.length
    if (summaries.length === 0) {
      message.error('资讯公告研报同步失败，已有本地数据不受影响')
      return
    }
    const fetchedTimes = summaries
      .map((summary) => summary.latestFetchedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
    const latestFetchedAt = fetchedTimes[fetchedTimes.length - 1] ?? null
    const summary = summaries.reduce(
      (total, current) => ({
        requested: total.requested + current.requested,
        succeeded: total.succeeded + current.succeeded,
        failed: total.failed + current.failed,
        fetched: total.fetched + current.fetched,
        inserted: total.inserted + current.inserted,
        updated: total.updated + current.updated,
        latestFetchedAt
      }),
      {
        requested: rejectedCount * activeGroupTracks.value.length,
        succeeded: 0,
        failed: rejectedCount * activeGroupTracks.value.length,
        fetched: 0,
        inserted: 0,
        updated: 0,
        latestFetchedAt
      }
    )
    if (summary.failed > 0) {
      message.warning(
        `资讯公告研报同步完成：新增 ${summary.inserted} 条，更新 ${summary.updated} 条，失败 ${summary.failed} 个股票类型任务`
      )
    } else {
      message.success(
        `资讯公告研报同步完成：新增 ${summary.inserted} 条，更新 ${summary.updated} 条`
      )
    }
    await groupInformationRef.value?.refresh(summary)
  } finally {
    syncInformationLoading.value = false
  }
}

const handleDataSyncCommand = async (command: DataSyncCommand) => {
  if (command === 'market') {
    if (marketSyncTracks.value.length === 0) {
      message.warning('当前分组暂无可同步股票')
      return
    }
    batchHistoryImportRef.value?.open(marketSyncTracks.value)
    return
  }
  if (command === 'information') {
    await syncGroupInformation()
    return
  }
  const trackIds = selectedTracks.value.map((track) => track.id)
  if (trackIds.length === 0) {
    await message.confirm('未勾选股票，确定同步当前用户全部股票的省份、城市和行业吗？')
  }
  await syncIndustry(trackIds)
}

const clearFilterChip = (key: FilterChipKey) => {
  if (key === 'province') selectedProvince.value = undefined
  if (key === 'city') selectedCity.value = undefined
  if (key === 'industry') selectedIndustry.value = undefined
  if (key === 'tags') {
    selectedTagIds.value = []
    tagMatchMode.value = 'ALL'
  }
  if (key === 'trackingDate') trackingDateRange.value = null
}

const resetFilters = () => {
  selectedProvince.value = undefined
  selectedCity.value = undefined
  selectedIndustry.value = undefined
  selectedTagIds.value = []
  tagMatchMode.value = 'ALL'
  trackingDateRange.value = null
}

const tagStyle = (color: string) => ({
  color,
  borderColor: color,
  backgroundColor: `${color}12`
})

const handleTagsChanged = (updatedTags: StockTagVO[]) => {
  workspaceCache.invalidate()
  tags.value = updatedTags
  const tagMap = new Map(updatedTags.map((tag) => [tag.id, tag]))
  const validTagIds = new Set(tagMap.keys())
  selectedTagIds.value = selectedTagIds.value.filter((tagId) => validTagIds.has(tagId))
  list.value.forEach((row) => {
    row.tagIds = row.tagIds.filter((tagId) => validTagIds.has(tagId))
    row.tags = row.tagIds
      .map((tagId) => tagMap.get(tagId))
      .filter((tag): tag is StockTagVO => Boolean(tag))
  })
}

const openTagAssign = (tracksToAssign: StockTrackRow[]) => {
  stockTagAssignRef.value?.open(tracksToAssign, tags.value)
}

const openBatchTagAssign = () => {
  openTagAssign(selectedTracks.value)
}

const openBatchGroupAssign = () => {
  stockGroupBatchAssignRef.value?.open(selectedTracks.value, groups.value)
}

const handleTagsAssigned = async () => {
  clearTrackSelection()
  workspaceCache.invalidate()
  await getList()
}

const openDetail = (row: StockTrackRow) => {
  detailRef.value?.open(row)
}

const openSingleAi = (row: StockTrackRow) => {
  aiSingleAnalysisRef.value?.open(row)
}

const handleSelectionChange = (rows: StockTrackRow[]) => {
  selectedTracks.value = rows
}

const stockRowClassName = ({ row }: { row: StockTrackRow }) => {
  if (isQuoteIssue(row)) return 'stock-row--quote-issue'
  if (!row.trackingStartDate) return 'stock-row--untracked'
  return ''
}

const handleSortChange = ({ prop, order }: TableSortChange) => {
  sortState.prop = prop in sortValueGetters ? (prop as SortKey) : null
  sortState.order = order
}

const destroyColumnSortable = () => {
  columnSortable?.destroy()
  columnSortable = undefined
}

const remountStockTable = async () => {
  const selectedTrackIds = new Set(selectedTracks.value.map((track) => track.id))
  destroyColumnSortable()
  tableRenderKey.value += 1
  await nextTick()
  if (sortState.prop && sortState.order) {
    stockTableRef.value?.sort(sortState.prop, sortState.order)
  }
  displayList.value.forEach((row) => {
    if (selectedTrackIds.has(row.id)) {
      stockTableRef.value?.toggleRowSelection(row, true)
    }
  })
  await initColumnSortable()
}

const persistVisibleColumns = () => {
  localStorage.setItem(STOCK_VISIBLE_COLUMNS_KEY, JSON.stringify(visibleColumnKeys.value))
}

const handleVisibleColumnsChanged = () => {
  if (visibleColumnKeys.value.length === 0) {
    visibleColumnKeys.value = ['name']
    message.warning('至少保留一个显示字段')
  }
  persistVisibleColumns()
  setTimeout(() => void remountStockTable(), 0)
}

const applyColumnPreset = (preset: keyof typeof columnPresets) => {
  visibleColumnKeys.value = [...columnPresets[preset]]
  persistVisibleColumns()
  setTimeout(() => void remountStockTable(), 0)
}

const showAllColumns = () => {
  visibleColumnKeys.value = defaultTableColumns.map((column) => column.key)
  persistVisibleColumns()
  setTimeout(() => void remountStockTable(), 0)
}

const resetColumnLayout = () => {
  tableColumns.value = defaultTableColumns.map((column) => ({ ...column }))
  visibleColumnKeys.value = defaultTableColumns.map((column) => column.key)
  localStorage.removeItem(STOCK_COLUMN_ORDER_KEY)
  localStorage.removeItem(STOCK_VISIBLE_COLUMNS_KEY)
  setTimeout(() => void remountStockTable(), 0)
}

const reorderVisibleColumns = (oldIndex: number, newIndex: number) => {
  const reorderedKeys = visibleTableColumns.value.map((column) => column.key)
  const [movedKey] = reorderedKeys.splice(oldIndex, 1)
  if (!movedKey) return false
  reorderedKeys.splice(newIndex, 0, movedKey)
  const columnsByKey = new Map(tableColumns.value.map((column) => [column.key, column]))
  const visibleKeySet = new Set(reorderedKeys)
  let visibleIndex = 0
  tableColumns.value = tableColumns.value.map((column) =>
    visibleKeySet.has(column.key)
      ? (columnsByKey.get(reorderedKeys[visibleIndex++]) ?? column)
      : column
  )
  return true
}

const initColumnSortable = async () => {
  await nextTick()
  destroyColumnSortable()
  const headerRows = Array.from(
    stockTableRef.value?.$el.querySelectorAll<HTMLElement>('.el-table__header-wrapper thead tr') ??
      []
  )
  const headerRow = headerRows.find(
    (row) =>
      row.querySelectorAll('th.stock-draggable-column').length === visibleTableColumns.value.length
  )
  if (!headerRow) return
  columnSortable = Sortable.create(headerRow, {
    animation: 150,
    direction: 'horizontal',
    draggable: 'th.stock-draggable-column',
    forceFallback: true,
    fallbackOnBody: true,
    fallbackClass: 'stock-column-drag-fallback',
    chosenClass: 'stock-column-drag-chosen',
    ghostClass: 'stock-column-drag-ghost',
    handle: '.stock-column-drag-handle',
    swapThreshold: 0.65,
    onEnd: ({ oldDraggableIndex, newDraggableIndex }) => {
      if (
        oldDraggableIndex === undefined ||
        newDraggableIndex === undefined ||
        oldDraggableIndex === newDraggableIndex
      ) {
        return
      }
      if (!reorderVisibleColumns(oldDraggableIndex, newDraggableIndex)) return
      localStorage.setItem(
        STOCK_COLUMN_ORDER_KEY,
        JSON.stringify(tableColumns.value.map((column) => column.key))
      )
      setTimeout(() => void remountStockTable(), 0)
    }
  })
}

const openBatchTrackingPeriod = () => {
  batchTrackingPeriodRef.value?.open(selectedTracks.value)
}

const openTrackingPeriod = (row: StockTrackRow) => {
  batchTrackingPeriodRef.value?.open([row])
}

const clearTrackSelection = () => {
  stockTableRef.value?.clearSelection()
  selectedTracks.value = []
}

const handleBatchUpdated = async (changedTrackIds?: number[]) => {
  clearTrackSelection()
  workspaceCache.invalidate()
  await Promise.all([
    getList(),
    changedTrackIds?.length ? detailRef.value?.refreshDailyData(changedTrackIds) : undefined
  ])
}

const formatPrice = (value?: number | null) =>
  value === undefined || value === null ? '--' : value.toFixed(2)

const formatPercent = (value?: number | null) =>
  value === undefined || value === null ? '--' : `${value.toFixed(2)}%`

const formatDateTime = (value?: string | null) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '--'

const changeClass = (value?: number | null) => {
  if (value === undefined || value === null || value === 0) return 'price-flat'
  return value > 0 ? 'price-up' : 'price-down'
}

const statusLabel = (status?: MarketDataStatus) =>
  ({
    REALTIME: '实时',
    DELAYED: '延迟',
    CACHED: '缓存',
    UNAVAILABLE: '不可用'
  })[status ?? 'UNAVAILABLE']

const statusTagType = (status?: MarketDataStatus): 'success' | 'warning' | 'danger' | 'info' =>
  ({
    REALTIME: 'success',
    DELAYED: 'info',
    CACHED: 'warning',
    UNAVAILABLE: 'danger'
  })[status ?? 'UNAVAILABLE'] as 'success' | 'warning' | 'danger' | 'info'

watch(selectedProvince, () => {
  if (selectedCity.value && !cityOptions.value.includes(selectedCity.value)) {
    selectedCity.value = undefined
  }
})

watch(tableDensity, (value) => {
  localStorage.setItem(STOCK_TABLE_DENSITY_KEY, value)
})

watch(activeGroupId, () => {
  clearTrackSelection()
})

watch(groupViewMode, async (value) => {
  if (value === 'stocks') {
    await initColumnSortable()
  } else {
    clearTrackSelection()
    destroyColumnSortable()
  }
})

onMounted(async () => {
  await getList()
  await initColumnSortable()
})

onBeforeUnmount(() => {
  listRequestId++
  if (searchTimer) clearTimeout(searchTimer)
  destroyColumnSortable()
})
</script>

<style scoped>
.group-tabs-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.group-tabs {
  min-width: 0;
  flex: 1;
}

.group-tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}

.group-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.group-tab-fixed-icon {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.group-tab-count {
  height: 20px;
  min-width: 20px;
  padding: 0 5px;
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
  text-align: center;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.group-actions {
  display: flex;
  flex: none;
  gap: 8px;
}

.group-workbar,
.group-workbar__scope,
.group-workbar__tools,
.group-result-summary,
.column-settings__heading,
.column-settings__actions {
  display: flex;
  align-items: center;
}

.group-workbar {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
  background: var(--el-fill-color-extra-light);
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.group-workbar__scope,
.group-workbar__tools {
  flex: none;
  gap: 8px;
}

.group-result-summary {
  gap: 4px;
  padding: 0 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.group-result-summary strong {
  color: var(--el-text-color-primary);
  font-variant-numeric: tabular-nums;
}

.stock-scope-filter,
.table-density-control {
  flex: none;
}

.column-settings__heading {
  justify-content: space-between;
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.column-settings__heading span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.column-settings__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
  max-height: min(420px, 55vh);
  overflow-y: auto;
}

.column-settings__grid :deep(.el-checkbox) {
  min-width: 0;
  margin-right: 0;
}

.column-settings__actions {
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.assign-stock {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
}

.group-assign-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.group-assign-options :deep(.el-checkbox) {
  width: 100%;
  margin-right: 0;
}

.selection-bar,
.selection-bar__summary,
.selection-bar__actions,
.row-actions,
.danger-command {
  display: flex;
  align-items: center;
}

.selection-bar {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 12px;
  color: var(--el-color-primary-dark-2);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 4px;
}

.selection-bar__summary,
.selection-bar__actions,
.row-actions {
  gap: 8px;
}

.selection-bar__summary span {
  color: var(--el-text-color-secondary);
}

.row-actions {
  justify-content: center;
  flex-wrap: nowrap;
}

.row-actions .el-button {
  width: 28px;
  height: 28px;
  padding: 0;
  margin-left: 0;
}

.danger-command {
  color: var(--el-color-danger);
}

.stock-code {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stock-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.stock-name-link {
  display: inline-flex;
  height: auto;
  min-width: 0;
  padding: 0;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.25;
}

.stock-name-link__code {
  margin-top: 3px;
  font-size: 11px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.tracking-cell {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--el-color-primary-dark-2);
  font-variant-numeric: tabular-nums;
}

.tracking-cell--empty,
.muted-value {
  color: var(--el-text-color-placeholder);
}

.change-pill {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 66px;
  min-height: 24px;
  padding: 2px 7px;
  font-weight: 600;
  border-radius: 3px;
}

.change-pill.price-up {
  background: rgb(207 46 46 / 9%);
}

.change-pill.price-down {
  background: rgb(22 132 91 / 10%);
}

.change-pill.price-flat {
  background: var(--el-fill-color-light);
}

.change-pill--strong {
  box-shadow: inset 0 0 0 1px currentcolor;
}

.stock-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 24px;
}

.stock-column-header {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.stock-column-drag-handle {
  width: 16px;
  height: 16px;
  padding: 3px;
  color: var(--el-text-color-placeholder);
  cursor: grab;
  border-radius: 3px;
  box-sizing: content-box;
  transition:
    color 0.15s,
    background-color 0.15s;
  flex: none;
  touch-action: none;
}

.stock-column-drag-handle:hover {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.stock-column-drag-handle:active {
  cursor: grabbing;
}

.stock-table :deep(.stock-column-drag-chosen),
.stock-table :deep(.stock-column-drag-ghost) {
  background: var(--el-color-primary-light-9) !important;
}

:global(.stock-column-drag-fallback) {
  background: var(--el-bg-color);
  border: 1px solid var(--el-color-primary-light-5);
  opacity: 0.9;
  box-shadow: var(--el-box-shadow-light);
}

.stock-table--compact :deep(.el-table__cell) {
  padding-top: 6px;
  padding-bottom: 6px;
}

.stock-table--standard :deep(.el-table__cell) {
  padding-top: 10px;
  padding-bottom: 10px;
}

.stock-table :deep(.stock-row--quote-issue > td.el-table__cell) {
  background: #fff8ec !important;
}

.stock-table :deep(.stock-row--untracked > td.el-table__cell) {
  background: #fafbfc !important;
}

.price-up {
  color: #cf2e2e;
  font-variant-numeric: tabular-nums;
}

.price-down {
  color: #16845b;
  font-variant-numeric: tabular-nums;
}

.price-flat {
  color: var(--el-text-color-regular);
  font-variant-numeric: tabular-nums;
}

.investment-disclaimer {
  margin-top: 12px;
}

@media (width <=1100px) {
  .group-workbar__scope,
  .group-workbar__tools {
    flex-wrap: wrap;
  }
}

@media (width <=720px) {
  .group-tabs-row,
  .group-workbar,
  .group-workbar__scope,
  .group-workbar__tools {
    align-items: stretch;
    flex-direction: column;
  }

  .group-tabs-row {
    flex-direction: column;
  }

  .group-tabs {
    width: 100%;
  }

  .group-actions {
    align-self: flex-end;
  }

  .group-workbar__scope,
  .group-workbar__tools {
    width: 100%;
  }

  .group-workbar__scope > *,
  .group-workbar__tools > * {
    width: 100%;
  }

  .group-result-summary {
    justify-content: center;
  }

  .column-settings__grid {
    grid-template-columns: 1fr;
  }

  .group-assign-options {
    grid-template-columns: 1fr;
  }

  .selection-bar__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .selection-bar__actions .el-button {
    width: 100%;
    margin-left: 0;
  }

  .selection-bar__actions .el-button.is-circle {
    width: 100%;
    border-radius: 4px;
  }
}
</style>
