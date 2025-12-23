/**
 * Passkey authentication modal for registering and logging in with WebAuthn.
 */

import { useState, useEffect } from 'react'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import {
  startPasskeyRegistration,
  finishPasskeyRegistration,
  startPasskeyLogin,
  finishPasskeyLogin,
  checkPasskeyRegistered,
  getUserStats,
} from '../utils/api'

export default function PasskeyAuth({ passkey, onPasskeyChange, onClose }) {
  const [mode, setMode] = useState('check') // 'check', 'register', 'login'
  const [hasPasskey, setHasPasskey] = useState(false)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    checkStatus()
  }, [passkey])

  const checkStatus = async () => {
    try {
      // Check if passkey is registered and get existing username
      const [passkeyResult, statsResult] = await Promise.all([
        checkPasskeyRegistered(passkey),
        getUserStats(passkey),
      ])
      setHasPasskey(passkeyResult.has_passkey)
      // Pre-fill username if one exists
      if (statsResult.username) {
        setUsername(statsResult.username)
      }
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get registration options from server
      const options = await startPasskeyRegistration(passkey, username.trim() || null)

      // Start WebAuthn registration in browser
      const credential = await startRegistration(options)

      // Send credential to server for verification
      const result = await finishPasskeyRegistration(passkey, credential)

      setSuccess('Passkey registered! You can now sign in on any device.')
      setHasPasskey(true)
      setLoading(false)
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'Failed to register passkey')
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get authentication options from server
      const options = await startPasskeyLogin()
      const sessionId = options.sessionId

      // Start WebAuthn authentication in browser
      const credential = await startAuthentication(options)

      // Add session ID to credential for server verification
      credential.sessionId = sessionId

      // Send credential to server for verification
      const result = await finishPasskeyLogin(credential)

      // Update the passkey in localStorage and state
      localStorage.setItem('sudoku_battle_passkey', result.passkey)
      onPasskeyChange(result.passkey)

      setSuccess(`Welcome back, ${result.username || 'Player'}!`)
      setLoading(false)

      // Close modal after short delay
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Failed to sign in')
      setLoading(false)
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
          <h2 className="text-xl font-bold text-gray-900">
            🔐 Passkey Authentication
          </h2>
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

        {loading && !success ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : success ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-green-600 font-medium">{success}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Error display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Registration section */}
            {!hasPasskey && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Save your account
                  </h3>
                  <p className="text-sm text-gray-600">
                    Create a passkey to sync your progress across devices.
                    Uses Face ID, Touch ID, or Windows Hello.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your name <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your name for leaderboards"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={loading}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  Create Passkey
                </button>
              </div>
            )}

            {/* Already registered message */}
            {hasPasskey && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <span className="text-xl">✓</span>
                  <span className="font-medium">Passkey is set up!</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  You can sign in on other devices using your passkey.
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Login section */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  Sign in with Passkey
                </h3>
                <p className="text-sm text-gray-600">
                  Already have an account? Sign in to restore your progress.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="text-xl">🔑</span>
                Sign in with Passkey
              </button>
            </div>

            {/* Info */}
            <p className="text-xs text-gray-500 text-center">
              Passkeys are stored securely on your device and synced via
              iCloud, Google, or Microsoft account.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
