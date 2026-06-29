import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import type { StyleSheet } from '../types'
import {
  getDefaultProvider,
  getProvider,
  getProviderForModel,
  listProviders,
} from '../lib/providers/registry'
import {
  deleteSheetDir,
  ensureSheetDir,
  getSheet,
  listSheets,
  referenceImagePath,
  saveSheet,
} from '../lib/storage'
import { buildStyleSheetPrompt } from '../lib/prompts'

async function generateSheetBackground(
  app: FastifyInstance,
  sheet: StyleSheet,
  fullPrompt: string,
  providerId: string,
  modelId?: string,
) {
  try {
    const provider = modelId ? getProviderForModel(modelId) : providerId ? getProvider(providerId) : getDefaultProvider()
    const { buffer } = await provider.generate({ prompt: fullPrompt, modelId })
    const { promises: fs } = await import('node:fs')
    await fs.writeFile(referenceImagePath(sheet.id), buffer)

    sheet.referenceImageUrl = `/api/sheets/${sheet.id}/reference.png`
    sheet.status = 'ready'
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown error'
    app.log.error({ err, providerId, sheetId: sheet.id }, 'Failed to generate reference sheet')
    sheet.status = 'error'
    sheet.errorMessage = reason
  }

  sheet.updatedAt = Date.now()
  await saveSheet(sheet)
}

export async function sheetsRoutes(app: FastifyInstance) {
  app.get('/api/providers', async () => {
    return { providers: listProviders() }
  })

  app.get('/api/sheets', async () => {
    const sheets = await listSheets()
    return { sheets }
  })

  app.get<{ Params: { sheetId: string } }>(
    '/api/sheets/:sheetId',
    async (req, reply) => {
      const sheet = await getSheet(req.params.sheetId)
      if (!sheet) {
        reply.code(404)
        return { error: 'Sheet not found' }
      }
      return { sheet }
    },
  )

  // DELETE /api/sheets/:sheetId
  app.delete<{ Params: { sheetId: string } }>(
    '/api/sheets/:sheetId',
    async (req, reply) => {
      const { sheetId } = req.params
      const sheet = await getSheet(sheetId)
      if (!sheet) {
        reply.code(404)
        return { error: 'Sheet not found' }
      }
      await deleteSheetDir(sheetId)
      return { ok: true }
    },
  )

  // POST /api/sheets/:sheetId/duplicate
  app.post<{ Params: { sheetId: string } }>(
    '/api/sheets/:sheetId/duplicate',
    async (req, reply) => {
      const { sheetId } = req.params
      const sheet = await getSheet(sheetId)
      if (!sheet) {
        reply.code(404)
        return { error: 'Sheet not found' }
      }
      const id = `sheet-${randomUUID()}`
      const now = Date.now()
      const dup: StyleSheet = {
        id,
        prompt: sheet.prompt,
        referenceImageUrl: '',
        createdAt: now,
        updatedAt: now,
        status: 'generating',
        startedAt: now,
        items: [],
      }
      await ensureSheetDir(id)
      await saveSheet(dup)
      reply.code(201)

      // Re-generate reference with same provider/model as original
      generateSheetBackground(app, dup, buildStyleSheetPrompt(sheet.prompt), '', undefined).catch(() => {})

      return { sheet: dup }
    },
  )

  app.post<{ Body: { prompt: string; providerId?: string; modelId?: string } }>(
    '/api/sheets',
    async (req, reply) => {
      const { prompt, providerId, modelId } = req.body ?? {}
      if (!prompt || !prompt.trim()) {
        reply.code(400)
        return { error: 'prompt is required' }
      }

      const id = `sheet-${randomUUID()}`
      const now = Date.now()
      const fullPrompt = buildStyleSheetPrompt(prompt.trim())

      const sheet: StyleSheet = {
        id,
        prompt: prompt.trim(),
        referenceImageUrl: '',
        createdAt: now,
        updatedAt: now,
        status: 'generating',
        startedAt: now,
        items: [],
      }

      await ensureSheetDir(id)
      await saveSheet(sheet)
      reply.code(201)

      // Fire-and-forget background generation
      generateSheetBackground(app, sheet, fullPrompt, providerId ?? '', modelId).catch(() => {})

      return { sheet }
    },
  )
}