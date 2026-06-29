import type { FastifyInstance } from 'fastify'
import { promises as fs } from 'node:fs'
import { ZipArchive } from 'archiver'
import { Writable } from 'node:stream'
import { getItem, itemImagePath } from '../lib/storage'

export async function downloadRoutes(app: FastifyInstance) {
  // GET /api/sheets/:sheetId/items/:itemId/download/original.png
  // 오리지널(original) 첫 번째 변형 PNG 다운로드
  app.get<{
    Params: { sheetId: string; itemId: string }
  }>(
    '/api/sheets/:sheetId/items/:itemId/download/original.png',
    async (req, reply) => {
      const { sheetId, itemId } = req.params
      const item = await getItem(sheetId, itemId)
      if (!item) {
        reply.code(404)
        return { error: 'Item not found' }
      }

      const variant = item.mainVariantId
        ? item.variants.find((v) => v.id === item.mainVariantId)
        : item.variants[0]
      if (!variant) {
        reply.code(404)
        return { error: 'No variant available' }
      }

      try {
        const buffer = await fs.readFile(
          itemImagePath(sheetId, itemId, variant.id, 'original'),
        )
        reply
          .type('image/png')
          .header(
            'Content-Disposition',
            `attachment; filename="${item.prompt.replace(/[^\w-]/g, '_')}_original.png"`,
          )
        return buffer
      } catch {
        reply.code(404)
        return { error: 'Original image not found' }
      }
    },
  )

  // GET /api/sheets/:sheetId/items/:ItemId/download.png
  // 처리된(processed) 첫 번째 변형 PNG 다운로드
  app.get<{
    Params: { sheetId: string; itemId: string }
  }>(
    '/api/sheets/:sheetId/items/:itemId/download.png',
    async (req, reply) => {
      const { sheetId, itemId } = req.params
      const item = await getItem(sheetId, itemId)
      if (!item) {
        reply.code(404)
        return { error: 'Item not found' }
      }

      const variant = item.mainVariantId
        ? item.variants.find((v) => v.id === item.mainVariantId)
        : item.variants[0]
      if (!variant) {
        reply.code(404)
        return { error: 'No variant available' }
      }

      try {
        const buffer = await fs.readFile(
          itemImagePath(sheetId, itemId, variant.id, 'processed'),
        )
        reply
          .type('image/png')
          .header(
            'Content-Disposition',
            `attachment; filename="${item.prompt.replace(/[^\w-]/g, '_')}.png"`,
          )
        return buffer
      } catch {
        reply.code(404)
        return { error: 'Processed image not found' }
      }
    },
  )

  // GET /api/sheets/:sheetId/items/:itemId/download.zip
  // 모든 변형 original + processed + metadata.json 묶음
  app.get<{
    Params: { sheetId: string; itemId: string }
  }>(
    '/api/sheets/:sheetId/items/:itemId/download.zip',
    async (req, reply) => {
      const { sheetId, itemId } = req.params
      const item = await getItem(sheetId, itemId)
      if (!item) {
        reply.code(404)
        return { error: 'Item not found' }
      }

      reply.type('application/zip').header(
        'Content-Disposition',
        `attachment; filename="${item.prompt.replace(/[^\w-]/g, '_')}.zip"`,
      )

      const chunks: Buffer[] = []
      const sink = new Writable({
        write(chunk, _enc, cb) {
          chunks.push(chunk)
          cb()
        },
      })

      const archive = new ZipArchive({ zlib: { level: 9 } })
      archive.pipe(sink)

      for (const [idx, variant] of item.variants.entries()) {
        for (const type of ['original', 'processed'] as const) {
          try {
            const buffer = await fs.readFile(
              itemImagePath(sheetId, itemId, variant.id, type),
            )
            archive.append(buffer, {
              name: `${type}-${idx + 1}.png`,
            })
          } catch {
            // 해당 파일 없으면 스킵
          }
        }
      }

      archive.append(JSON.stringify(item, null, 2), {
        name: 'metadata.json',
      })

      await archive.finalize()
      return Buffer.concat(chunks)
    },
  )
}