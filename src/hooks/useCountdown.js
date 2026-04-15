import { useState, useEffect } from 'react'

/**
 * useCountdown(closesAt: string | null)
 * Returns { secondsLeft: number | null, expired: boolean }
 * - secondsLeft is null when closesAt is not set
 * - Ticks every second via setInterval
 */
export function useCountdown(closesAt) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!closesAt) return null
    return Math.max(0, Math.floor((new Date(closesAt) - Date.now()) / 1000))
  })

  useEffect(() => {
    if (!closesAt) {
      // Defer to avoid synchronous setState in effect body
      const id = setTimeout(() => setSecondsLeft(null), 0)
      return () => clearTimeout(id)
    }

    function tick() {
      setSecondsLeft(Math.max(0, Math.floor((new Date(closesAt) - Date.now()) / 1000)))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [closesAt])

  return {
    secondsLeft,
    expired: secondsLeft !== null && secondsLeft <= 0,
  }
}

/** Format seconds as M:SS */
export function formatCountdown(secondsLeft) {
  if (secondsLeft === null) return ''
  const m = Math.floor(secondsLeft / 60)
  const s = secondsLeft % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
