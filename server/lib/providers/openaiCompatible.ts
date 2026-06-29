import OpenAI, { toFile } from 'openai'
import type {
  GenerateImageOptions,
  GenerateImageResult,
  ImageProvider,
  ModelInfo,
} from '../imageProvider'

export type OpenAICompatibleConfig = {
  id: string
  displayName: string
  apiKey: string
  baseURL?: string
  // 이미지 생성에 사용할 모델명
  defaultModel: string
  // 노출할 모델 목록
  models?: readonly ModelInfo[]
}

/**
 * OpenAI Images API 호환 provider 베이스.
 * - reference image 없으면 images.generate
 * - reference image 있으면 images.edit (스타일 참조)
 * OpenAI, OpenRouter 등 동일 스펙을 쓰는 provider 공통 로직.
 */
export function createOpenAICompatibleProvider(
  config: OpenAICompatibleConfig,
): ImageProvider {
  const models = config.models ?? [{ id: config.defaultModel, displayName: config.defaultModel }]

  return {
    id: config.id,
    displayName: config.displayName,
    models,

    async generate(
      opts: GenerateImageOptions,
    ): Promise<GenerateImageResult> {
      const model = opts.modelId ?? config.defaultModel
      const client = new OpenAI({
        apiKey: config.apiKey,
        ...(config.baseURL ? { baseURL: config.baseURL } : {}),
      })

      if (opts.referenceImage) {
        // images.edit: reference image를 스타일 참조로 첨부
        const file = await toFile(opts.referenceImage, 'reference.png', {
          type: 'image/png',
        })
        const res = await client.images.edit({
          model,
          image: file,
          prompt: opts.prompt,
          output_format: 'png',
        })
        return extractResult(res.data?.[0], config.id)
      }

      // images.generate: 텍스트 프롬프트만
      const res = await client.images.generate({
        model,
        prompt: opts.prompt,
        output_format: 'png',
      })
      return extractResult(res.data?.[0], config.id)
    },
  }
}

async function extractResult(
  data:
    | {
        b64_json?: string | null
        url?: string | null
      }
    | undefined,
  providerId: string,
): Promise<GenerateImageResult> {
  if (!data) throw new Error(`No image data from ${providerId}`)

  if (data.b64_json) {
    return { buffer: Buffer.from(data.b64_json, 'base64') }
  }
  if (data.url) {
    const imgRes = await fetch(data.url)
    if (!imgRes.ok) {
      throw new Error(`Failed to fetch image from ${providerId}`)
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer())
    return { buffer, remoteUrl: data.url }
  }

  throw new Error(`No image data from ${providerId}`)
}