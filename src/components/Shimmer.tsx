import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type ShimmerProps = {
  className?: string
  children?: ReactNode
}

export function Shimmer({ className, children }: ShimmerProps) {
  return (
    <div
      className={cn('relative overflow-hidden', className)}
    >
      <div className="absolute inset-0 animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-muted via-muted-foreground/10 to-muted" />
      {children && (
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-1.5">
          {children}
        </div>
      )}
    </div>
  )
}