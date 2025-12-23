/**
 * Modal for viewing and managing leaderboards.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getUserLeaderboards,
  createLeaderboard,
  joinLeaderboard,
  getLeaderboardResults,
} from '../utils/api'

export default function LeaderboardModal({ passkey, onClose }) {
  const navigate = useNavigate()
  const [leaderboards, setLeaderboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('list') // 'list', 'create', 'join', 'view'
  const [selectedLeaderboard, setSelectedLeaderboard] = useState(null)
  const [results, setResults] = useState(null)

  // Form states
  const [newName, setNewName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadLeaderboards()
  }, [passkey])

  const loadLeaderboards = async () => {
    try {
      const data = await getUserLeaderboards(passkey)
      setLeaderboards(data.leaderboards)
    } catch (err) {
      console.error('Failed to load leaderboards:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError('Name cannot be empty')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await createLeaderboard(passkey, newName.trim())
      await loadLeaderboards()
      setActiveTab('list')
      setNewName('')
    } catch (err) {
      setError('Failed to create leaderboard')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Invite code cannot be empty')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await joinLeaderboard(passkey, inviteCode.trim())
      await loadLeaderboards()
      setActiveTab('list')
      setInviteCode('')
    } catch (err) {
      setError('Invalid invite code')
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewResults = async (leaderboard) => {
    setSelectedLeaderboard(leaderboard)
    setActiveTab('view')
    setResults(null)

    try {
      const data = await getLeaderboardResults(leaderboard.id)
      setResults(data)
    } catch (err) {
      console.error('Failed to load results:', err)
    }
  }

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code)
    // Could show a toast here
  }

  const goToLeaderboardPage = (inviteCode) => {
    onClose()
    navigate(`/leaderboard/${inviteCode}`)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {activeTab === 'view' && selectedLeaderboard
              ? selectedLeaderboard.name
              : 'Leaderboards'}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : activeTab === 'list' ? (
            <>
              {/* Action buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('create')
                    setError(null)
                  }}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  + Create New
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('join')
                    setError(null)
                  }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Join with Code
                </button>
              </div>

              {/* Leaderboard list */}
              {leaderboards.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No leaderboards yet. Create one or join with an invite code!
                </p>
              ) : (
                <div className="space-y-2">
                  {leaderboards.map((lb) => (
                    <div
                      key={lb.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => goToLeaderboardPage(lb.invite_code)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {lb.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {lb.member_count} member{lb.member_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyInviteCode(lb.invite_code)
                          }}
                          className="text-xs bg-gray-100 px-2 py-1 rounded font-mono hover:bg-gray-200"
                          title="Click to copy"
                        >
                          {lb.invite_code}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : activeTab === 'create' ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="text-blue-500 text-sm flex items-center gap-1"
              >
                ← Back to list
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leaderboard Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={50}
                  placeholder="e.g., Office Champions"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="button"
                onClick={handleCreate}
                disabled={submitting}
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Leaderboard'}
              </button>
            </div>
          ) : activeTab === 'join' ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="text-blue-500 text-sm flex items-center gap-1"
              >
                ← Back to list
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  placeholder="e.g., ABC123XY"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                  autoFocus
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="button"
                onClick={handleJoin}
                disabled={submitting}
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Joining...' : 'Join Leaderboard'}
              </button>
            </div>
          ) : activeTab === 'view' && selectedLeaderboard ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="text-blue-500 text-sm flex items-center gap-1"
              >
                ← Back to list
              </button>

              {results ? (
                <>
                  <div className="text-sm text-gray-600 text-center">
                    {results.date} • {results.difficulty}
                  </div>

                  <div className="space-y-2">
                    {results.results.map((result, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg flex justify-between items-center ${
                          result.rank === 1
                            ? 'bg-yellow-50 border border-yellow-200'
                            : result.rank === 2
                            ? 'bg-gray-100 border border-gray-200'
                            : result.rank === 3
                            ? 'bg-orange-50 border border-orange-200'
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold ${
                              result.rank === 1
                                ? 'bg-yellow-400 text-yellow-900'
                                : result.rank === 2
                                ? 'bg-gray-400 text-white'
                                : result.rank === 3
                                ? 'bg-orange-400 text-white'
                                : result.rank
                                ? 'bg-gray-200 text-gray-600'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {result.rank || '-'}
                          </span>
                          <span className="font-medium">{result.username}</span>
                        </div>
                        <span className="font-mono text-gray-600">
                          {formatTime(result.time_seconds)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Share invite code */}
                  <div className="pt-4 border-t border-gray-200 text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      Invite others with code:
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        copyInviteCode(selectedLeaderboard.invite_code)
                      }
                      className="px-4 py-2 bg-gray-100 rounded-lg font-mono text-lg hover:bg-gray-200"
                    >
                      {selectedLeaderboard.invite_code}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
