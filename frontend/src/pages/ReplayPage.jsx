/**
 * Page for watching a replay of a friend's completed game.
 * Accessible via URL: /replay/:targetUserId or /replay/:targetUserId/:date
 * Plays back each move in real-time with timer and visual feedback.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import SudokuGrid from '../components/SudokuGrid'
import { getReplay } from '../utils/api'
import { useUserId } from '../hooks/useUserId'

export default function ReplayPage() {
  const { targetUserId, date: dateParam } = useParams()
  const { userId } = useUserId()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [replayData, setReplayData] = useState(null)
  
  // Playback state
  const [board, setBoard] = useState(null)
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [displayTime, setDisplayTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [wrongCells, setWrongCells] = useState(new Set())
  const [lastMistakeCell, setLastMistakeCell] = useState(null)
  const [mistakes, setMistakes] = useState(0)
  
  const playbackRef = useRef(null)
  const timerRef = useRef(null)

  // Load replay data
  useEffect(() => {
    if (targetUserId) {
      loadReplay()
    }
  }, [targetUserId, dateParam, userId])

  const loadReplay = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getReplay(targetUserId, userId, dateParam)
      setReplayData(data)
      // Initialize board with puzzle
      setBoard(data.puzzle.map(row => [...row]))
      setCurrentMoveIndex(-1)
      setDisplayTime(0)
      setMistakes(0)
      setWrongCells(new Set())
    } catch (err) {
      setError(err.message || 'Failed to load replay')
    } finally {
      setLoading(false)
    }
  }

  // Format time display
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Apply a move to the board (values are hidden - we only know if correct/wrong/erase)
  const applyMove = useCallback((move) => {
    const cellKey = `${move.row},${move.col}`
    
    if (move.is_erase) {
      // Erase - set to 0 and remove from wrong cells
      setBoard(prev => {
        const newBoard = prev.map(row => [...row])
        newBoard[move.row][move.col] = 0
        return newBoard
      })
      setWrongCells(prev => {
        const newSet = new Set(prev)
        newSet.delete(cellKey)
        return newSet
      })
    } else if (!move.is_correct) {
      // Wrong move - use placeholder value (1) and mark as wrong
      setBoard(prev => {
        const newBoard = prev.map(row => [...row])
        newBoard[move.row][move.col] = 1 // Placeholder - will be masked anyway
        return newBoard
      })
      setMistakes(m => m + 1)
      setWrongCells(prev => new Set([...prev, cellKey]))
      setLastMistakeCell({ row: move.row, col: move.col })
      setTimeout(() => setLastMistakeCell(null), 500)
    } else {
      // Correct move - use placeholder value (1) and clear wrong state
      setBoard(prev => {
        const newBoard = prev.map(row => [...row])
        newBoard[move.row][move.col] = 1 // Placeholder - will be masked anyway
        return newBoard
      })
      setWrongCells(prev => {
        const newSet = new Set(prev)
        newSet.delete(cellKey)
        return newSet
      })
    }
  }, [])

  // Main playback loop
  useEffect(() => {
    if (!isPlaying || !replayData || currentMoveIndex >= replayData.move_history.length - 1) {
      return
    }

    const moves = replayData.move_history
    const nextMoveIndex = currentMoveIndex + 1
    const nextMove = moves[nextMoveIndex]
    
    // Calculate delay until next move
    const currentTime = currentMoveIndex >= 0 ? moves[currentMoveIndex].time_ms : 0
    const nextTime = nextMove.time_ms
    const delay = (nextTime - currentTime) / playbackSpeed

    playbackRef.current = setTimeout(() => {
      applyMove(nextMove)
      setCurrentMoveIndex(nextMoveIndex)
      setDisplayTime(nextMove.time_ms)
    }, Math.max(delay, 10)) // Min 10ms delay

    return () => {
      if (playbackRef.current) clearTimeout(playbackRef.current)
    }
  }, [isPlaying, currentMoveIndex, replayData, playbackSpeed, applyMove])

  // Smooth timer update
  useEffect(() => {
    if (!isPlaying || !replayData) return

    const moves = replayData.move_history
    if (currentMoveIndex >= moves.length - 1) {
      setIsPlaying(false)
      return
    }

    const startTime = Date.now()
    const startDisplayTime = displayTime

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) * playbackSpeed
      const newTime = startDisplayTime + elapsed
      
      // Don't exceed final time
      const maxTime = replayData.time_seconds * 1000
      setDisplayTime(Math.min(newTime, maxTime))
    }, 50)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, currentMoveIndex, playbackSpeed])

  const handlePlayPause = () => {
    if (replayData.move_history.length === 0) return
    
    if (currentMoveIndex >= replayData.move_history.length - 1) {
      // Restart from beginning
      setBoard(replayData.puzzle.map(row => [...row]))
      setCurrentMoveIndex(-1)
      setDisplayTime(0)
      setMistakes(0)
      setWrongCells(new Set())
      setIsPlaying(true)
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  const handleSpeedChange = () => {
    const speeds = [1, 2, 4, 8]
    const currentIndex = speeds.indexOf(playbackSpeed)
    const nextIndex = (currentIndex + 1) % speeds.length
    setPlaybackSpeed(speeds[nextIndex])
  }

  const handleSkipBackward = () => {
    if (!replayData || currentMoveIndex < 0) return
    
    // Stop playback
    setIsPlaying(false)
    if (playbackRef.current) clearTimeout(playbackRef.current)
    
    // Go back one move by rebuilding board state
    const newIndex = currentMoveIndex - 1
    const newBoard = replayData.puzzle.map(row => [...row])
    let newMistakes = 0
    const newWrongCells = new Set()
    
    // Replay all moves up to newIndex (without actual values)
    for (let i = 0; i <= newIndex; i++) {
      const move = replayData.move_history[i]
      const cellKey = `${move.row},${move.col}`
      
      if (move.is_erase) {
        newBoard[move.row][move.col] = 0
        newWrongCells.delete(cellKey)
      } else if (!move.is_correct) {
        newBoard[move.row][move.col] = 1 // Placeholder
        newMistakes++
        newWrongCells.add(cellKey)
      } else {
        newBoard[move.row][move.col] = 1 // Placeholder
        newWrongCells.delete(cellKey)
      }
    }
    
    setBoard(newBoard)
    setCurrentMoveIndex(newIndex)
    setMistakes(newMistakes)
    setWrongCells(newWrongCells)
    setDisplayTime(newIndex >= 0 ? replayData.move_history[newIndex].time_ms : 0)
    setLastMistakeCell(null)
  }

  const handleSkipForward = () => {
    if (!replayData || currentMoveIndex >= replayData.move_history.length - 1) return
    
    // Stop playback
    setIsPlaying(false)
    if (playbackRef.current) clearTimeout(playbackRef.current)
    
    // Apply next move
    const nextIndex = currentMoveIndex + 1
    const nextMove = replayData.move_history[nextIndex]
    
    applyMove(nextMove)
    setCurrentMoveIndex(nextIndex)
    setDisplayTime(nextMove.time_ms)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading replay...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-block w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors text-center"
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const isComplete = currentMoveIndex >= replayData.move_history.length - 1
  const hasMoves = replayData.move_history.length > 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-blue-500 hover:text-blue-600 font-medium">
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Replay</h1>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center p-4 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-lg p-4 w-full">
          {/* Player info */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {replayData.username}'s Game
            </h2>
            <p className="text-sm text-gray-500 capitalize">
              {replayData.difficulty} • {replayData.date}
            </p>
          </div>

          {/* Timer and Lives */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="text-2xl font-mono font-bold text-gray-700">
              {formatTime(displayTime)}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Lives:</span>
              {[0, 1, 2].map((i) => (
                <span key={i} className={mistakes > i ? 'text-gray-300' : 'text-red-500'}>
                  ❤️
                </span>
              ))}
            </div>
          </div>

          {/* Sudoku Grid */}
          {board && (
            <div className="mb-4">
              <SudokuGrid
                board={board}
                originalBoard={replayData.puzzle}
                conflicts={[]}
                wrongCells={wrongCells}
                selectedCell={null}
                onCellClick={() => {}}
                mistakeCell={lastMistakeCell}
                maskUserCells={true}
              />
            </div>
          )}

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              type="button"
              onClick={handleSkipBackward}
              disabled={!hasMoves || currentMoveIndex < 0}
              className={`px-3 py-3 rounded-lg font-semibold transition-colors ${
                hasMoves && currentMoveIndex >= 0
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title="Previous move"
            >
              ⏮
            </button>
            
            <button
              type="button"
              onClick={handlePlayPause}
              disabled={!hasMoves}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                hasMoves 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isComplete ? (
                <>🔄 Replay</>
              ) : isPlaying ? (
                <>⏸ Pause</>
              ) : (
                <>▶ Play</>
              )}
            </button>
            
            <button
              type="button"
              onClick={handleSkipForward}
              disabled={!hasMoves || currentMoveIndex >= replayData.move_history.length - 1}
              className={`px-3 py-3 rounded-lg font-semibold transition-colors ${
                hasMoves && currentMoveIndex < replayData.move_history.length - 1
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title="Next move"
            >
              ⏭
            </button>
            
            <button
              type="button"
              onClick={handleSpeedChange}
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              {playbackSpeed}x
            </button>
          </div>

          {/* Progress */}
          <div className="text-center text-sm text-gray-500">
            {hasMoves ? (
              <>
                Move {Math.max(0, currentMoveIndex + 1)} of {replayData.move_history.length}
                {isComplete && (
                  <span className="ml-2">
                    {replayData.is_completed ? (
                      <span className="text-green-600">✓ Completed in {formatTime(replayData.time_seconds * 1000)}</span>
                    ) : replayData.is_failed ? (
                      <span className="text-red-600">✗ Game Over</span>
                    ) : null}
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-400">No moves recorded for this game</span>
            )}
          </div>
        </div>

        {/* Share link */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/replay/${targetUserId}/${replayData.date}`
              navigator.clipboard.writeText(url)
              alert('Link copied to clipboard!')
            }}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            📋 Copy link to this replay
          </button>
        </div>
      </main>
    </div>
  )
}
