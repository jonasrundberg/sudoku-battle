/**
 * Public leaderboard page.
 * Shows leaderboard stats for all members when accessed via invite code URL.
 * Shows global top 100 players when no invite code is provided.
 */

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getLeaderboardByCode, getGlobalLeaderboard } from '../utils/api'

function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// StarRating component removed - now just displaying the number

export default function LeaderboardPage() {
  const { inviteCode } = useParams()
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isGlobal, setIsGlobal] = useState(false)

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
            Go to Sudoku Battle
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <span className="text-2xl">🧩</span>
            Sudoku Battle
          </Link>
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
                      index === 0 ? 'bg-yellow-50' : index === 1 ? 'bg-gray-50' : index === 2 ? 'bg-orange-50' : ''
                    } hover:bg-blue-50 transition-colors`}
                  >
                    <td className="px-2 py-3 whitespace-nowrap">
                      <span className="font-semibold text-gray-800">{member.username}</span>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center font-mono text-gray-700">
                      {member.today_time ? formatTime(member.today_time) : '-'}
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
            Play Sudoku Battle
          </Link>
        </div>
      </main>
    </div>
  )
}
