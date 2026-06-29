import { cn } from '@/lib/utils'

type PixelGridOverlayProps = {
  resolution: number
  enabled?: boolean
}

export function PixelGridOverlay({ resolution, enabled = true }: PixelGridOverlayProps) {
  if (!enabled) return null

  const id = `pixel-grid-${resolution}`
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-40 transition-opacity duration-200 group-hover:opacity-60"
      viewBox={`0 0 ${resolution} ${resolution}`}
      preserveAspectRatio="none"
    >
      <defs>
        <pattern
          id={id}
          width="1"
          height="1"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 1 0 L 1 1 M 0 1 L 1 1"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="0.06"
            fill="none"
          />
        </pattern>
      </defs>
      <rect width={resolution} height={resolution} fill={`url(#${id})`} />
    </svg>
  )
}

type PixelGridToggleProps = {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function PixelGridToggle({ enabled, onChange }: PixelGridToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
        enabled ? 'bg-foreground' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 size-4 rounded-full bg-background transition-transform duration-200',
          enabled ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}
