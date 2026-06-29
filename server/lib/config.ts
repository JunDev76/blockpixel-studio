import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import type { ModelInfo } from './imageProvider'

export type ProviderConfig = {
  id: string
  displayName: string
  type: 'openai-compatible' | 'openrouter'
  apiKey?: string
  baseURL?: string
  defaultModel?: string
  models: readonly ModelInfo[]
}

export type AppConfig = {
  defaultProviderId: string
  providers: readonly ProviderConfig[]
}

export function loadConfig(): AppConfig {
  const path = resolveConfigPath()
  const config = parse(readFileSync(path, 'utf8')) as AppConfig
  validateConfig(config)
  return config
}

function resolveConfigPath() {
  const path = resolve(process.env.BLOCKPIXEL_CONFIG ?? 'config/models.yaml')
  if (existsSync(path)) return path

  const source = process.env.BLOCKPIXEL_CONFIG ? 'BLOCKPIXEL_CONFIG' : 'config/models.yaml'
  throw new Error(
    `Model config not found: ${path}\n` +
      `Create config/models.yaml from config/models.example.yaml, or set BLOCKPIXEL_CONFIG to a valid YAML config path.\n` +
      `Example: cp config/models.example.yaml config/models.yaml\n` +
      `Current source: ${source}`,
  )
}

function validateConfig(config: AppConfig) {
  if (!config.defaultProviderId) throw new Error('Missing defaultProviderId')
  if (!Array.isArray(config.providers)) throw new Error('Missing providers')

  const ids = new Set<string>()
  for (const provider of config.providers) {
    if (!provider.id) throw new Error('Provider missing id')
    if (ids.has(provider.id)) throw new Error(`Duplicate provider id: ${provider.id}`)
    ids.add(provider.id)

    if (!provider.displayName) throw new Error(`Provider missing displayName: ${provider.id}`)
    if (!['openai-compatible', 'openrouter'].includes(provider.type)) {
      throw new Error(`Unknown provider type: ${provider.type}`)
    }
    if (!provider.apiKey || !provider.defaultModel) {
      throw new Error(`Provider missing apiKey/defaultModel: ${provider.id}`)
    }
    for (const model of provider.models) {
      if (!model.id || !model.displayName) throw new Error(`Invalid model in provider: ${provider.id}`)
      if (model.outputFormat && model.outputFormat !== 'png' && model.outputFormat !== 'jpeg') {
        throw new Error(`Invalid outputFormat for model: ${model.id}`)
      }
    }
  }

  if (!ids.has(config.defaultProviderId)) {
    throw new Error(`Unknown defaultProviderId: ${config.defaultProviderId}`)
  }
}
