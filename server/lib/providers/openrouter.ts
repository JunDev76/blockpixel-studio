import type {
  GenerateImageOptions,
  GenerateImageResult,
  ImageProvider,
  ModelInfo,
} from '../imageProvider'

type OpenRouterImageResponse = {
  data?: Array<{
    b64_json?: string
    media_type?: string
  }>
  error?: {
    message?: string
    code?: string
  }
}

function buildBody(opts: GenerateImageOptions, model: string, resolution: string, outputFormat: 'png' | 'jpeg') {
  return {
    model,
    prompt: opts.prompt,
    resolution,
    aspect_ratio: '1:1',
    output_format: outputFormat,
    background: 'opaque',
    ...(opts.referenceImage
      ? {
          input_references: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${opts.referenceImage.toString('base64')}`,
              },
            },
          ],
        }
      : {}),
  }
}

export function createOpenRouterProvider(config: {
  id: string
  displayName: string
  apiKey: string
  defaultModel: string
  models: readonly ModelInfo[]
}): ImageProvider {
  return {
    id: config.id,
    displayName: config.displayName,
    models: config.models,

    async generate(opts: GenerateImageOptions): Promise<GenerateImageResult> {
      const model = opts.modelId ?? config.defaultModel
      const modelInfo = config.models.find((m) => m.id === model)
      const resolution = modelInfo?.resolution ?? '1K'
      const outputFormat = modelInfo?.outputFormat ?? 'png'
      const res = await fetch('https://openrouter.ai/api/v1/images', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'BlockPixel Studio',
        },
        body: JSON.stringify(buildBody(opts, model, resolution, outputFormat)),
      })

      const text = await res.text()
      let result: OpenRouterImageResponse
      try {
        result = JSON.parse(text) as OpenRouterImageResponse
      } catch {
        throw new Error(`OpenRouter Image API returned non-JSON ${res.status}`)
      }

      if (!res.ok) {
        const message = result.error?.message ?? text.slice(0, 300)
        console.error('[openrouter] API error', res.status, message, { model, outputFormat })
        throw new Error(`OpenRouter Image API ${res.status}: ${message}`)
      }

      const image = result.data?.[0]
      if (!image?.b64_json) {
        throw new Error('OpenRouter Image API response did not contain b64_json')
      }
      const expectedMediaType = outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png'
      if (image.media_type && image.media_type !== expectedMediaType) {
        throw new Error(`Unsupported OpenRouter media_type: ${image.media_type} (expected ${expectedMediaType})`)
      }

      return { buffer: Buffer.from(image.b64_json, 'base64') }
    },
  }
}