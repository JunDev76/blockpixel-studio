import { Outlet, useLocation } from 'react-router'
import { useEffect, useState } from 'react'
import { AppSidebar } from '@/AppSidebar'
import { useStore } from '@/hooks'
import { ImagePreview } from '@/components/ImagePreview'

function App() {
  const location = useLocation()
  const title = headerTitle(location.pathname)
  const { loadSheets } = useStore()

  useEffect(() => {
    loadSheets()
  }, [loadSheets])

  const [preview, setPreview] = useState<{ src: string; alt: string; pixelated?: boolean } | null>(null)

  useEffect(() => {
    const handler = () => setPreview(window.__previewImage ?? null)
    window.addEventListener('preview-image', handler)
    return () => window.removeEventListener('preview-image', handler)
  }, [])

  return (
    <div className="flex h-svh overflow-hidden">
      <AppSidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex h-11 shrink-0 items-center border-b border-border bg-background px-5">
          <h1 className="text-sm font-medium text-muted-foreground">{title}</h1>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden p-5">
          <Outlet />
        </div>
      </main>
      {preview && (
        <ImagePreview
          src={preview.src}
          alt={preview.alt}
          pixelated={preview.pixelated}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}

function headerTitle(pathname: string): string {
  if (pathname.startsWith('/library')) return 'Library'
  if (pathname.startsWith('/sheets/') && pathname.includes('/items/')) return 'Item detail'
  if (pathname.startsWith('/sheets/')) return 'Style sheet'
  return 'BlockPixel Studio'
}

export default App