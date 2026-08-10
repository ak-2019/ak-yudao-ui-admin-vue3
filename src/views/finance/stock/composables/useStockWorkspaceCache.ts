import { computed, reactive } from 'vue'
import {
  StockApi,
  type StockGroupVO,
  type StockTagVO,
  type StockTrackVO
} from '@/api/finance/stock'

const CACHE_TTL = 60_000

interface WorkspaceCacheState {
  groups: StockGroupVO[]
  tags: StockTagVO[]
  tracks: StockTrackVO[]
  loadedAt: number
  loadingPromise: Promise<StockWorkspaceCacheSnapshot> | null
}

export interface StockWorkspaceCacheSnapshot {
  groups: StockGroupVO[]
  tags: StockTagVO[]
  tracks: StockTrackVO[]
}

const state = reactive<WorkspaceCacheState>({
  groups: [],
  tags: [],
  tracks: [],
  loadedAt: 0,
  loadingPromise: null
})

const snapshot = (): StockWorkspaceCacheSnapshot => ({
  groups: state.groups,
  tags: state.tags,
  tracks: state.tracks
})

const load = async (force = false): Promise<StockWorkspaceCacheSnapshot> => {
  const cacheIsFresh = state.loadedAt > 0 && Date.now() - state.loadedAt < CACHE_TTL
  if (!force && cacheIsFresh) return snapshot()
  if (state.loadingPromise) return state.loadingPromise

  const requestWorkspaceData = async () => {
    try {
      return await StockApi.getWorkspaceBootstrap()
    } catch {
      const [groups, tags, tracks] = await Promise.all([
        StockApi.getGroupList(),
        StockApi.getTagList(),
        StockApi.getTrackList()
      ])
      return { groups, tags, tracks }
    }
  }

  state.loadingPromise = requestWorkspaceData()
    .then((data) => {
      state.groups = data.groups
      state.tags = data.tags
      state.tracks = data.tracks
      state.loadedAt = Date.now()
      return snapshot()
    })
    .finally(() => {
      state.loadingPromise = null
    })

  return state.loadingPromise
}

const invalidate = () => {
  state.loadedAt = 0
}

export const useStockWorkspaceCache = () => ({
  groups: computed(() => state.groups),
  tags: computed(() => state.tags),
  tracks: computed(() => state.tracks),
  load,
  invalidate
})
