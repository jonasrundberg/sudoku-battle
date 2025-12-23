/**
 * Start screen shown before the user begins today's puzzle.
 * Shows difficulty, player count, and a play button.
 */

import { useState, useEffect } from 'react'
import { getTodayStats } from '../utils/api'

export default function StartScreen({ onPlay }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await getTodayStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'hard': return 'text-orange-600 bg-orange-100'
      case 'expert': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="pt-8 pb-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img src="/sudoku.svg" alt="" className="h-12 w-12" />
          <h1 className="text-3xl font-bold text-gray-900">Sudoku Battle</h1>
        </div>
        <p className="text-gray-600">Daily Challenge</p>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          {/* Date */}
          <div className="mb-6">
            <p className="text-gray-500 text-sm mb-1">Today's Puzzle</p>
            <h2 className="text-2xl font-bold text-gray-800">
              {stats ? formatDate(stats.date) : 'Loading...'}
            </h2>
          </div>

          {/* Difficulty badge */}
          {stats && (
            <div className="mb-6">
              <span className={`inline-block px-4 py-2 rounded-full text-lg font-semibold capitalize ${getDifficultyColor(stats.difficulty)}`}>
                {stats.difficulty}
              </span>
            </div>
          )}

          {/* Player count */}
          {stats && (
            <div className="mb-8 py-4 border-y border-gray-100">
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
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
                <span className="text-lg">
                  <strong>{stats.player_count}</strong> {stats.player_count === 1 ? 'player' : 'players'} today
                </span>
              </div>
            </div>
          )}

          {/* Play button */}
          <button
            type="button"
            onClick={onPlay}
            className="w-full py-4 bg-blue-500 text-white text-xl font-bold rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            ▶ Play
          </button>

          {/* Rules reminder */}
          <p className="mt-4 text-sm text-gray-500">
            You have 3 lives. Make 3 mistakes and it's game over!
          </p>
        </div>
      </main>
    </div>
  )
}
