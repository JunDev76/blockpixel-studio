import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import type { Item, Resolution } from '../types'
import { getProvider, getProviderForModel } from '../lib/providers/registry'
import {
  appendItem,
  deleteItemDir,
  ensureItemDir,
  getSheet,
  getItem,
  itemImagePath,
  referenceImagePath,
  saveItem,
  saveSheet,
} from '../lib/storage'
import { buildItemPrompt } from '../lib/prompts'
import { processImage } from '../lib/postprocess'

type ModelRequest = {
  providerId?: string
  modelId: string
  count: number
}

type CreateItemBody = {
  prompt: string
  resolution: Resolution
  /** Legacy single-model fields. Ignored when models[] provided. */
  providerId?: string
  modelId?: string
  /** Multi-model generation: specify model + count per model */
  models?: ModelRequest[]
}

function isResolution(v: unknown): v is Resolution {
  return v === 16 || v === 32 || v === 64
}

export async function itemsRoutes(app: FastifyInstance) {
  // DELETE /api/sheets/:sheetId/items/:itemId
  app.delete<{ Params: { sheetId: string; itemId: string } }>(
    '/api/sheets/:sheetId/items/:itemId',
    async (req, reply) => {
      const { sheetId, itemId } = req.params
      const sheet = await getSheet(sheetId)
      if (!sheet) {
        reply.code(404)
        return { error: 'Sheet not found' }
      }
      const idx = sheet.items.findIndex((i) => i.id === itemId)
      if (idx < 0) {
        reply.code(404)
        return { error: 'Item not found' }
      }
      sheet.items.splice(idx, 1)
      sheet.updatedAt = Date.now()
      await saveSheet(sheet)
      await deleteItemDir(sheetId, itemId)
      return { ok: true }
    },
  )

  // DELETE /api/sheets/:sheetId/items/:itemId/variants/:variantId
  app.delete<{ Params: { sheetId: string; itemId: string; variantId: string } }>(
    '/api/sheets/:sheetId/items/:itemId/variants/:variantId',
    async (req, reply) => {
      const { sheetId, itemId, variantId } = req.params
      const item = await getItem(sheetId, itemId)
      if (!item) {
        reply.code(404)
        return { error: 'Item not found' }
      }
      const vidx = item.variants.findIndex((v) => v.id === variantId)
      if (vidx < 0) {
        reply.code(404)
        return { error: 'Variant not found' }
      }
      // Remove variant files
      for (const type of ['original', 'processed'] as const) {
        try { await fs.unlink(itemImagePath(sheetId, itemId, variantId, type)) } catch {}
      }
      // If main variant was removed, clear or shift
      if (item.mainVariantId === variantId) {
        item.mainVariantId = item.variants.length > 1
          ? item.variants.find((v) => v.id !== variantId)?.id
          : undefined
      }
      item.variants.splice(vidx, 1)
      await saveItem(sheetId, item)
      return { item }
    },
  )

  // PATCH /api/sheets/:sheetId/items/:itemId/main-variant
  app.patch<{ Params: { sheetId: string; itemId: string }; Body: { variantId: string } }>(
    '/api/sheets/:sheetId/items/:itemId/main-variant',
    async (req, reply) => {
      const { sheetId, itemId } = req.params
      const { variantId } = req.body ?? {}
      if (!variantId) {
        reply.code(400)
        return { error: 'variantId is required' }
      }
      const item = await getItem(sheetId, itemId)
      if (!item) {
        reply.code(404)
        return { error: 'Item not found' }
      }
      if (!item.variants.find((v) => v.id === variantId)) {
        reply.code(400)
        return { error: 'Variant not found in this item' }
      }
      item.mainVariantId = variantId
      await saveItem(sheetId, item)
      return { item }
    },
  )

  // POST /api/sheets/:sheetId/items/:itemId/variants/:variantId/regenerate
  // 특정 variant를 AI로 다시 생성 + postprocess (해상도 변경 가능)
  app.post<{
    Params: { sheetId: string; itemId: string; variantId: string }
    Body: { resolution: Resolution }
  }>(
    '/api/sheets/:sheetId/items/:itemId/variants/:variantId/regenerate',
    async (req, reply) => {
      const { sheetId, itemId, variantId } = req.params
      const { resolution } = req.body ?? { resolution: 32 }
      if (!isResolution(resolution)) {
        reply.code(400)
        return { error: 'resolution must be 16, 32, or 64' }
      }

      const item = await getItem(sheetId, itemId)
      if (!item) {
        reply.code(404)
        return { error: 'Item not found' }
      }
      const variant = item.variants.find((v) => v.id === variantId)
      if (!variant) {
        reply.code(404)
        return { error: 'Variant not found' }
      }

      item.startedAt = Date.now()
      variant.status = 'generating'
      variant.errorMessage = undefined
      await saveItem(sheetId, item)

      // Fire-and-forget: re-generate from AI then reprocess
      ;(async () => {
        try {
          const refBuffer = await fs.readFile(referenceImagePath(sheetId))
          const fullPrompt = buildItemPrompt(item.prompt.trim(), resolution)
          const provider = variant.providerId
            ? getProvider(variant.providerId)
            : variant.modelId
              ? getProviderForModel(variant.modelId)
              : getProvider('openrouter')

          const { buffer } = await provider.generate({
            prompt: fullPrompt,
            referenceImage: refBuffer,
            modelId: variant.modelId,
          })
          const processed = await processImage(buffer, resolution)
          await fs.writeFile(itemImagePath(sheetId, itemId, variantId, 'original'), buffer)
          await fs.writeFile(itemImagePath(sheetId, itemId, variantId, 'processed'), processed)

          const currentItem = await getItem(sheetId, itemId)
          if (!currentItem) return
          const v = currentItem.variants.find((x) => x.id === variantId)
          if (v) {
            v.originalUrl =
              `/api/sheets/${sheetId}/items/${itemId}/variants/${variantId}/original.png?t=${Date.now()}`
            v.processedUrl =
              `/api/sheets/${sheetId}/items/${itemId}/variants/${variantId}/processed.png?t=${Date.now()}`
            v.resolution = resolution
            v.status = 'ready'
            v.errorMessage = undefined
          }
          await saveItem(sheetId, currentItem)
        } catch (err) {
          const reason = err instanceof Error ? err.message : 'Unknown error'
          app.log.error({ err, sheetId, itemId, variantId }, 'Failed to regenerate variant')
          const currentItem = await getItem(sheetId, itemId)
          if (currentItem) {
            const v = currentItem.variants.find((x) => x.id === variantId)
            if (v) {
              v.status = 'error'
              v.errorMessage = reason
            }
            await saveItem(sheetId, currentItem)
          }
        }
      })()

      return { item }
    },
  )

  // POST /api/sheets/:sheetId/items/:itemId/variants/:variantId/reprocess
  // 특정 variant의 original 이미지로 proper pixel art + 배경 제거 재실행 (해상도 변경)
  app.post<{
    Params: { sheetId: string; itemId: string; variantId: string }
    Body: { resolution: Resolution }
  }>(
    '/api/sheets/:sheetId/items/:itemId/variants/:variantId/reprocess',
    async (req, reply) => {
      const { sheetId, itemId, variantId } = req.params
      const { resolution } = req.body ?? { resolution: 32 }
      if (!isResolution(resolution)) {
        reply.code(400)
        return { error: 'resolution must be 16, 32, or 64' }
      }

      const item = await getItem(sheetId, itemId)
      if (!item) {
        reply.code(404)
        return { error: 'Item not found' }
      }
      const variant = item.variants.find((v) => v.id === variantId)
      if (!variant) {
        reply.code(404)
        return { error: 'Variant not found' }
      }

      item.startedAt = Date.now()
      variant.status = 'generating'
      variant.errorMessage = undefined
      await saveItem(sheetId, item)

      // Fire-and-forget: reprocess this variant from saved original
      ;(async () => {
        try {
          const buffer = await fs.readFile(
            itemImagePath(sheetId, itemId, variantId, 'original'),
          )
          const processed = await processImage(buffer, resolution)
          await fs.writeFile(itemImagePath(sheetId, itemId, variantId, 'processed'), processed)

          const currentItem = await getItem(sheetId, itemId)
          if (!currentItem) return
          const v = currentItem.variants.find((x) => x.id === variantId)
          if (v) {
            v.resolution = resolution
            v.processedUrl =
              `/api/sheets/${sheetId}/items/${itemId}/variants/${variantId}/processed.png?t=${Date.now()}`
            v.status = 'ready'
            v.errorMessage = undefined
          }
          await saveItem(sheetId, currentItem)
        } catch (err) {
          const reason = err instanceof Error ? err.message : 'Unknown error'
          app.log.error({ err, sheetId, itemId, variantId }, 'Failed to reprocess variant')
          const currentItem = await getItem(sheetId, itemId)
          if (currentItem) {
            const v = currentItem.variants.find((x) => x.id === variantId)
            if (v) {
              v.status = 'error'
              v.errorMessage = reason
            }
            await saveItem(sheetId, currentItem)
          }
        }
      })()

      return { item }
    },
  )

  app.post<{ Params: { sheetId: string }; Body: CreateItemBody }>(
    '/api/sheets/:sheetId/items',
    async (req, reply) => {
      const { sheetId } = req.params
      const { prompt, resolution, modelId, models } = req.body ?? {
        prompt: '',
        resolution: 32,
      }

      if (!prompt || !prompt.trim()) {
        reply.code(400)
        return { error: 'prompt is required' }
      }
      if (!isResolution(resolution)) {
        reply.code(400)
        return { error: 'resolution must be 16, 32, or 64' }
      }

      const sheet = await getSheet(sheetId)
      if (!sheet) {
        reply.code(404)
        return { error: 'Sheet not found' }
      }

      if (sheet.status !== 'ready') {
        reply.code(409)
        return { error: 'Style sheet is still generating. Please wait for it to complete.' }
      }

      // Determine variant specs: either from models[] or legacy single model
      const variantSpecs: ModelRequest[] = models?.length
        ? models.filter((m) => m.modelId && m.count > 0)
        : [{ modelId: modelId || '', count: 1 }]

      const itemId = `item-${randomUUID()}`
      const now = Date.now()
      const fullPrompt = buildItemPrompt(prompt.trim(), resolution)

      // Create placeholder variants
      const variants = variantSpecs.flatMap((spec) =>
        Array.from({ length: spec.count }, () => ({
          id: `v-${randomUUID()}`,
          providerId: spec.providerId,
          modelId: spec.modelId || undefined,
          originalUrl: '',
          processedUrl: '',
          status: 'generating',
        })),
      )

      const item: Item = {
        id: itemId,
        sheetId,
        prompt: prompt.trim(),
        resolution,
        createdAt: now,
        status: 'generating',
        startedAt: now,
        variants,
      }

      await ensureItemDir(sheetId, itemId)
      await appendItem(sheetId, item)
      reply.code(201)

      // Fire-and-forget: generate all variants in parallel
      ;(async () => {
        try {
          const refBuffer = await fs.readFile(referenceImagePath(sheetId))

          const results = await Promise.allSettled(
            variants.map(async (v) => {
              const provider = v.providerId ? getProvider(v.providerId) : v.modelId ? getProviderForModel(v.modelId) : getProvider('openrouter')
              const { buffer } = await provider.generate({
                prompt: fullPrompt,
                referenceImage: refBuffer,
                modelId: v.modelId,
              })
              const processed = await processImage(buffer, resolution)
              await fs.writeFile(itemImagePath(sheetId, itemId, v.id, 'original'), buffer)
              await fs.writeFile(itemImagePath(sheetId, itemId, v.id, 'processed'), processed)
              return { id: v.id, ok: true as const }
            }),
          )

          // Re-read item to merge results
          const currentItem = await getItem(sheetId, itemId)
          if (!currentItem) return

          let failCount = 0
          for (let i = 0; i < currentItem.variants.length; i++) {
            const result = results[i]
            if (result.status === 'fulfilled' && result.value.ok) {
              currentItem.variants[i].originalUrl =
                `/api/sheets/${sheetId}/items/${itemId}/variants/${currentItem.variants[i].id}/original.png`
              currentItem.variants[i].processedUrl =
                `/api/sheets/${sheetId}/items/${itemId}/variants/${currentItem.variants[i].id}/processed.png`
              currentItem.variants[i].status = 'ready'
            } else {
              failCount++
              const reason = result.status === 'rejected'
                ? (result.reason instanceof Error ? result.reason.message : 'Unknown error')
                : 'Generation failed'
              currentItem.variants[i].errorMessage = reason
              currentItem.variants[i].status = 'error'
            }
          }

          currentItem.status = failCount >= currentItem.variants.length ? 'error' : 'ready'
          await saveItem(sheetId, currentItem)
        } catch (err) {
          const reason = err instanceof Error ? err.message : 'Unknown error'
          app.log.error({ err, sheetId, itemId }, 'Failed to generate item')
          const currentItem = await getItem(sheetId, itemId)
          if (currentItem) {
            currentItem.status = 'error'
            currentItem.errorMessage = reason
            await saveItem(sheetId, currentItem)
          }
        }
      })()

      return { item }
    },
  )
}