/**
 * Hook for timer functionality with pause support.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

export function useTimer(initialTime = 0) {
  const [time, setTime] = useState(initialTime)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef(null)

  // Start the timer
  const start = useCallback(() => {
    setIsRunning(true)
    setIsPaused(false)
  }, [])

  // Pause the timer
  const pause = useCallback(() => {
    setIsPaused(true)
  }, [])

  // Resume the timer
  const resume = useCallback(() => {
    setIsPaused(false)
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
      intervalRef.current = setInterval(() => {
        setTime((prev) => prev + 1)
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
