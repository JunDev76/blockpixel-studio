import type { Item, ModelRequest, ProviderInfo, Resolution, StyleSheet } from '@/types'

const BASE = '/api'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(msg || `${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  async listSheets(): Promise<StyleSheet[]> {
    const data = await json<{ sheets: StyleSheet[] }>(
      await fetch(`${BASE}/sheets`),
    )
    return data.sheets
  },

  async getSheet(sheetId: string): Promise<StyleSheet> {
    const data = await json<{ sheet: StyleSheet }>(
      await fetch(`${BASE}/sheets/${sheetId}`),
    )
    return data.sheet
  },

  async listProviders(): Promise<ProviderInfo[]> {
    const data = await json<{ providers: ProviderInfo[] }>(
      await fetch(`${BASE}/providers`),
    )
    return data.providers
  },

  async createSheet(
    prompt: string,
    providerId?: string,
    modelId?: string,
  ): Promise<StyleSheet> {
    const data = await json<{ sheet: StyleSheet }>(
      await fetch(`${BASE}/sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, providerId, modelId }),
      }),
    )
    return data.sheet
  },

  async createItem(
    sheetId: string,
    prompt: string,
    resolution: Resolution,
    models: ModelRequest[],
  ): Promise<Item> {
    const data = await json<{ item: Item }>(
      await fetch(`${BASE}/sheets/${sheetId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, resolution, models }),
      }),
    )
    return data.item
  },

  itemDownloadOriginalPngUrl(sheetId: string, itemId: string) {
    return `${BASE}/sheets/${sheetId}/items/${itemId}/download/original.png`
  },

  itemDownloadPngUrl(sheetId: string, itemId: string) {
    return `${BASE}/sheets/${sheetId}/items/${itemId}/download.png`
  },

  itemDownloadZipUrl(sheetId: string, itemId: string) {
    return `${BASE}/sheets/${sheetId}/items/${itemId}/download.zip`
  },

  async deleteSheet(sheetId: string): Promise<void> {
    await json<{ ok: boolean }>(
      await fetch(`${BASE}/sheets/${sheetId}`, { method: 'DELETE' }),
    )
  },

  async duplicateSheet(sheetId: string): Promise<StyleSheet> {
    const data = await json<{ sheet: StyleSheet }>(
      await fetch(`${BASE}/sheets/${sheetId}/duplicate`, { method: 'POST' }),
    )
    return data.sheet
  },

  async deleteItem(sheetId: string, itemId: string): Promise<void> {
    await json<{ ok: boolean }>(
      await fetch(`${BASE}/sheets/${sheetId}/items/${itemId}`, { method: 'DELETE' }),
    )
  },

  async deleteVariant(sheetId: string, itemId: string, variantId: string): Promise<Item> {
    const data = await json<{ item: Item }>(
      await fetch(`${BASE}/sheets/${sheetId}/items/${itemId}/variants/${variantId}`, { method: 'DELETE' }),
    )
    return data.item
  },

  async regenerateVariant(sheetId: string, itemId: string, variantId: string, resolution: Resolution): Promise<Item> {
    const data = await json<{ item: Item }>(
      await fetch(`${BASE}/sheets/${sheetId}/items/${itemId}/variants/${variantId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      }),
    )
    return data.item
  },

  async reprocessVariant(sheetId: string, itemId: string, variantId: string, resolution: Resolution): Promise<Item> {
    const data = await json<{ item: Item }>(
      await fetch(`${BASE}/sheets/${sheetId}/items/${itemId}/variants/${variantId}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      }),
    )
    return data.item
  },

  async setMainVariant(sheetId: string, itemId: string, variantId: string): Promise<Item> {
    const data = await json<{ item: Item }>(
      await fetch(`${BASE}/sheets/${sheetId}/items/${itemId}/main-variant`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId }),
      }),
    )
    return data.item
  },
}