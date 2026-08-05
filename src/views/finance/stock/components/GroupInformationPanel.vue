<template>
  <div class="group-information-panel">
    <div class="information-toolbar">
      <div class="information-toolbar__filters">
        <el-segmented
          v-model="informationType"
          :options="informationOptions"
          @change="handleTypeChange"
        />
        <el-input
          v-model="keyword"
          clearable
          class="information-keyword"
          placeholder="搜索股票、标题、来源或摘要"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix><Icon icon="ep:search" /></template>
          <template #append>
            <el-button aria-label="搜索资讯公告" @click="handleSearch">
              <Icon icon="ep:search" />
            </el-button>
          </template>
        </el-input>
      </div>
      <div class="information-toolbar__actions">
        <div class="information-meta">
          <span>{{ total }} 条结果</span>
          <span>最近同步 {{ formatDateTime(result?.fetchedAt) }}</span>
        </div>
        <el-tooltip content="从行情源增量同步当前分组" placement="top">
          <el-button
            circle
            aria-label="同步当前分组资讯公告"
            :loading="syncing"
            :disabled="props.tracks.length === 0 || props.groupId === undefined"
            @click="syncInformation"
          >
            <Icon icon="ep:refresh" />
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <el-alert
      v-if="syncSummary && syncSummary.failed > 0"
      class="information-alert"
      type="warning"
      :closable="false"
      show-icon
      :title="`同步完成：${syncSummary.succeeded} 个成功，${syncSummary.failed} 个失败；已有本地数据未受影响`"
    />

    <el-table
      v-loading="loading"
      :data="items"
      row-key="id"
      stripe
      table-layout="fixed"
      max-height="620"
      :empty-text="emptyText"
    >
      <el-table-column label="发布时间" width="172" sortable prop="publishedAt">
        <template #default="{ row }">{{ formatDateTime(row.publishedAt) }}</template>
      </el-table-column>
      <el-table-column label="股票" width="150" sortable prop="stockName">
        <template #default="{ row }">
          <div class="information-stock-name">{{ row.stockName }}</div>
          <div class="information-stock-symbol">{{ row.market }}:{{ row.code }}</div>
        </template>
      </el-table-column>
      <el-table-column label="来源" width="130" sortable prop="source" show-overflow-tooltip />
      <el-table-column label="类型" width="128" sortable prop="announcementType">
        <template #default="{ row }">
          {{ row.announcementType || informationTypeLabels[row.type] }}
        </template>
      </el-table-column>
      <el-table-column label="标题与摘要" min-width="390" sortable prop="title">
        <template #default="{ row }">
          <div class="information-title">{{ row.title }}</div>
          <div v-if="row.summary" class="information-summary">{{ row.summary }}</div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="64" align="center" fixed="right">
        <template #default="{ row }">
          <el-tooltip content="打开原文" placement="top">
            <el-button link type="primary" aria-label="打开原文" @click="openSource(row.url)">
              <Icon icon="ep:link" />
            </el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > 0" class="information-pagination">
      <el-pagination
        v-model:current-page="query.pageNo"
        v-model:page-size="query.pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        background
        @size-change="handlePageSizeChange"
        @current-change="loadInformation"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import {
  MarketDataResult,
  PagedResult,
  StockApi,
  StockInformationLocalVO,
  StockInformationSyncVO,
  StockInformationType,
  StockTrackVO
} from '@/api/finance/stock'

defineOptions({ name: 'FinanceStockGroupInformationPanel' })

const props = defineProps<{
  active: boolean
  groupId?: number
  tracks: StockTrackVO[]
}>()

const message = useMessage()
const informationOptions = [
  { label: '资讯', value: 'NEWS' },
  { label: '公告', value: 'ANNOUNCEMENT' }
]
const informationTypeLabels: Record<StockInformationType, string> = {
  NEWS: '资讯',
  ANNOUNCEMENT: '公告'
}
const informationType = ref<StockInformationType>('NEWS')
const keyword = ref('')
const loading = ref(false)
const syncing = ref(false)
const items = ref<StockInformationLocalVO[]>([])
const total = ref(0)
const result = ref<MarketDataResult<PagedResult<StockInformationLocalVO>>>()
const syncSummary = ref<StockInformationSyncVO>()
const query = reactive({ pageNo: 1, pageSize: 20 })
let requestVersion = 0

