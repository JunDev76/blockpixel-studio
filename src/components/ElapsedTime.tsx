import { useEffect, useState } from 'react'

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

type ElapsedTimeProps = {
  startedAt: number
  className?: string
}

export function ElapsedTime({ startedAt, className }: ElapsedTimeProps) {
  const [elapsed, setElapsed] = useState(Date.now() - startedAt)

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <span className={className}>
      {formatElapsed(elapsed)}
    </span>
  )
}