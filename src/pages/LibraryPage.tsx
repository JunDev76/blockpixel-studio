import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Copy, ImagePlus, Library, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Shimmer } from '@/components/Shimmer'
import { ElapsedTime } from '@/components/ElapsedTime'
import { PreviewableImage } from '@/components/ImagePreview'
import { NewStyleSheetForm } from '@/components/NewStyleSheetForm'
import { useStore } from '@/hooks'

export function LibraryPage() {
  const { sheets, deleteSheet, duplicateSheet } = useStore()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-medium">
            <Library className="size-5" />
            Library
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            All style sheets and their items.
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setModalOpen(true)}>
          <Plus className="size-4" />
          New Style Sheet
        </Button>
      </div>

      {sheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/50 p-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <ImagePlus className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">No style sheets yet</p>
            <p className="text-xs text-muted-foreground">
              Create a new style sheet to start generating items.
            </p>
          </div>
          <Button className="mt-2 gap-1.5" onClick={() => setModalOpen(true)}>
            <Plus className="size-4" />
            Create Style Sheet
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sheets.map((sheet) => (
            <button
              key={sheet.id}
              type="button"
              onClick={() => navigate(`/sheets/${sheet.id}`)}
              className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md"
            >
              <div className="aspect-[3/2] w-full overflow-hidden rounded-md border border-border bg-muted">
                {sheet.status === 'generating' ? (
                  <Shimmer className="h-full w-full">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Generating…</span>
                    <ElapsedTime
                      startedAt={sheet.startedAt}
                      className="text-[10px] tabular-nums text-muted-foreground/60"
                    />
                  </Shimmer>
                ) : sheet.status === 'error' ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-3">
                    <span className="text-xs text-destructive">Generation failed</span>
                    <span className="text-[10px] text-muted-foreground line-clamp-2">
                      {sheet.errorMessage}
                    </span>
                  </div>
                ) : sheet.referenceImageUrl ? (
                  <PreviewableImage
                    src={sheet.referenceImageUrl}
                    alt={sheet.prompt}
                    className="h-full w-full"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    No reference
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between">
                <div className="min-w-0 space-y-1">
                  <span className="block truncate text-sm font-medium">
                    {sheet.prompt}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {sheet.status === 'generating'
                      ? 'Generating…'
                      : sheet.status === 'error'
                        ? 'Failed'
                        : `${sheet.items.length} item${sheet.items.length === 1 ? '' : 's'}`}
                  </span>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground"
                    title="Duplicate"
                    onClick={async (e) => {
                      e.stopPropagation()
                      const dup = await duplicateSheet(sheet.id)
                      navigate(`/sheets/${dup.id}`)
                    }}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    title="Delete"
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (!confirm(`Delete style sheet "${sheet.prompt}"? This also deletes every item in it.`)) return
                      await deleteSheet(sheet.id)
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false)
          }}
        >
          <div className="relative w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-lg">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 size-7 text-muted-foreground"
              onClick={() => setModalOpen(false)}
            >
              <X className="size-4" />
            </Button>
            <NewStyleSheetForm />
          </div>
        </div>
      )}
    </div>
  )
}