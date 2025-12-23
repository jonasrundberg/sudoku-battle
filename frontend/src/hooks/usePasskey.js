/**
 * Hook for managing the user's passkey.
 * Generates and stores a unique passkey in localStorage.
 */

import { useState, useEffect, useCallback } from 'react'

const PASSKEY_STORAGE_KEY = 'sudoku_battle_passkey'

export function usePasskey() {
  const [passkey, setPasskey] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Try to load existing passkey from localStorage
    let storedPasskey = localStorage.getItem(PASSKEY_STORAGE_KEY)

    if (!storedPasskey) {
      // Generate a new passkey using crypto.randomUUID()
      storedPasskey = crypto.randomUUID()
      localStorage.setItem(PASSKEY_STORAGE_KEY, storedPasskey)
    }

    setPasskey(storedPasskey)
    setIsLoading(false)
  }, [])

  // Function to update the passkey (used after WebAuthn login)
  const updatePasskey = useCallback((newPasskey) => {
    localStorage.setItem(PASSKEY_STORAGE_KEY, newPasskey)
    setPasskey(newPasskey)
  }, [])

  return { passkey, isLoading, updatePasskey }
}
