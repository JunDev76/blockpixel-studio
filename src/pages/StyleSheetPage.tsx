import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  Copy,
  Grid3X3,
  Image,
  Loader2,
  Minus,
  Plus,
  Ruler,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shimmer } from '@/components/Shimmer'
import { ElapsedTime } from '@/components/ElapsedTime'
import { PixelGridOverlay, PixelGridToggle } from '@/components/PixelGrid'
import { PreviewableImage } from '@/components/ImagePreview'
import { useSheet, useStore, usePolling, usePixelGrid } from '@/hooks'
import type { ModelRequest, Resolution } from '@/types'

function StatusBadge({ status, errorMessage }: { status: string; errorMessage?: string }) {
  if (status === 'generating') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="size-3 animate-spin" />
        Generating
      </Badge>
    )
  }
  if (status === 'error') {
    return <Badge variant="destructive">{errorMessage ?? 'Failed'}</Badge>
  }
  return null
}

/** All available models flattened across all providers */
function allModels(providers: { id: string; displayName: string; models: { id: string; displayName: string; resolution?: string }[] }[]) {
  return providers.flatMap((p) =>
    p.models.map((m) => ({ ...m, providerId: p.id, providerName: p.displayName, value: `${p.id}::${m.id}` })),
  )
}

export function StyleSheetPage() {
  const { sheetId } = useParams<{ sheetId: string }>()
  const sheet = useSheet(sheetId)
  const { createItem, refreshSheet, deleteItem, deleteSheet, duplicateSheet, providers, loadProviders } = useStore()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [resolution, setResolution] = useState<Resolution>(32)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gridEnabled, setGridEnabled] = usePixelGrid()

  // Multi-model selection: each row is { providerId, modelId, count }
  const [modelRows, setModelRows] = useState<ModelRequest[]>([])
  const flatModels = useMemo(() => allModels(providers), [providers])

  useEffect(() => {
    if (providers.length === 0) loadProviders()
  }, [providers.length, loadProviders])

  // Initialize default row when providers load
  useEffect(() => {
    if (flatModels.length > 0 && modelRows.length === 0) {
      setModelRows([{ providerId: flatModels[0].providerId, modelId: flatModels[0].id, count: 1 }])
    }
  }, [flatModels.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function addModelRow() {
    if (flatModels.length === 0) return
    const existing = new Set(modelRows.map((r) => `${r.providerId}::${r.modelId}`))
    const next = flatModels.find((m) => !existing.has(m.value)) ?? flatModels[0]
    setModelRows((prev) => [...prev, { providerId: next.providerId, modelId: next.id, count: 1 }])
  }

  function removeModelRow(idx: number) {
    setModelRows((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateModelRow(idx: number, patch: Partial<ModelRequest>) {
    setModelRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    )
  }

  /** modelId → displayName map */
  const modelNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of providers) {
      for (const m of p.models) {
        map.set(`${p.id}::${m.id}`, `${p.displayName} · ${m.displayName}`)
      }
    }
    return map
  }, [providers])

  // Sort newest first
  const sortedItems = useMemo(
    () => [...(sheet?.items ?? [])].sort((a, b) => b.createdAt - a.createdAt),
    [sheet?.items],
  )

  const isReferenceGenerating = sheet?.status === 'generating'
  const hasError = sheet?.status === 'error'

  usePolling(
    async () => {
      if (sheetId) await refreshSheet(sheetId)
    },
    2000,
    !!sheetId && (isReferenceGenerating || sheet?.items.some((i) => i.status === 'generating') === true),
  )

  if (!sheetId) {
    return <div className="text-sm text-muted-foreground">Invalid sheet.</div>
  }

  if (!sheet) {
    return (
      <div className="text-sm text-muted-foreground">Style sheet not found.</div>
    )
  }

  async function handleCreateItem() {
    if (!sheetId) return
    setBusy(true)
    setError(null)
    try {
      // Filter out rows with count 0
      const models = modelRows.filter((r) => r.count > 0)
      if (models.length === 0) {
        setError('Add at least one model')
        return
      }
      await createItem(sheetId, prompt.trim(), resolution, models)
      setPrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item')
    } finally {
      setBusy(false)
    }
  }

  const totalVariants = modelRows.reduce((sum, r) => sum + r.count, 0)

  return (
    <div className="flex h-full min-h-0 gap-6">
      {/* Left panel: controls */}
      <aside className="min-h-0 w-80 shrink-0 space-y-5 overflow-y-auto pr-1">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Style sheet
          </p>
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 truncate text-base font-medium leading-tight">{sheet.prompt}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
              title="Delete sheet"
              onClick={async () => {
                if (!sheetId || !confirm('Delete this style sheet? This also deletes every item in it.')) return
                await deleteSheet(sheetId)
                navigate('/')
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          <div className="pt-1">
            <StatusBadge status={sheet.status} errorMessage={sheet.errorMessage} />
          </div>
        </div>

        {/* Reference thumbnail */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Image className="size-3.5" />
            Reference
          </Label>
          <div className="overflow-hidden rounded-md border border-border bg-card">
            {isReferenceGenerating ? (
              <Shimmer className="aspect-[3/2] w-full">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Creating reference…</span>
                <ElapsedTime
                  startedAt={sheet.startedAt}
                  className="text-[10px] tabular-nums text-muted-foreground/60"
                />
              </Shimmer>
            ) : hasError ? (
              <div className="flex aspect-[3/2] flex-col items-center justify-center gap-1 p-4">
                <span className="text-xs text-destructive">Generation failed</span>
                <span className="text-[10px] text-muted-foreground line-clamp-2">
                  {sheet.errorMessage}
                </span>
              </div>
            ) : sheet.referenceImageUrl ? (
              <PreviewableImage
                src={sheet.referenceImageUrl}
                alt={sheet.prompt}
                className="aspect-[3/2] w-full"
              />
            ) : (
              <div className="flex aspect-[3/2] items-center justify-center text-xs text-muted-foreground">
                No reference
              </div>
            )}
          </div>
          {sheet.referenceImageUrl && sheet.status === 'ready' && (
            <p className="text-[10px] text-muted-foreground">
              Hover to preview, click to enlarge
            </p>
          )}
        </div>

        {/* Prompt input */}
        <div className="space-y-2">
          <Label
            htmlFor="item-prompt"
            className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <Wand2 className="size-3.5" />
            Create item
          </Label>
          {isReferenceGenerating ? (
            <p className="text-sm text-muted-foreground">
              Available after reference is ready…
            </p>
          ) : (
            <Input
              id="item-prompt"
              placeholder="e.g. honey pickaxe"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          )}
        </div>

        {/* Resolution */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Ruler className="size-3.5" />
            Resolution
          </Label>
          <Select
            value={String(resolution)}
            onValueChange={(v) => setResolution(Number(v) as Resolution)}
            disabled={isReferenceGenerating}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16">16×16</SelectItem>
              <SelectItem value="32">32×32</SelectItem>
              <SelectItem value="64">64×64</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Multi-model selector */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3.5" />
            Models ({totalVariants} variant{totalVariants !== 1 ? 's' : ''})
          </Label>
          <div className="space-y-2">
            {modelRows.map((row, idx) => (
              <div key={idx} className="space-y-2 rounded-lg border border-border bg-card p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Select
                    value={`${row.providerId}::${row.modelId}`}
                    onValueChange={(v) => {
                      const [providerId, modelId] = v.split('::')
                      updateModelRow(idx, { providerId, modelId })
                    }}
                  >
                    <SelectTrigger className="min-w-0 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {flatModels.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.providerName} · {m.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {modelRows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeModelRow(idx)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Variants</span>
                  <div className="inline-flex items-center overflow-hidden rounded-md border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-none border-r"
                      disabled={row.count <= 1}
                      onClick={() => updateModelRow(idx, { count: row.count - 1 })}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="flex h-7 w-8 items-center justify-center text-xs tabular-nums">
                      {row.count}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-none border-l"
                      disabled={row.count >= 4}
                      onClick={() => updateModelRow(idx, { count: row.count + 1 })}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full gap-1"
            disabled={flatModels.length === 0 || modelRows.length >= flatModels.length}
            onClick={addModelRow}
          >
            <Plus className="size-3" />
            Add model
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          className="h-9 w-full gap-1.5"
          disabled={prompt.trim().length === 0 || busy || isReferenceGenerating || modelRows.length === 0}
          onClick={handleCreateItem}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Generate {totalVariants} Variant{totalVariants !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </aside>

      {/* Right panel: items grid */}
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-1">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Image className="size-4" />
            Generated items
          </h3>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{sheet.items.length}</Badge>
            <div className="flex items-center gap-1.5">
              <Grid3X3 className="size-3.5 text-muted-foreground" />
              <PixelGridToggle enabled={gridEnabled} onChange={setGridEnabled} />
            </div>
          </div>
        </div>

        {sheet.items.length === 0 ? (
          <div className="flex h-[calc(100%-2rem)] min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Plus className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No items yet</p>
              <p className="text-xs text-muted-foreground">
                {isReferenceGenerating
                  ? 'Waiting for the style reference to finish…'
                  : 'Type a prompt in the sidebar and generate your first item.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sortedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  navigate(`/sheets/${sheet.id}/items/${item.id}`, {
                    state: { fromSheet: true },
                  })
                }
                className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-md border border-border bg-muted">
                  {item.status === 'generating' ? (
                    <Shimmer className="h-full w-full">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Generating…</span>
                      <ElapsedTime
                        startedAt={item.startedAt}
                        className="text-[10px] tabular-nums text-muted-foreground/60"
                      />
                    </Shimmer>
                  ) : item.status === 'error' ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2">
                      <span className="text-xs text-destructive">Failed</span>
                      <span className="text-[10px] text-muted-foreground line-clamp-2">
                        {item.errorMessage ?? 'Unknown error'}
                      </span>
                    </div>
                  ) : (item.mainVariantId ? item.variants.find((v) => v.id === item.mainVariantId) : item.variants[0])?.processedUrl ? (
                    <>
                      <img
                        src={(item.mainVariantId ? item.variants.find((v) => v.id === item.mainVariantId) : item.variants[0])!.processedUrl}
                        alt={item.prompt}
                        className="pixelated h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <PixelGridOverlay
                        resolution={item.resolution}
                        enabled={gridEnabled}
                      />
                    </>
                  ) : (item.mainVariantId ? item.variants.find((v) => v.id === item.mainVariantId) : item.variants[0])?.originalUrl ? (
                    <img
                      src={(item.mainVariantId ? item.variants.find((v) => v.id === item.mainVariantId) : item.variants[0])!.originalUrl}
                      alt={item.prompt}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {item.prompt}
                    </span>
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                      <span>{item.resolution}×{item.resolution}</span>
                      {item.variants.length > 1 && (
                        <span>{item.variants.length} variants</span>
                      )}
                      <span className="line-clamp-2 flex flex-wrap gap-1">
                        {item.variants
                          .filter((v) => v.modelId)
                          .map((v) => `${v.providerId ?? 'openrouter'}::${v.modelId}`)
                          .filter((key, i, arr) => arr.indexOf(key) === i)
                          .map((key) => (
                            <span key={key} className="rounded bg-muted px-1 py-0.5">
                              {modelNames.get(key) ?? key.split('::')[1]}
                            </span>
                          ))
                        }
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (!confirm(`Delete item "${item.prompt}" and all its variants?`)) return
                      await deleteItem(sheet.id, item.id)
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}