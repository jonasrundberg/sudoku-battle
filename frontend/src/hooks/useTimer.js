/**
 * Hook for timer functionality with pause support.
 * Includes Page Visibility API handling to properly track time when tab is hidden.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

export function useTimer(initialTime = 0) {
  const [time, setTime] = useState(initialTime)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef(null)
  const lastTickRef = useRef(null) // Track last tick time for visibility handling

  // Start the timer
  const start = useCallback(() => {
    setIsRunning(true)
    setIsPaused(false)
    lastTickRef.current = Date.now()
  }, [])

  // Pause the timer
  const pause = useCallback(() => {
    setIsPaused(true)
  }, [])

  // Resume the timer - also ensures isRunning is true
  const resume = useCallback(() => {
    setIsRunning(true) // Ensure timer is running
    setIsPaused(false)
    lastTickRef.current = Date.now()
  }, [])

  // Stop the timer completely
  const stop = useCallback(() => {
    setIsRunning(false)
    setIsPaused(false)
  }, [])

  // Reset timer to 0
  const reset = useCallback(() => {
    setTime(0)
    setIsRunning(false)
    setIsPaused(false)
  }, [])

  // Set timer to specific value (for restoring progress)
  const setTimeValue = useCallback((newTime) => {
    setTime(newTime)
  }, [])

  // Timer tick effect
  useEffect(() => {
    if (isRunning && !isPaused) {
      lastTickRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        setTime((prev) => prev + 1)
        lastTickRef.current = Date.now()
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, isPaused])

  // Page Visibility API - handle tab switching and app backgrounding
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - record the time we went away
        lastTickRef.current = Date.now()
      } else {
        // Tab is visible again - catch up if timer was running
        if (isRunning && !isPaused && lastTickRef.current) {
          const elapsed = Math.floor((Date.now() - lastTickRef.current) / 1000)
          if (elapsed > 0) {
            setTime((prev) => prev + elapsed)
          }
          lastTickRef.current = Date.now()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isRunning, isPaused])

  return {
    time,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    stop,
    reset,
    setTime: setTimeValue,
  }
}
