import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { AlertCircle, Cpu, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStore } from '@/hooks'

export function NewStyleSheetForm() {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { createSheet, providers, loadProviders } = useStore()
  const navigate = useNavigate()

  const flatModels = useMemo(
    () => providers.flatMap((p) => p.models.map((m) => ({ ...m, providerId: p.id, providerName: p.displayName, value: `${p.id}::${m.id}` }))),
    [providers],
  )
  const [modelValue, setModelValue] = useState<string>('')

  useEffect(() => {
    if (providers.length === 0) loadProviders()
  }, [providers.length, loadProviders])

  useEffect(() => {
    if (flatModels.length > 0 && !modelValue) {
      setModelValue(flatModels[0].value)
    }
  }, [flatModels.length]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      const [providerId, modelId] = modelValue.split('::')
      const sheet = await createSheet(prompt.trim(), providerId || undefined, modelId || undefined)
      navigate(`/sheets/${sheet.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sheet')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-base font-medium">
          <Wand2 className="size-5" />
          Create Style Sheet
        </h2>
        <p className="text-sm text-muted-foreground">
          Create a Minecraft item texture style reference sheet from your prompt.
        </p>
      </div>

      {flatModels.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Cpu className="size-3.5" />
            AI Model
          </Label>
          <Select value={modelValue} onValueChange={setModelValue}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {flatModels.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.providerName} · {m.displayName}
                  {m.resolution ? ` (${m.resolution})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="concept">Describe style concept</Label>
        <Textarea
          id="concept"
          className="min-h-32 resize-none"
          placeholder={`Honey theme\nFrost crystal knights\nNether mushroom style`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {error}
        </p>
      )}

      <Button
        className="h-10 w-full gap-1.5"
        disabled={prompt.trim().length === 0 || busy}
        onClick={handleCreate}
      >
        {busy ? (
          <>Creating…</>
        ) : (
          <>
            <Wand2 className="size-4" />
            Generate Style Sheet
          </>
        )}
      </Button>
    </div>
  )
}
