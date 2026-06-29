export type Resolution = 16 | 32 | 64

export type GenerationStatus = 'generating' | 'ready' | 'error'

export type ItemVariant = {
  id: string
  /** Which provider/model generated this variant */
  providerId?: string
  modelId?: string
  originalUrl: string
  processedUrl: string
  status?: GenerationStatus
  resolution?: Resolution
  errorMessage?: string
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