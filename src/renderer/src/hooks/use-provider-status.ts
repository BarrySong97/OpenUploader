import type { Provider } from '@renderer/db'
import { trpc } from '@renderer/lib/trpc'

export interface ProviderStats {
  buckets: { name: string; creationDate?: string }[]
  bucketCount: number
}

export interface ProviderStatus {
  isLoading: boolean
  isConnected: boolean
  error?: string
  stats?: ProviderStats
}

export function useProviderStatus(provider: Provider) {
  const connectionQuery = trpc.provider.testConnection.useQuery(provider, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  const statsQuery = trpc.provider.getStats.useQuery(provider, {
    enabled: connectionQuery.data?.connected === true,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  // Use isFetching to detect refresh loading state (isLoading is only for initial load)
  const isLoading =
    connectionQuery.isLoading ||
    connectionQuery.isFetching ||
    (connectionQuery.data?.connected && (statsQuery.isLoading || statsQuery.isFetching))

  return {
    isLoading,
    isConnected: connectionQuery.data?.connected ?? false,
    error: connectionQuery.error?.message ?? connectionQuery.data?.error,
    stats: statsQuery.data,
    refresh: () => {
      connectionQuery.refetch()
      statsQuery.refetch()
    }
  }
}
