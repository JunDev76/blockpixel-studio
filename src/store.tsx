import {
  createContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { Item, ModelRequest, ProviderInfo, Resolution, StyleSheet } from '@/types'
import { api } from '@/api'

type Store = {
  sheets: StyleSheet[]
  providers: ProviderInfo[]
  loading: boolean
  error: string | null
  loadSheets: () => Promise<void>
  loadProviders: () => Promise<void>
  createSheet: (prompt: string, providerId?: string, modelId?: string) => Promise<StyleSheet>
  deleteSheet: (sheetId: string) => Promise<void>
  duplicateSheet: (sheetId: string) => Promise<StyleSheet>
  deleteItem: (sheetId: string, itemId: string) => Promise<void>
  deleteVariant: (sheetId: string, itemId: string, variantId: string) => Promise<Item>
  reprocessVariant: (sheetId: string, itemId: string, variantId: string, resolution: Resolution) => Promise<Item>
  regenerateVariant: (sheetId: string, itemId: string, variantId: string, resolution: Resolution) => Promise<Item>
  createItem: (
    sheetId: string,
    prompt: string,
    resolution: Resolution,
    models: ModelRequest[],
  ) => Promise<Item>
  refreshSheet: (sheetId: string) => Promise<void>
}

export const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [sheets, setSheets] = useState<StyleSheet[]>([])
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSheets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await api.listSheets()
      setSheets(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sheets')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProviders = useCallback(async () => {
    try {
      const list = await api.listProviders()
      setProviders(list)
    } catch {
      // providers list is non-critical; leave empty
    }
  }, [])

  const createSheet = useCallback(
    async (prompt: string, providerId?: string, modelId?: string) => {
      const sheet = await api.createSheet(prompt, providerId, modelId)
      setSheets((prev) => [sheet, ...prev])
      return sheet
    },
    [],
  )

  const deleteSheet = useCallback(async (sheetId: string) => {
    await api.deleteSheet(sheetId)
    setSheets((prev) => prev.filter((s) => s.id !== sheetId))
  }, [])

  const duplicateSheet = useCallback(async (sheetId: string) => {
    const sheet = await api.duplicateSheet(sheetId)
    setSheets((prev) => [sheet, ...prev])
    return sheet
  }, [])

  const deleteItem = useCallback(async (sheetId: string, itemId: string) => {
    await api.deleteItem(sheetId, itemId)
    setSheets((prev) =>
      prev.map((s) =>
        s.id === sheetId
          ? { ...s, items: s.items.filter((i) => i.id !== itemId), updatedAt: Date.now() }
          : s,
      ),
    )
  }, [])

  const deleteVariant = useCallback(async (sheetId: string, itemId: string, variantId: string) => {
    const item = await api.deleteVariant(sheetId, itemId, variantId)
    setSheets((prev) =>
      prev.map((s) =>
        s.id === sheetId
          ? { ...s, items: s.items.map((i) => (i.id === itemId ? item : i)), updatedAt: Date.now() }
          : s,
      ),
    )
  }, [])

  const createItem = useCallback(
    async (
      sheetId: string,
      prompt: string,
      resolution: Resolution,
      models: ModelRequest[],
    ) => {
      const item = await api.createItem(
        sheetId,
        prompt,
        resolution,
        models,
      )
      setSheets((prev) =>
        prev.map((s) =>
          s.id === sheetId
            ? { ...s, items: [...s.items, item], updatedAt: Date.now() }
            : s,
        ),
      )
      return item
    },
    [],
  )

  const reprocessVariant = useCallback(async (sheetId: string, itemId: string, variantId: string, resolution: Resolution) => {
    const item = await api.reprocessVariant(sheetId, itemId, variantId, resolution)
    setSheets((prev) =>
      prev.map((s) =>
        s.id === sheetId
          ? { ...s, items: s.items.map((i) => (i.id === itemId ? item : i)), updatedAt: Date.now() }
          : s,
      ),
    )
    return item
  }, [])

  const regenerateVariant = useCallback(async (sheetId: string, itemId: string, variantId: string, resolution: Resolution) => {
    const item = await api.regenerateVariant(sheetId, itemId, variantId, resolution)
    setSheets((prev) =>
      prev.map((s) =>
        s.id === sheetId
          ? { ...s, items: s.items.map((i) => (i.id === itemId ? item : i)), updatedAt: Date.now() }
          : s,
      ),
    )
    return item
  }, [])

  const refreshSheet = useCallback(async (sheetId: string) => {
    const sheet = await api.getSheet(sheetId)
    setSheets((prev) =>
      prev.map((s) => (s.id === sheetId ? sheet : s)),
    )
  }, [])

  return (
    <StoreContext.Provider
      value={{ sheets, providers, loading, error, loadSheets, loadProviders, createSheet, deleteSheet, duplicateSheet, deleteItem, deleteVariant, reprocessVariant, regenerateVariant, createItem, refreshSheet }}
    >
      {children}
    </StoreContext.Provider>
  )
}