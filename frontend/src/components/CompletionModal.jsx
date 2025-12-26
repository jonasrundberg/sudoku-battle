/**
 * Modal shown when puzzle is completed successfully.
 * Shows completion time and user stats.
 */

import { useState, useEffect } from 'react'
import { getUserStats } from '../utils/api'

export default function CompletionModal({ time, difficulty, mistakes, userId, onContinue }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      getUserStats(userId)
        .then((data) => {
          setStats(data)
          setLoading(false)
        })
        .catch((err) => {
          console.error('Failed to load stats:', err)
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [userId])

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Fun messages based on time and mistakes
  const getMessage = () => {
    if (mistakes === 0 && time < 240) return "Perfect game! ⚡"
    if (mistakes === 0) return "Flawless! ⭐"
    if (time < 300) return "Lightning fast! ⚡"
    if (time < 420) return "Great job! 🎉"
    if (time < 600) return "Well done! 👏"
    return "You did it! 🏆"
  }

  const starsEarned = 3 - (mistakes || 0)

  return (
    <div className="modal-backdrop">
      <div className="modal-content text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-6xl mb-4">🎊</div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Puzzle Complete!
        </h2>
        
        <p className="text-lg text-gray-600 mb-4">{getMessage()}</p>
        
        {/* Today's result */}
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <div className="text-4xl font-mono font-bold text-blue-600 mb-2">
            {formatTime(time)}
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`text-2xl ${i < starsEarned ? 'text-yellow-500' : 'text-gray-300'}`}>
                ⭐
              </span>
            ))}
          </div>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize
            ${difficulty === 'easy' ? 'bg-green-100 text-green-800' : ''}
            ${difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
            ${difficulty === 'hard' ? 'bg-orange-100 text-orange-800' : ''}
            ${difficulty === 'expert' ? 'bg-red-100 text-red-800' : ''}
          `}>
            {difficulty}
          </div>
        </div>

        {/* Stats section */}
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : stats ? (
          <div className="space-y-4 mb-6">
            {/* Main stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.total_completed}
                </div>
                <div className="text-xs text-gray-600">Puzzles Completed</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {stats.current_streak}
                </div>
                <div className="text-xs text-gray-600">Current Streak 🔥</div>
              </div>
            </div>

            {/* Best time for this difficulty */}
            {stats.best_times?.[difficulty] && (
              <div className="text-sm text-gray-600">
                Best {difficulty} time: <span className="font-mono font-semibold">{formatTime(stats.best_times[difficulty])}</span>
                {stats.best_times[difficulty] === time && (
                  <span className="ml-2 text-green-600 font-medium">🏆 New record!</span>
                )}
              </div>
            )}
          </div>
        ) : null}
        
        <p className="text-sm text-gray-500 mb-4">
          Come back tomorrow for a new puzzle!
        </p>
        
        <button
          type="button"
          onClick={onContinue}
          className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
