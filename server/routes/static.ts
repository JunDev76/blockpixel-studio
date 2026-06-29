import type { FastifyInstance } from 'fastify'
import { promises as fs } from 'node:fs'
import {
  itemImagePath,
  referenceImagePath,
} from '../lib/storage'

export async function staticRoutes(app: FastifyInstance) {
  // GET /api/sheets/:sheetId/reference.png
  app.get<{ Params: { sheetId: string } }>(
    '/api/sheets/:sheetId/reference.png',
    async (req, reply) => {
      try {
        const buffer = await fs.readFile(
          referenceImagePath(req.params.sheetId),
        )
        reply.type('image/png')
        return buffer
      } catch {
        reply.code(404)
        return { error: 'Reference image not found' }
      }
    },
  )

  // GET /api/sheets/:sheetId/items/:itemId/variants/:variantId/original.png
  app.get<{
    Params: {
      sheetId: string
      itemId: string
      variantId: string
    }
  }>(
    '/api/sheets/:sheetId/items/:itemId/variants/:variantId/original.png',
    async (req, reply) => {
      const { sheetId, itemId, variantId } = req.params
      try {
        const buffer = await fs.readFile(
          itemImagePath(sheetId, itemId, variantId, 'original'),
        )
        reply.type('image/png')
        return buffer
      } catch {
        reply.code(404)
        return { error: 'Image not found' }
      }
    },
  )

  // GET /api/sheets/:sheetId/items/:itemId/variants/:variantId/processed.png
  app.get<{
    Params: {
      sheetId: string
      itemId: string
      variantId: string
    }
  }>(
    '/api/sheets/:sheetId/items/:itemId/variants/:variantId/processed.png',
    async (req, reply) => {
      const { sheetId, itemId, variantId } = req.params
      try {
        const buffer = await fs.readFile(
          itemImagePath(sheetId, itemId, variantId, 'processed'),
        )
        reply.type('image/png')
        return buffer
      } catch {
        reply.code(404)
        return { error: 'Image not found' }
      }
    },
  )
}