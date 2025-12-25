/**
 * Hook for managing the user's unique identifier.
 * Generates and stores a unique user ID in localStorage.
 */

import { useState, useEffect, useCallback } from 'react'

const USER_ID_STORAGE_KEY = 'sudoku_battle_user_id'

export function useUserId() {
  const [userId, setUserId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Try to load existing user ID from localStorage
    let storedUserId = localStorage.getItem(USER_ID_STORAGE_KEY)

    if (!storedUserId) {
      // Generate a new user ID using crypto.randomUUID()
      storedUserId = crypto.randomUUID()
      localStorage.setItem(USER_ID_STORAGE_KEY, storedUserId)
    }

    setUserId(storedUserId)
    setIsLoading(false)
  }, [])

  // Function to update the user ID (used after WebAuthn login)
  const updateUserId = useCallback((newUserId) => {
    localStorage.setItem(USER_ID_STORAGE_KEY, newUserId)
    setUserId(newUserId)
  }, [])

  return { userId, isLoading, updateUserId }
}
