import { StoreContext } from '@/store'
import type { StyleSheet } from '@/types'
import { useContext, useEffect, useRef, useState } from 'react'

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export function useSheet(sheetId: string | undefined): StyleSheet | undefined {
  const { sheets } = useStore()
  return sheets.find((s) => s.id === sheetId)
}

export function usePolling(
  callback: () => Promise<void>,
  intervalMs: number,
  enabled: boolean,
) {
  const savedCallback = useRef(callback)
  savedCallback.current = callback

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => {
      savedCallback.current()
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])
}

const PIXEL_GRID_KEY = 'bps:pixel-grid-enabled'

export function usePixelGrid(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = window.localStorage.getItem(PIXEL_GRID_KEY)
    return stored === null ? true : stored === 'true'
  })

  useEffect(() => {
    window.localStorage.setItem(PIXEL_GRID_KEY, String(enabled))
  }, [enabled])

  return [enabled, setEnabled]
}
