/**
 * Start screen shown before the user begins today's puzzle.
 * Shows difficulty and friends who completed today.
 * Also shows completion info if today's puzzle is already done.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from './Header'
import { getTodayStats, getFriendsCompletions, getProgress } from '../utils/api'

export default function StartScreen({ userId, onPlay, onStatsClick, onLeaderboardClick, onAccountClick }) {
  const [stats, setStats] = useState(null)
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [todayProgress, setTodayProgress] = useState(null)

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    try {
      const [statsData, friendsData, progressData] = await Promise.all([
        getTodayStats(),
        userId ? getFriendsCompletions(userId) : { friends: [] },
        userId ? getProgress(userId).catch(() => null) : null
      ])
      setStats(statsData)
      setFriends(friendsData.friends || [])
      setTodayProgress(progressData)
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

  const isCompleted = todayProgress?.is_completed
  const isFailed = todayProgress?.is_failed
  const starsEarned = isCompleted ? 3 - (todayProgress?.mistakes || 0) : 0

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          userId={userId}
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
        userId={userId}
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

          {/* Show completion info if already done today */}
          {isCompleted && (
            <div className="bg-green-50 rounded-xl p-4 mb-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Today's Puzzle Complete!</h3>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={`text-xl ${i < starsEarned ? 'text-yellow-500' : 'text-gray-300'}`}>
                      ⭐
                    </span>
                  ))}
                </div>
                <div className="text-2xl font-mono font-bold text-green-600 mb-1">
                  {formatTime(todayProgress.time_seconds)}
                </div>
                <p className="text-sm text-gray-500 mt-2">New puzzle tomorrow!</p>
              </div>
            </div>
          )}

          {/* Show failed info if game over today */}
          {isFailed && (
            <div className="bg-red-50 rounded-xl p-4 mb-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Game Over</h3>
                <p className="text-sm text-gray-600 mb-2">You ran out of lives today.</p>
                <p className="text-sm text-gray-500">New puzzle tomorrow!</p>
              </div>
            </div>
          )}

          {/* Play button or View Replay */}
          {isCompleted || isFailed ? (
            <Link
              to={`/replay/${userId}`}
              className="w-full py-4 bg-blue-500 text-white text-xl font-bold rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              ▶ View Your Replay
            </Link>
          ) : (
            <button
              type="button"
              onClick={onPlay}
              className="w-full py-4 bg-blue-500 text-white text-xl font-bold rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              {todayProgress && !todayProgress.is_completed && !todayProgress.is_failed ? (
                <>▶ Resume Game</>
              ) : (
                <>▶ Play {stats && (
                  <span className="font-normal opacity-90">
                    — today is <span className="capitalize">{stats.difficulty}</span>
                  </span>
                )}</>
              )}
            </button>
          )}

          {/* Rules reminder - only show if not completed/failed */}
          {!isCompleted && !isFailed && (
            <p className="mt-4 text-sm text-gray-500 text-center">
              You have 3 lives. Make 3 mistakes and it's game over!
            </p>
          )}

          {/* Friends completions */}
          {friends.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                Friends who completed today
                <span className="text-xs text-gray-400 ml-2">(tap to watch)</span>
              </h3>
              <div className="space-y-2">
                {friends.map((friend) => (
                  <Link
                    key={friend.user_id}
                    to={`/replay/${friend.user_id}`}
                    className="w-full flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg hover:bg-green-100 active:bg-green-200 transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-gray-800 flex items-center gap-2">
                      {friend.username}
                      <span className="text-xs text-gray-400">▶</span>
                    </span>
                    <span className="text-green-600 font-mono">{formatTime(friend.time_seconds)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
