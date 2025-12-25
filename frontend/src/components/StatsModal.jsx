/**
 * Modal for viewing personal statistics.
 */

import { useState, useEffect } from 'react'
import { getUserStats } from '../utils/api'

export default function StatsModal({ userId, onClose }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserStats(userId)
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load stats:', err)
        setLoading(false)
      })
  }, [userId])

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Your Stats</h2>
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
        ) : stats ? (
          <div className="space-y-6">
            {/* Main stats grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.total_completed}
                </div>
                <div className="text-sm text-gray-600">Puzzles Completed</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-orange-500">
                  {stats.current_streak}
                </div>
                <div className="text-sm text-gray-600">Current Streak</div>
              </div>
            </div>

            {/* Best times */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Best Times</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700 font-medium">Easy</span>
                  <span className="font-mono font-semibold">
                    {formatTime(stats.best_times?.easy)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="text-yellow-700 font-medium">Medium</span>
                  <span className="font-mono font-semibold">
                    {formatTime(stats.best_times?.medium)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-orange-700 font-medium">Hard</span>
                  <span className="font-mono font-semibold">
                    {formatTime(stats.best_times?.hard)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-red-700 font-medium">Expert</span>
                  <span className="font-mono font-semibold">
                    {formatTime(stats.best_times?.expert)}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional stats */}
            <div className="flex justify-between text-sm text-gray-600 pt-4 border-t border-gray-200">
              <span>Longest Streak: {stats.longest_streak} days</span>
              <span>
                Total Time: {Math.floor(stats.total_time_seconds / 60)}m
              </span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No stats available yet. Complete your first puzzle!
          </p>
        )}
      </div>
    </div>
  )
}
