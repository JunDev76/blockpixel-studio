export type ModelInfo = {
  id: string
  displayName: string
  resolution?: string
}

export type ProviderInfo = {
  id: string
  displayName: string
  models: ModelInfo[]
}

export type Resolution = 16 | 32 | 64

export type GenerationStatus = 'generating' | 'ready' | 'error'

export type ItemVariant = {
  id: string
  providerId?: string
  modelId?: string
  originalUrl: string
  processedUrl: string
  status?: GenerationStatus
  resolution?: Resolution
  errorMessage?: string
}

export type ModelRequest = {
  providerId: string
  modelId: string
  count: number
}

export type Item = {
  id: string
  sheetId: string
  prompt: string
  resolution: Resolution
  createdAt: number
  status: GenerationStatus
  startedAt: number
  errorMessage?: string
  /** Which variant is the main/representative one */
  mainVariantId?: string
  variants: ItemVariant[]
}

export type StyleSheet = {
  id: string
  prompt: string
  referenceImageUrl: string
  createdAt: number
  updatedAt: number
  status: GenerationStatus
  startedAt: number
  errorMessage?: string
  items: Item[]
}