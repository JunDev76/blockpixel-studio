import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import {
  AlertCircle,
  ArrowLeft,
  Download,
  Loader2,
  RefreshCw,
  Star,
  Trash2,
  Wand2,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Shimmer } from '@/components/Shimmer'
import { ElapsedTime } from '@/components/ElapsedTime'
import { PixelGridOverlay, PixelGridToggle } from '@/components/PixelGrid'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSheet, useStore, usePolling, usePixelGrid } from '@/hooks'
import { api } from '@/api'
import type { Resolution } from '@/types'

export function ItemDetailPage() {
  const { sheetId, itemId } = useParams<{ sheetId: string; itemId: string }>()
  const sheet = useSheet(sheetId)
  const { refreshSheet, deleteVariant, reprocessVariant, regenerateVariant, providers, loadProviders } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  const item = sheet?.items.find((i) => i.id === itemId)
  const [settingMain, setSettingMain] = useState<string | null>(null)
  const [reproResolutions, setReproResolutions] = useState<Record<string, Resolution>>({})
  const [regeneratingVariants, setRegeneratingVariants] = useState<Set<string>>(new Set())
  const [gridEnabled, setGridEnabled] = usePixelGrid()

  const modelNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of providers) {
      for (const m of p.models) {
        map.set(`${p.id}::${m.id}`, m.displayName)
      }
    }
    return map
  }, [providers])

  useEffect(() => {
    if (providers.length === 0) loadProviders()
  }, [providers.length, loadProviders])

  const returnToSheet = () => {
    if (!sheetId) return
    if (location.state && typeof location.state === 'object' && 'fromSheet' in location.state) {
      navigate(-1)
      return
    }
    navigate(`/sheets/${sheetId}`)
  }

  async function handleRegenerate(variantId: string, resolution: Resolution) {
    if (!sheetId || !itemId) return
    setRegeneratingVariants((prev) => new Set(prev).add(variantId))
    try {
      await regenerateVariant(sheetId, itemId, variantId, resolution)
      setReproResolutions((prev) => {
        const next = { ...prev }
        delete next[variantId]
        return next
      })
    } catch {
      // Ignore; polling will update
    } finally {
      setRegeneratingVariants((prev) => {
        const next = new Set(prev)
        next.delete(variantId)
        return next
      })
    }
  }

  async function handleReprocess(variantId: string, resolution: Resolution) {
    if (!sheetId || !itemId) return
    try {
      await reprocessVariant(sheetId, itemId, variantId, resolution)
      setReproResolutions((prev) => {
        const next = { ...prev }
        delete next[variantId]
        return next
      })
    } catch {
      // Ignore; user can retry
    }
  }

  async function handleSetMain(variantId: string) {
    if (!sheetId || !itemId) return
    setSettingMain(variantId)
    try {
      await api.setMainVariant(sheetId, itemId, variantId)
      refreshSheet(sheetId)
    } catch {
      // Ignore; will retry
    } finally {
      setSettingMain(null)
    }
  }

  usePolling(
    async () => {
      if (sheetId) await refreshSheet(sheetId)
    },
    2000,
    !!sheetId && (item?.status === 'generating' || item?.variants.some((v) => v.status === 'generating') === true),
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      returnToSheet()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  if (!sheet) {
    return <div className="text-sm text-muted-foreground">Style sheet not found.</div>
  }

  if (!item || !sheetId) {
    return <div className="text-sm text-muted-foreground">Item not found.</div>
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto pr-1">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <Button
            variant="ghost"
            className="h-8 gap-1.5 px-2 text-muted-foreground"
            onClick={returnToSheet}
          >
            <ArrowLeft className="size-4" />
            Back to sheet
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Pixel grid</span>
            <PixelGridToggle enabled={gridEnabled} onChange={setGridEnabled} />
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-medium">{item.prompt}</h2>
          <p className="text-sm text-muted-foreground">
            {item.resolution}×{item.resolution} · {item.variants.length} variant
            {item.variants.length === 1 ? '' : 's'}
            {item.status === 'generating' && ' · Generating…'}
          </p>
          {item.status === 'error' && item.errorMessage && (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-3.5" />
              {item.errorMessage}
            </p>
          )}
        </div>

        {item.variants.map((variant, idx) => {
          const isMain = item.mainVariantId === variant.id
          const isGenerating = variant.status === 'generating' || item.status === 'generating'
          const isRegenerating = regeneratingVariants.has(variant.id)
          const currentResolution = variant.resolution ?? item.resolution
          const selectedResolution = reproResolutions[variant.id] ?? currentResolution

          return (
            <section
              key={variant.id}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              {/* Variant header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-medium">
                    <Wand2 className="size-4 text-muted-foreground" />
                    Variation {idx + 1}
                  </h3>
                  {variant.modelId && (
                    <span className="text-xs text-muted-foreground/70">
                      {modelNames.get(`${variant.providerId ?? 'openrouter'}::${variant.modelId}`) ?? variant.modelId}
                    </span>
                  )}
                  {isMain && (
                    <Badge variant="secondary" className="text-[10px]">
                      Main
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {item.variants.length > 1 && !isMain && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 px-2 text-xs"
                      disabled={settingMain === variant.id || isGenerating}
                      onClick={() => handleSetMain(variant.id)}
                    >
                      {settingMain === variant.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Star className="size-3" />
                      )}
                      Set main
                    </Button>
                  )}
                  {item.variants.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10"
                      disabled={isGenerating}
                      onClick={async () => {
                        if (!sheetId || !itemId) return
                        if (!confirm('Delete this variant? Other variants stay available.')) return
                        await deleteVariant(sheetId, itemId, variant.id)
                      }}
                    >
                      <Trash2 className="size-3" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              {/* Images */}
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                <figure className="space-y-2">
                  <figcaption className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Generated Image</span>
                    <a
                      href={api.itemDownloadOriginalPngUrl(sheet.id, item.id)}
                      download
                      className="flex items-center gap-1 text-[10px] text-muted-foreground/70 transition-colors hover:text-foreground"
                    >
                      <Download className="size-3" />
                      PNG
                    </a>
                  </figcaption>
                  <div className="aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                    {variant.originalUrl ? (
                      <img
                        src={variant.originalUrl}
                        alt={`${item.prompt} original ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : variant.errorMessage || item.errorMessage ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2">
                        <span className="text-xs text-destructive">Failed</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-2">
                          {variant.errorMessage || item.errorMessage}
                        </span>
                      </div>
                    ) : isGenerating ? (
                      <Shimmer className="h-full w-full">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Generating original…</span>
                        <ElapsedTime
                          startedAt={item.startedAt}
                          className="text-[10px] tabular-nums text-muted-foreground/60"
                        />
                      </Shimmer>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                        Not generated
                      </div>
                    )}
                  </div>
                </figure>

                <figure className="space-y-2">
                  <figcaption className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Game-Ready Texture</span>
                    <span className="flex items-center gap-2">
                      {currentResolution !== item.resolution && (
                        <span className="text-muted-foreground/70">{currentResolution}×{currentResolution}</span>
                      )}
                      <a
                        href={api.itemDownloadPngUrl(sheet.id, item.id)}
                        download
                        className="flex items-center gap-1 text-[10px] text-muted-foreground/70 transition-colors hover:text-foreground"
                      >
                        <Download className="size-3" />
                        PNG
                      </a>
                    </span>
                  </figcaption>
                  <div
                    className="checkerboard relative aspect-square overflow-hidden rounded-lg border border-border shadow-[inset_0_0_0_1px_var(--border)]"
                    style={{ '--checkerboard-size': `${100 / currentResolution}%` } as CSSProperties}
                  >
                    {isGenerating ? (
                      <Shimmer className="h-full w-full">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Processing pixel art…</span>
                        <ElapsedTime
                          startedAt={item.startedAt}
                          className="text-[10px] tabular-nums text-muted-foreground/60"
                        />
                      </Shimmer>
                    ) : variant.processedUrl ? (
                      <>
                        <img
                          src={variant.processedUrl}
                          alt={`${item.prompt} processed ${idx + 1}`}
                          className="pixelated h-full w-full object-cover"
                        />
                        <PixelGridOverlay resolution={currentResolution} enabled={gridEnabled} />
                      </>
                    ) : variant.status === 'error' || variant.errorMessage ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2">
                        <span className="text-xs text-destructive">Failed</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-2">
                          {variant.errorMessage}
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                        Not generated
                      </div>
                    )}
                  </div>
                </figure>
              </div>

              {/* Controls */}
              <div className="border-t border-border bg-muted/30 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Resolution</span>
                      <Select
                        value={String(selectedResolution)}
                        onValueChange={(v) =>
                          setReproResolutions((prev) => ({ ...prev, [variant.id]: Number(v) as Resolution }))
                        }
                        disabled={isGenerating}
                      >
                        <SelectTrigger size="sm" className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="16">16×16</SelectItem>
                          <SelectItem value="32">32×32</SelectItem>
                          <SelectItem value="64">64×64</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        disabled={
                          isGenerating ||
                          isRegenerating ||
                          selectedResolution === currentResolution
                        }
                        onClick={() => handleReprocess(variant.id, selectedResolution)}
                      >
                        <RefreshCw className="size-3.5" />
                        Reprocess
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 gap-1.5"
                        disabled={isGenerating || isRegenerating}
                        onClick={() => handleRegenerate(variant.id, selectedResolution)}
                      >
                        {isRegenerating ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="size-3.5" />
                        )}
                        Regenerate
                      </Button>
                    </div>
                  </div>

                  <a href={api.itemDownloadZipUrl(sheet.id, item.id)} download>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs text-muted-foreground">
                      <Package className="size-3.5" />
                      Download ZIP
                    </Button>
                  </a>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
