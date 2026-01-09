import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Provider } from '@/lib/types'
import { mockProviders } from '@/lib/mock-data'

interface ProviderContextType {
  providers: Provider[]
  selectedProviderId: string | null
  addProvider: (provider: Omit<Provider, 'id' | 'createdAt'>) => void
  updateProvider: (id: string, provider: Partial<Provider>) => void
  deleteProvider: (id: string) => void
  selectProvider: (id: string | null) => void
  getProvider: (id: string) => Provider | undefined
  updateProviderBucket: (providerId: string, bucketName: string) => void
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined)

const STORAGE_KEY = 'oss-providers'
const SELECTED_PROVIDER_KEY = 'oss-selected-provider'

export function ProviderProvider({ children }: { children: ReactNode }) {
  const [providers, setProviders] = useState<Provider[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : mockProviders
  })

  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(() => {
    return localStorage.getItem(SELECTED_PROVIDER_KEY)
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers))
  }, [providers])

  useEffect(() => {
    if (selectedProviderId) {
      localStorage.setItem(SELECTED_PROVIDER_KEY, selectedProviderId)
    } else {
      localStorage.removeItem(SELECTED_PROVIDER_KEY)
    }
  }, [selectedProviderId])

  const addProvider = (provider: Omit<Provider, 'id' | 'createdAt'>) => {
    const newProvider: Provider = {
      ...provider,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    }
    setProviders((prev) => [...prev, newProvider])
  }

  const updateProvider = (id: string, updates: Partial<Provider>) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const deleteProvider = (id: string) => {
    setProviders((prev) => prev.filter((p) => p.id !== id))
    if (selectedProviderId === id) {
      setSelectedProviderId(null)
    }
  }

  const selectProvider = (id: string | null) => {
    setSelectedProviderId(id)
  }

  const getProvider = (id: string) => {
    return providers.find((p) => p.id === id)
  }

  const updateProviderBucket = (providerId: string, bucketName: string) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.id === providerId ? { ...p, bucket: bucketName, selectedBucket: bucketName } : p
      )
    )
  }

  return (
    <ProviderContext.Provider
      value={{
        providers,
        selectedProviderId,
        addProvider,
        updateProvider,
        deleteProvider,
        selectProvider,
        getProvider,
        updateProviderBucket
      }}
    >
      {children}
    </ProviderContext.Provider>
  )
}

export function useProviders() {
  const context = useContext(ProviderContext)
  if (!context) {
    throw new Error('useProviders must be used within a ProviderProvider')
  }
  return context
}
