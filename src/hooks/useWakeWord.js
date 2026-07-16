import { useCallback, useEffect, useRef, useState } from 'react'

const AUTO_WAKE_DELAY_MS = 3000

export default function useWakeWord({ onWake, enabled = true } = {}) {
  const [status, setStatus] = useState('idle')
  const onWakeRef = useRef(onWake)
  const hasAutoWokenRef = useRef(false)
  onWakeRef.current = onWake

  const stop = useCallback(() => {
    setStatus('idle')
  }, [])

  useEffect(() => {
    if (!enabled || hasAutoWokenRef.current) {
      setStatus('idle')
      return undefined
    }

    hasAutoWokenRef.current = true
    let cancelled = false
    setStatus('countdown')
    console.log('[WakeWord] 自动唤醒倒计时: 3s')

    const twoSecondTimer = window.setTimeout(() => {
      if (!cancelled) console.log('[WakeWord] 自动唤醒倒计时: 2s')
    }, 1000)

    const oneSecondTimer = window.setTimeout(() => {
      if (!cancelled) console.log('[WakeWord] 自动唤醒倒计时: 1s')
    }, 2000)

    const wakeTimer = window.setTimeout(() => {
      if (cancelled) return
      console.log('[WakeWord] 自动唤醒倒计时: 0s，已自动唤醒')
      setStatus('woke')
      onWakeRef.current?.()
    }, AUTO_WAKE_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(twoSecondTimer)
      window.clearTimeout(oneSecondTimer)
      window.clearTimeout(wakeTimer)
    }
  }, [enabled])

  return { status, stop }
}
