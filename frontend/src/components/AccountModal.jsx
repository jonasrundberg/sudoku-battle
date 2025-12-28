/**
 * Combined account modal for username editing and passkey management.
 */

import { useState, useEffect } from 'react'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import {
  getUserStats,
  setUsername as saveUsername,
  startPasskeyRegistration,
  finishPasskeyRegistration,
  startPasskeyLogin,
  finishPasskeyLogin,
  checkPasskeyRegistered,
  mergeAccounts,
} from '../utils/api'

export default function AccountModal({ userId, onUserIdChange, onClose }) {
  const [username, setUsername] = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
  const [hasPasskey, setHasPasskey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingUsername, setSavingUsername] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    loadAccountData()
  }, [userId])

  const loadAccountData = async () => {
    try {
      const [stats, passkeyStatus] = await Promise.all([
        getUserStats(userId),
        checkPasskeyRegistered(userId),
      ])
      setUsername(stats.username || '')
      setOriginalUsername(stats.username || '')
      setHasPasskey(passkeyStatus.has_passkey)
    } catch (err) {
      console.error('Failed to load account data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      setError('Username cannot be empty')
      return
    }
    if (username.trim() === originalUsername) {
      return // No change
    }

    setSavingUsername(true)
    setError(null)

    try {
      await saveUsername(userId, username.trim())
      setOriginalUsername(username.trim())
      setSuccess('Username saved!')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      setError('Failed to save username')
    } finally {
      setSavingUsername(false)
    }
  }

  const handleRegisterPasskey = async () => {
    setPasskeyLoading(true)
    setError(null)

    try {
      const options = await startPasskeyRegistration(userId, username.trim() || null)
      const credential = await startRegistration({ optionsJSON: options })
      await finishPasskeyRegistration(userId, credential)

      setHasPasskey(true)
      setSuccess('Passkey created! You can now sign in on other devices.')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'Failed to create passkey')
    } finally {
      setPasskeyLoading(false)
    }
  }

  const handleLogin = async () => {
    setPasskeyLoading(true)
    setError(null)

    try {
      const options = await startPasskeyLogin()
      const sessionId = options.sessionId
      const credential = await startAuthentication({ optionsJSON: options })
      credential.sessionId = sessionId

      const result = await finishPasskeyLogin(credential)

      // If logging into a different account, merge the local account's data
      if (result.user_id !== userId) {
        try {
          const mergeResult = await mergeAccounts(userId, result.user_id)
          if (mergeResult.migrated) {
            console.log('Account merged:', mergeResult)
          }
        } catch (mergeErr) {
          // Log but don't fail - login still succeeded
          console.warn('Account merge failed:', mergeErr)
        }
      }

      localStorage.setItem('sudoku_battle_user_id', result.user_id)
      onUserIdChange(result.user_id)

      setSuccess(`Welcome back, ${result.username || 'Player'}!`)
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Failed to sign in')
    } finally {
      setPasskeyLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveUsername()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Account</h2>
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
          <div className="space-y-6">
            {/* Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

            {/* Username Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSaveUsername}
                  placeholder="Enter your name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {username !== originalUsername && (
                  <button
                    type="button"
                    onClick={handleSaveUsername}
                    disabled={savingUsername}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {savingUsername ? '...' : 'Save'}
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                This name appears on leaderboards
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Device Sync Section */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <span>📱</span> Device Sync
              </h3>

              {hasPasskey ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <span className="text-lg">✓</span>
                    <span className="font-medium">Passkey is set up</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    You can sign in on other devices using your passkey.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    <strong>Only needed if you want to play on other devices</strong> (like your phone and computer). 
                    Your progress on this device is saved automatically.
                  </p>
                  <p className="text-sm text-gray-500">
                    A passkey lets you securely sign in using Face ID, Touch ID, or Windows Hello instead of a password.{' '}
                    <a 
                      href="https://safety.google/authentication/passkey/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 underline"
                    >
                      Learn more
                    </a>
                  </p>
                  <button
                    type="button"
                    onClick={handleRegisterPasskey}
                    disabled={passkeyLoading}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {passkeyLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <span>🔑</span> Create Passkey
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Sign in section */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">
                Already have an account?
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Sign in with your passkey to restore your progress from another device.
              </p>
              <button
                type="button"
                onClick={handleLogin}
                disabled={passkeyLoading}
                className="w-full py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {passkeyLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
                ) : (
                  <>
                    <span>🔑</span> Sign in with Passkey
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
