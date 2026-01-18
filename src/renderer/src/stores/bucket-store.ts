import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface RecentBucket {
  providerId: string
  providerName: string
  providerType: string
  bucketName: string
  lastAccessedAt: number
}

export interface BucketSettings {
  autoOpenLastBucket: boolean
}

interface BucketStore {
  // Recent buckets list
  recentBuckets: RecentBucket[]

  // Provider bucket cache
  providerBuckets: Record<string, string[]>

  // Last accessed bucket/provider
  lastProviderId: string | null
  lastBucketName: string | null

  // Pending open bucket (used when clicking provider card)
  pendingOpenBucket: {
    providerId: string
    bucketName: string
  } | null

  // Settings
  settings: BucketSettings

  // Actions
  addRecentBucket: (bucket: Omit<RecentBucket, 'lastAccessedAt'>) => void
  setLastAccessed: (providerId: string, bucketName: string) => void
  setProviderBuckets: (providerId: string, buckets: string[]) => void
  setPendingOpenBucket: (providerId: string, bucketName: string) => void
  clearPendingOpenBucket: () => void
  clearRecentBuckets: () => void
  updateSettings: (settings: Partial<BucketSettings>) => void
  getRecentBucketsForProvider: (providerId: string) => RecentBucket[]
}

const MAX_RECENT_BUCKETS = 10

export const useBucketStore = create<BucketStore>()(
  persist(
    (set, get) => ({
      recentBuckets: [],
      providerBuckets: {},
      lastProviderId: null,
      lastBucketName: null,
      pendingOpenBucket: null,
      settings: {
        autoOpenLastBucket: false
      },

      addRecentBucket: (bucket) => {
        set((state) => {
          // Remove existing entry for this bucket if it exists
          const filtered = state.recentBuckets.filter(
            (b) => !(b.providerId === bucket.providerId && b.bucketName === bucket.bucketName)
          )

          // Add new entry at the beginning
          const newBucket: RecentBucket = {
            ...bucket,
            lastAccessedAt: Date.now()
          }

          // Keep only the most recent MAX_RECENT_BUCKETS
          const updated = [newBucket, ...filtered].slice(0, MAX_RECENT_BUCKETS)

          return {
            recentBuckets: updated,
            lastProviderId: bucket.providerId,
            lastBucketName: bucket.bucketName
          }
        })
      },

      setLastAccessed: (providerId, bucketName) => {
        set({
          lastProviderId: providerId,
          lastBucketName: bucketName
        })
      },

      setProviderBuckets: (providerId, buckets) => {
        set((state) => ({
          providerBuckets: {
            ...state.providerBuckets,
            [providerId]: buckets
          }
        }))
      },

      setPendingOpenBucket: (providerId, bucketName) => {
        set({
          pendingOpenBucket: {
            providerId,
            bucketName
          }
        })
      },

      clearPendingOpenBucket: () => {
        set({ pendingOpenBucket: null })
      },

      clearRecentBuckets: () => {
        set({
          recentBuckets: [],
          lastProviderId: null,
          lastBucketName: null,
          pendingOpenBucket: null
        })
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings
          }
        }))
      },

      getRecentBucketsForProvider: (providerId) => {
        return get().recentBuckets.filter((b) => b.providerId === providerId)
      }
    }),
    {
      name: 'bucket-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
