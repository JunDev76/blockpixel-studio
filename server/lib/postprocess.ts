import sharp from 'sharp'
import { pixelate, loadOpenCvNode, createImageData } from 'proper-pixel-art-ts'
import type { ImageDataLike } from 'proper-pixel-art-ts'
import type { Resolution } from '../types'

// proper-pixel-art-ts 기반 정밀 픽셀 아트 변환.
// OpenCV Node runtime으로 mesh detection + downsample + palette quantize.

let cvPromise: Promise<unknown> | null = null

async function getCv() {
  if (!cvPromise) {
    cvPromise = loadOpenCvNode()
  }
  return cvPromise
}

async function toImageData(buffer: Buffer): Promise<ImageDataLike> {
  const img = sharp(buffer, { failOn: 'none' })
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  if (info.channels === 3) {
    // raw RGB → RGBA (pixelate expects RGBA)
    const rgba = new Uint8ClampedArray(info.width * info.height * 4)
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
      rgba[j] = data[i]
      rgba[j + 1] = data[i + 1]
      rgba[j + 2] = data[i + 2]
      rgba[j + 3] = 255
    }
    return createImageData(rgba, info.width, info.height)
  }
  // RGBA: preserve alpha as-is
  return createImageData(new Uint8ClampedArray(data), info.width, info.height)
}

type Rgb = { r: number; g: number; b: number }

const CHROMA_KEY: Rgb = { r: 255, g: 0, b: 255 }
const CHROMA_THRESHOLD_SQUARED = 90 * 90
const CHROMA_DETECT_THRESHOLD_SQUARED = 230 * 230
const BACKGROUND_SAMPLE_RADIUS = 4

function colorDistanceSquared(data: Uint8ClampedArray, offset: number, color: Rgb) {
  const dr = data[offset] - color.r
  const dg = data[offset + 1] - color.g
  const db = data[offset + 2] - color.b
  return dr * dr + dg * dg + db * db
}

function median(values: number[]) {
  return values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
}

function detectBackgroundColor(image: ImageDataLike): Rgb {
  const samples: Rgb[] = []
  const spots = [
    [BACKGROUND_SAMPLE_RADIUS, BACKGROUND_SAMPLE_RADIUS],
    [image.width - 1 - BACKGROUND_SAMPLE_RADIUS, BACKGROUND_SAMPLE_RADIUS],
    [BACKGROUND_SAMPLE_RADIUS, image.height - 1 - BACKGROUND_SAMPLE_RADIUS],
    [image.width - 1 - BACKGROUND_SAMPLE_RADIUS, image.height - 1 - BACKGROUND_SAMPLE_RADIUS],
  ]

  for (const [cx, cy] of spots) {
    for (let y = cy - BACKGROUND_SAMPLE_RADIUS; y <= cy + BACKGROUND_SAMPLE_RADIUS; y++) {
      for (let x = cx - BACKGROUND_SAMPLE_RADIUS; x <= cx + BACKGROUND_SAMPLE_RADIUS; x++) {
        const offset = (y * image.width + x) * 4
        if (colorDistanceSquared(image.data, offset, CHROMA_KEY) > CHROMA_DETECT_THRESHOLD_SQUARED) continue
        samples.push({
          r: image.data[offset],
          g: image.data[offset + 1],
          b: image.data[offset + 2],
        })
      }
    }
  }

  if (samples.length === 0) return CHROMA_KEY
  return {
    r: median(samples.map((sample) => sample.r)),
    g: median(samples.map((sample) => sample.g)),
    b: median(samples.map((sample) => sample.b)),
  }
}

function isNearColor(data: Uint8ClampedArray, offset: number, color: Rgb) {
  return colorDistanceSquared(data, offset, color) <= CHROMA_THRESHOLD_SQUARED
}

function removeChromaBackground(image: ImageDataLike): ImageDataLike {
  const background = detectBackgroundColor(image)
  const data = new Uint8ClampedArray(image.data)
  const visited = new Uint8Array(image.width * image.height)
  const queue: number[] = []

  const push = (x: number, y: number) => {
    const point = y * image.width + x
    if (visited[point]) return
    visited[point] = 1
    if (isNearColor(data, point * 4, background)) queue.push(point)
  }

  for (let x = 0; x < image.width; x++) {
    push(x, 0)
    push(x, image.height - 1)
  }
  for (let y = 1; y < image.height - 1; y++) {
    push(0, y)
    push(image.width - 1, y)
  }

  for (let i = 0; i < queue.length; i++) {
    const point = queue[i]
    const offset = point * 4
    data[offset + 3] = 0

    const x = point % image.width
    const y = Math.floor(point / image.width)
    if (x > 0) push(x - 1, y)
    if (x < image.width - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < image.height - 1) push(x, y + 1)
  }

  return createImageData(data, image.width, image.height)
}

function getOpaqueBounds(image: ImageDataLike) {
  let minX = image.width
  let minY = image.height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const alpha = image.data[(y * image.width + x) * 4 + 3]
      if (alpha === 0) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < minX || maxY < minY) return null
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

export async function processImage(
  buffer: Buffer,
  resolution: Resolution,
): Promise<Buffer> {
  const input = removeChromaBackground(await toImageData(buffer))
  const cv = (await getCv()) as Parameters<typeof pixelate>[1]['cv']

  const result = await pixelate(input, {
    cv,
    transparentBackground: false,
  })

  const source = sharp(Buffer.from(result.data), {
    raw: {
      width: result.width,
      height: result.height,
      channels: 4,
    },
  })
  const bounds = getOpaqueBounds(result)
  const padding = Math.max(1, Math.round(resolution / 16))
  const innerSize = resolution - padding * 2
  const image = bounds ? source.extract(bounds) : source

  // ImageDataLike → PNG, alpha bbox crop 후 Minecraft 아이템 표준 여백 유지
  return image
    .resize(innerSize, innerSize, {
      fit: 'contain',
      kernel: 'nearest',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
}