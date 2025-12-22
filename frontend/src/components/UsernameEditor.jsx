/**
 * Modal for editing username.
 */

import { useState, useEffect } from 'react'
import { getUserStats, setUsername } from '../utils/api'

export default function UsernameEditor({ passkey, onClose }) {
  const [username, setUsernameValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Load current username
    getUserStats(passkey)
      .then((stats) => {
        setUsernameValue(stats.username || '')
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load username:', err)
        setLoading(false)
      })
  }, [passkey])

  const handleSave = async () => {
    if (!username.trim()) {
      setError('Username cannot be empty')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await setUsername(passkey, username.trim())
      onClose()
    } catch (err) {
      console.error('Failed to save username:', err)
      setError('Failed to save username')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Edit Username</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-4">
              Your username is visible on leaderboards.
            </p>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsernameValue(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={20}
              placeholder="Enter username"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />

            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-400 text-center">
                Your ID: {passkey.slice(0, 8)}...
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
