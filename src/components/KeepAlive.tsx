'use client'

import { useEffect } from 'react'

export default function KeepAlive() {
  useEffect(() => {
    const pingServer = async () => {
      try {
        await fetch('/api/health', { cache: 'no-store' })
      } catch (e) {
        // Silent catch for background heartbeat
      }
    }

    // Ping every 30 seconds to prevent DB/Server idle sleep
    const interval = setInterval(pingServer, 30000)

    // Wake up immediately when user switches back to app or device wakes up
    const handleWakeup = () => {
      if (document.visibilityState === 'visible') {
        pingServer()
      }
    }

    window.addEventListener('focus', handleWakeup)
    document.addEventListener('visibilitychange', handleWakeup)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleWakeup)
      document.removeEventListener('visibilitychange', handleWakeup)
    }
  }, [])

  return null
}
