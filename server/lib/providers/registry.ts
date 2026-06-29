import type { ProviderConfig } from '../config'
import { loadConfig } from '../config'
import type { ImageProvider } from '../imageProvider'
import { createOpenAICompatibleProvider } from './openaiCompatible'
import { createOpenRouterProvider } from './openrouter'

const config = loadConfig()

const providers: ImageProvider[] = config.providers.map(createProvider)
const providerMap = new Map(providers.map((p) => [p.id, p]))

export function getProvider(id: string): ImageProvider {
  const provider = providerMap.get(id)
  if (!provider) throw new Error(`Unknown provider: ${id}`)
  return provider
}

export function listProviders() {
  return providers.map((p) => ({ id: p.id, displayName: p.displayName, models: p.models }))
}

/** Find which provider owns a given model ID */
export function getProviderForModel(modelId: string): ImageProvider {
  for (const provider of providers) {
    if (provider.models.some((m) => m.id === modelId)) {
      return provider
    }
  }
  return getDefaultProvider()
}

export function getDefaultProvider(): ImageProvider {
  return getProvider(config.defaultProviderId)
}

function createProvider(provider: ProviderConfig): ImageProvider {
  if (!provider.apiKey || !provider.defaultModel) {
    throw new Error(`Provider missing apiKey/defaultModel: ${provider.id}`)
  }

  if (provider.type === 'openrouter') {
    return createOpenRouterProvider({
      id: provider.id,
      displayName: provider.displayName,
      apiKey: provider.apiKey,
      defaultModel: provider.defaultModel,
      models: provider.models,
    })
  }

  return createOpenAICompatibleProvider({
    id: provider.id,
    displayName: provider.displayName,
    apiKey: provider.apiKey,
    baseURL: provider.baseURL,
    defaultModel: provider.defaultModel,
    models: provider.models,
  })
}
