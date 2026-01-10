import { useState, useEffect, useCallback } from 'react'
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
  lastChecked?: number
}

export function useProviderStatus(provider: Provider) {
  const [status, setStatus] = useState<ProviderStatus>({
    isLoading: true,
    isConnected: false
  })

  const refresh = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isLoading: true, error: undefined }))

    try {
      // Test connection first
      const connectionResult = await trpc.provider.testConnection.query(provider)

      if (!connectionResult.connected) {
        setStatus({
          isLoading: false,
          isConnected: false,
          error: connectionResult.error,
          lastChecked: Date.now()
        })
        return
      }

      // Get provider stats
      const stats = await trpc.provider.getStats.query(provider)

      setStatus({
        isLoading: false,
        isConnected: true,
        stats,
        lastChecked: Date.now()
      })
    } catch (error) {
      setStatus({
        isLoading: false,
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: Date.now()
      })
    }
  }, [provider])

  // Auto-refresh on mount and when provider changes
  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    ...status,
    refresh
  }
}
