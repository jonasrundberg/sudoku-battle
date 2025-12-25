/**
 * Start screen shown before the user begins today's puzzle.
 * Shows difficulty and friends who completed today.
 */

import { useState, useEffect } from 'react'
import Header from './Header'
import { getTodayStats, getFriendsCompletions } from '../utils/api'

export default function StartScreen({ passkey, onPlay, onStatsClick, onLeaderboardClick, onAccountClick }) {
  const [stats, setStats] = useState(null)
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [passkey])

  const loadData = async () => {
    try {
      const [statsData, friendsData] = await Promise.all([
        getTodayStats(),
        passkey ? getFriendsCompletions(passkey) : { friends: [] }
      ])
      setStats(statsData)
      setFriends(friendsData.friends || [])
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          passkey={passkey}
          onStatsClick={onStatsClick}
          onLeaderboardClick={onLeaderboardClick}
          onAccountClick={onAccountClick}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header
        passkey={passkey}
        onStatsClick={onStatsClick}
        onLeaderboardClick={onLeaderboardClick}
        onAccountClick={onAccountClick}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center p-4 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full">
          {/* App description for new users */}
          <p className="text-center text-gray-600 mb-6">
            A new puzzle every day. Compete with friends and create your own leaderboards.
          </p>

          {/* Play button with difficulty */}
          <button
            type="button"
            onClick={onPlay}
            className="w-full py-4 bg-blue-500 text-white text-xl font-bold rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            ▶ Play {stats && (
              <span className="font-normal opacity-90">
                — today is <span className="capitalize">{stats.difficulty}</span>
              </span>
            )}
          </button>

          {/* Rules reminder */}
          <p className="mt-4 text-sm text-gray-500 text-center">
            You have 3 lives. Make 3 mistakes and it's game over!
          </p>

          {/* Friends completions */}
          {friends.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Friends who completed today</h3>
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div
                    key={friend.passkey}
                    className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg"
                  >
                    <span className="font-medium text-gray-800">{friend.username}</span>
                    <span className="text-green-600 font-mono">{formatTime(friend.time_seconds)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