const informationTypeLabel = computed(() => informationTypeLabels[informationType.value])
const tracksSignature = computed(() => props.tracks.map((track) => track.id).join(','))
const emptyText = computed(() => {
  if (props.tracks.length === 0) return '当前分组暂无股票'
  if (keyword.value.trim()) return '没有匹配的资讯公告'
  return `当前分组暂无${informationTypeLabel.value}，可点击刷新进行同步`
})

const loadInformation = async () => {
  if (!props.active || props.groupId === undefined || props.tracks.length === 0) {
    items.value = []
    total.value = 0
    return
  }
  const currentVersion = ++requestVersion
  loading.value = true
  try {
    const nextResult = await StockApi.getGroupInformationPage({
      groupId: props.groupId,
      type: informationType.value,
      keyword: keyword.value.trim() || undefined,
      pageNo: query.pageNo,
      pageSize: query.pageSize
    })
    if (currentVersion !== requestVersion) return
    result.value = nextResult
    items.value = nextResult.data?.list ?? []
    total.value = nextResult.data?.total ?? 0
  } catch {
    if (currentVersion === requestVersion) {
      message.error('本地资讯加载失败，已保留当前结果')
    }
  } finally {
    if (currentVersion === requestVersion) loading.value = false
  }
}

const syncInformation = async () => {
  if (props.groupId === undefined || props.tracks.length === 0) return
  syncing.value = true
  try {
    const summary = await StockApi.syncGroupInformation({
      groupId: props.groupId,
      type: informationType.value
    })
    syncSummary.value = summary
    if (summary.failed > 0) {
      message.warning(`同步完成，${summary.failed} 个股票同步失败，已有数据已保留`)
    } else {
      message.success(`同步完成：新增 ${summary.inserted} 条，更新 ${summary.updated} 条`)
    }
    query.pageNo = 1
    await loadInformation()
  } catch {
    message.error('同步失败，已保留现有本地资讯')
  } finally {
    syncing.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  void loadInformation()
}

const handleTypeChange = () => {
  query.pageNo = 1
  syncSummary.value = undefined
  void loadInformation()
}

const handlePageSizeChange = () => {
  query.pageNo = 1
  void loadInformation()
}

const openSource = (url: string) => {
  try {
    const target = new URL(url)
    if (!['http:', 'https:'].includes(target.protocol)) return
    window.open(target.toString(), '_blank', 'noopener,noreferrer')
  } catch {
    return
  }
}

const formatDateTime = (value?: string | null) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '--'

watch(
  () => [props.active, props.groupId, tracksSignature.value] as const,
  ([active]) => {
    requestVersion++
    if (active) {
      query.pageNo = 1
      void loadInformation()
    } else {
      loading.value = false
    }
  }
)

onBeforeUnmount(() => requestVersion++)
</script>

<style scoped>
.group-information-panel {
  min-width: 0;
}

.information-toolbar,
.information-toolbar__filters,
.information-toolbar__actions,
.information-meta {
  display: flex;
  align-items: center;
}

.information-toolbar {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.information-toolbar__filters,
.information-toolbar__actions {
  gap: 12px;
}

.information-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  gap: 10px;
}

.information-keyword {
  width: min(360px, 42vw);
}

.information-alert {
  margin-bottom: 12px;
}

.information-stock-symbol,
.information-summary {
  color: var(--el-text-color-secondary);
}

.information-stock-symbol {
  font-size: 12px;
}

.information-stock-name,
.information-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.information-summary {
  display: -webkit-box;
  margin-top: 4px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.information-pagination {
  display: flex;
  margin-top: 14px;
  justify-content: flex-end;
  overflow-x: auto;
}

@media (width <= 720px) {
  .information-toolbar,
  .information-toolbar__filters,
  .information-toolbar__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .information-toolbar__filters,
  .information-toolbar__actions,
  .information-keyword {
    width: 100%;
  }

  .information-meta {
    justify-content: space-between;
  }

  .information-toolbar__actions .el-button {
    width: 100%;
    border-radius: 4px;
  }

  .information-pagination {
    justify-content: flex-start;
  }
}
</style>
