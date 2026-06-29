import { useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

type ImagePreviewProps = {
  src: string
  alt: string
  pixelated?: boolean
  onClose: () => void
}

export function ImagePreview({ src, alt, pixelated, onClose }: ImagePreviewProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
      onClick={onClose}
    >
      <img
        src={src}
        alt={alt}
        className={cn(
          'max-h-full max-w-full rounded-lg object-contain shadow-2xl',
          pixelated && 'pixelated',
        )}
        onClick={(e) => e.stopPropagation()}
      />
      <button
        className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        onClick={onClose}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  )
}

type PreviewableImageProps = {
  src: string
  alt: string
  /** Applied to the outer container (sizing, aspect-ratio) */
  className?: string
  pixelated?: boolean
}

export function PreviewableImage({ src, alt, className, pixelated }: PreviewableImageProps) {
  function openPreview() {
    window.__previewImage = { src, alt, pixelated }
    window.dispatchEvent(new Event('preview-image'))
  }

  return (
    <div
      className={cn('group relative cursor-pointer overflow-hidden', className)}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        openPreview()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openPreview()
        }
      }}
    >
      <img
        src={src}
        alt={alt}
        className={cn(
          'h-full w-full object-cover transition-transform duration-200 group-hover:scale-105',
          pixelated && 'pixelated',
        )}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </div>
    </div>
  )
}

declare global {
  interface Window {
    __previewImage?: { src: string; alt: string; pixelated?: boolean }
  }
}
