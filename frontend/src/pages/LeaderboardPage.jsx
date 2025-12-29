/**
 * Public leaderboard page.
 * Shows leaderboard stats for all members when accessed via invite code URL.
 * Shows global top 100 players when no invite code is provided.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getLeaderboardByCode, getGlobalLeaderboard, getUserStats } from '../utils/api'
import { useUserId } from '../hooks/useUserId'
import StatsModal from '../components/StatsModal'
import LeaderboardModal from '../components/LeaderboardModal'
import AccountModal from '../components/AccountModal'

function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// StarRating component removed - now just displaying the number

export default function LeaderboardPage() {
  const { inviteCode } = useParams()
  const { userId, updateUserId } = useUserId()
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isGlobal, setIsGlobal] = useState(false)

  // Modal states
  const [showStats, setShowStats] = useState(false)
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [hasUsername, setHasUsername] = useState(true)

  // Check username status for notification dot
  const checkUsernameStatus = useCallback(async () => {
    if (!userId) return
    try {
      const stats = await getUserStats(userId)
      setHasUsername(!!stats.username)
    } catch {
      // Ignore errors
    }
  }, [userId])

  useEffect(() => {
    checkUsernameStatus()
  }, [checkUsernameStatus])

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        if (inviteCode) {
          // Fetch specific leaderboard by code
          const data = await getLeaderboardByCode(inviteCode)
          setLeaderboard(data)
          setIsGlobal(false)
        } else {
          // Fetch global leaderboard
          const data = await getGlobalLeaderboard()
          setLeaderboard({
            leaderboard_name: 'Global Top 100',
            member_count: data.members.length,
            members: data.members,
          })
          setIsGlobal(true)
        }
        setError(null)
      } catch (err) {
        setError('Leaderboard not found')
        setLeaderboard(null)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [inviteCode])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  if (error && inviteCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Leaderboard Not Found</h1>
          <p className="text-gray-600 mb-6">
            The leaderboard code "{inviteCode}" doesn't exist or has been removed.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Go to Family Sudoku
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - matching main app header style */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src="/sudoku.svg" alt="" className="h-8 w-8" />
            <h1 className="text-xl font-bold text-gray-900">Family Sudoku</h1>
          </Link>

          {/* Navigation buttons - open modals */}
          <div className="flex items-center gap-2">
            {/* Stats button */}
            <button
              type="button"
              onClick={() => setShowStats(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="View stats"
              title="Your Stats"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </button>

            {/* Leaderboard button */}
            <button
              type="button"
              onClick={() => setShowLeaderboardModal(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Leaderboards"
              title="Leaderboards"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </button>

            {/* Account button */}
            <button
              type="button"
              onClick={() => setShowAccount(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
              aria-label="Account"
              title="Account"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {/* Notification dot when username not set */}
              {!hasUsername && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-orange-500 rounded-full" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Leaderboard title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🏆 {leaderboard.leaderboard_name}
          </h1>
          <p className="text-gray-600">
            {isGlobal 
              ? 'Top players by games completed'
              : `${leaderboard.member_count} ${leaderboard.member_count === 1 ? 'member' : 'members'}`
            }
          </p>
        </div>

        {/* Leaderboard table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Today
                </th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Games
                </th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Stars
                </th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Avg
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaderboard.members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-gray-500">
                    {isGlobal ? 'No players yet' : 'No members yet'}
                  </td>
                </tr>
              ) : (
                leaderboard.members.map((member, index) => (
                  <tr
                    key={member.username}
                    className={`${
                      index % 2 === 1 ? 'bg-gray-50' : 'bg-white'
                    } hover:bg-gray-100 transition-colors`}
                  >
                    <td className="px-2 py-3 max-w-[120px] sm:max-w-none">
                      <span className="font-semibold text-gray-800 block truncate" title={member.username}>{member.username}</span>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center font-mono text-gray-700">
                      {member.today_time ? formatTime(member.today_time) : member.today_failed ? '❌' : ''}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <span className="text-green-600 font-semibold">{member.games_completed}</span>
                      {member.games_failed > 0 && (
                        <span className="text-red-500 font-semibold ml-1">/ {member.games_failed}</span>
                      )}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center text-gray-700">
                      {member.avg_stars.toFixed(1)}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center font-mono text-gray-700">
                      {formatTime(member.avg_time_all)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Join CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            {isGlobal ? 'Join the competition!' : 'Want to join this leaderboard?'}
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Play Family Sudoku
          </Link>
        </div>
      </main>

      {/* Modals */}
      {showStats && (
        <StatsModal
          userId={userId}
          onClose={() => setShowStats(false)}
        />
      )}

      {showLeaderboardModal && (
        <LeaderboardModal
          userId={userId}
          onClose={() => setShowLeaderboardModal(false)}
        />
      )}

      {showAccount && (
        <AccountModal
          userId={userId}
          onClose={() => {
            setShowAccount(false)
            checkUsernameStatus()
          }}
          onUserIdChange={updateUserId}
        />
      )}
    </div>
  )
}
