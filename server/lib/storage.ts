import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Item, StyleSheet } from '../types'

const GENERATED_DIR = path.resolve(process.cwd(), 'generated')
const SHEETS_DIR = path.join(GENERATED_DIR, 'sheets')

async function ensureDirs() {
  await fs.mkdir(SHEETS_DIR, { recursive: true })
}

function sheetDir(sheetId: string) {
  return path.join(SHEETS_DIR, sheetId)
}

export async function ensureSheetDir(sheetId: string): Promise<void> {
  await fs.mkdir(sheetDir(sheetId), { recursive: true })
}

export async function ensureItemDir(
  sheetId: string,
  itemId: string,
): Promise<void> {
  await fs.mkdir(itemDir(sheetId, itemId), { recursive: true })
}

function sheetMetaPath(sheetId: string) {
  return path.join(sheetDir(sheetId), 'metadata.json')
}

function itemDir(sheetId: string, itemId: string) {
  return path.join(sheetDir(sheetId), 'items', itemId)
}

function itemMetaPath(sheetId: string, itemId: string) {
  return path.join(itemDir(sheetId, itemId), 'metadata.json')
}

async function readJsonOrNull<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

/** Migrate legacy sheets/items missing status/startedAt fields */
function normalizeSheet(sheet: StyleSheet): StyleSheet {
  if (!sheet.status) {
    sheet.status = 'ready'
  }
  if (!sheet.startedAt) {
    sheet.startedAt = sheet.createdAt
  }
  for (const item of sheet.items) {
    if (!item.status) {
      item.status = 'ready'
    }
    if (!item.startedAt) {
      item.startedAt = item.createdAt
    }
  }
  return sheet
}

export async function listSheets(): Promise<StyleSheet[]> {
  await ensureDirs()
  const entries = await fs.readdir(SHEETS_DIR, { withFileTypes: true })
  const sheets: StyleSheet[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const meta = await readJsonOrNull<StyleSheet>(
      sheetMetaPath(entry.name),
    )
    if (meta) sheets.push(normalizeSheet(meta))
  }

  sheets.sort((a, b) => b.updatedAt - a.updatedAt)
  return sheets
}

export async function getSheet(sheetId: string): Promise<StyleSheet | null> {
  await ensureDirs()
  const sheet = await readJsonOrNull<StyleSheet>(sheetMetaPath(sheetId))
  return sheet ? normalizeSheet(sheet) : null
}

export async function saveSheet(sheet: StyleSheet): Promise<void> {
  await ensureDirs()
  await fs.mkdir(sheetDir(sheet.id), { recursive: true })
  await fs.writeFile(
    sheetMetaPath(sheet.id),
    JSON.stringify(sheet, null, 2),
    'utf-8',
  )
}

export async function appendItem(
  sheetId: string,
  item: Item,
): Promise<StyleSheet | null> {
  const sheet = await getSheet(sheetId)
  if (!sheet) return null

  sheet.items.push(item)
  sheet.updatedAt = Date.now()

  await fs.mkdir(itemDir(sheetId, item.id), { recursive: true })
  await fs.writeFile(
    itemMetaPath(sheetId, item.id),
    JSON.stringify(item, null, 2),
    'utf-8',
  )
  await saveSheet(sheet)

  return sheet
}

export async function getItem(
  sheetId: string,
  itemId: string,
): Promise<Item | null> {
  const item = await readJsonOrNull<Item>(itemMetaPath(sheetId, itemId))
  if (item && !item.status) {
    item.status = 'ready'
    item.startedAt = item.startedAt || item.createdAt
  }
  return item
}

export async function saveItem(sheetId: string, item: Item): Promise<void> {
  await fs.mkdir(itemDir(sheetId, item.id), { recursive: true })
  await fs.writeFile(
    itemMetaPath(sheetId, item.id),
    JSON.stringify(item, null, 2),
    'utf-8',
  )

  const sheet = await getSheet(sheetId)
  if (sheet) {
    const idx = sheet.items.findIndex((i) => i.id === item.id)
    if (idx >= 0) {
      sheet.items[idx] = item
      sheet.updatedAt = Date.now()
      await saveSheet(sheet)
    }
  }
}

export function referenceImagePath(sheetId: string) {
  return path.join(sheetDir(sheetId), 'reference.png')
}

export async function deleteItemDir(
  sheetId: string,
  itemId: string,
): Promise<void> {
  const dir = itemDir(sheetId, itemId)
  try {
    await fs.rm(dir, { recursive: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}

export async function deleteSheetDir(sheetId: string): Promise<void> {
  const dir = sheetDir(sheetId)
  try {
    await fs.rm(dir, { recursive: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}

export function itemImagePath(
  sheetId: string,
  itemId: string,
  variantId: string,
  type: 'original' | 'processed',
) {
  return path.join(
    itemDir(sheetId, itemId),
    `${type}-${variantId}.png`,
  )
}