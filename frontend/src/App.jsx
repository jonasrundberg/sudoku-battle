import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import SudokuGrid from './components/SudokuGrid'
import NumberPad from './components/NumberPad'
import Timer from './components/Timer'
import Controls from './components/Controls'
import StatsModal from './components/StatsModal'
import LeaderboardModal from './components/LeaderboardModal'
import CompletionModal from './components/CompletionModal'
import { usePasskey } from './hooks/usePasskey'
import { useSudoku } from './hooks/useSudoku'
import { useTimer } from './hooks/useTimer'

function App() {
  const { passkey, isLoading: passkeyLoading } = usePasskey()
  const {
    puzzle,
    board,
    originalBoard,
    difficulty,
    date,
    isCompleted,
    conflicts,
    selectedCell,
    setSelectedCell,
    handleCellInput,
    handleErase,
    loadPuzzle,
    loadProgress,
    saveProgress,
    verifyAndComplete,
  } = useSudoku(passkey)

  const {
    time,
    isPaused,
    isRunning,
    start,
    pause,
    resume,
    reset,
    setTime,
  } = useTimer()

  const [showStats, setShowStats] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)

  // Load puzzle and progress on mount
  useEffect(() => {
    if (passkey && !passkeyLoading) {
      loadPuzzle().then(() => {
        loadProgress().then((progress) => {
          if (progress) {
            setTime(progress.time_seconds)
            if (!progress.is_completed && !progress.is_paused) {
              start()
            }
          } else {
            start()
          }
        })
      })
    }
  }, [passkey, passkeyLoading])

  // Auto-save progress periodically
  useEffect(() => {
    if (!passkey || isCompleted) return

    const interval = setInterval(() => {
      saveProgress(board, time, isPaused)
    }, 30000) // Save every 30 seconds

    return () => clearInterval(interval)
  }, [passkey, board, time, isPaused, isCompleted])

  // Handle pause/resume
  const handlePauseToggle = useCallback(() => {
    if (isPaused) {
      resume()
    } else {
      pause()
      saveProgress(board, time, true)
    }
  }, [isPaused, pause, resume, board, time, saveProgress])

  // Handle number input
  const handleNumberInput = useCallback((num) => {
    if (selectedCell && !isPaused && !isCompleted) {
      handleCellInput(selectedCell.row, selectedCell.col, num)
    }
  }, [selectedCell, isPaused, isCompleted, handleCellInput])

  // Handle erase
  const handleEraseClick = useCallback(() => {
    if (selectedCell && !isPaused && !isCompleted) {
      handleErase(selectedCell.row, selectedCell.col)
    }
  }, [selectedCell, isPaused, isCompleted, handleErase])

  // Handle completion check
  const handleCheck = useCallback(async () => {
    const result = await verifyAndComplete(time)
    if (result.is_correct) {
      pause()
      setShowCompletion(true)
    }
  }, [verifyAndComplete, time, pause])

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isPaused || isCompleted || !selectedCell) return

      const num = parseInt(e.key)
      if (num >= 1 && num <= 9) {
        handleNumberInput(num)
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        handleEraseClick()
      } else if (e.key === 'ArrowUp' && selectedCell.row > 0) {
        setSelectedCell({ row: selectedCell.row - 1, col: selectedCell.col })
      } else if (e.key === 'ArrowDown' && selectedCell.row < 8) {
        setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col })
      } else if (e.key === 'ArrowLeft' && selectedCell.col > 0) {
        setSelectedCell({ row: selectedCell.row, col: selectedCell.col - 1 })
      } else if (e.key === 'ArrowRight' && selectedCell.col < 8) {
        setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, isPaused, isCompleted, handleNumberInput, handleEraseClick, setSelectedCell])

  if (passkeyLoading || !puzzle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading today's puzzle...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        passkey={passkey}
        onStatsClick={() => setShowStats(true)}
        onLeaderboardClick={() => setShowLeaderboard(true)}
      />

      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full">
        {/* Date and difficulty */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">{date}</h2>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize
            ${difficulty === 'easy' ? 'bg-green-100 text-green-800' : ''}
            ${difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
            ${difficulty === 'hard' ? 'bg-orange-100 text-orange-800' : ''}
            ${difficulty === 'expert' ? 'bg-red-100 text-red-800' : ''}
          `}>
            {difficulty}
          </span>
        </div>

        {/* Timer */}
        <Timer
          time={time}
          isPaused={isPaused}
          isCompleted={isCompleted}
          onPauseToggle={handlePauseToggle}
        />

        {/* Sudoku Grid */}
        <div className={`w-full max-w-md ${isPaused ? 'opacity-20 pointer-events-none' : ''}`}>
          <SudokuGrid
            board={board}
            originalBoard={originalBoard}
            conflicts={conflicts}
            selectedCell={selectedCell}
            onCellClick={setSelectedCell}
          />
        </div>

        {isPaused && !isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
            <button
              onClick={handlePauseToggle}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              Resume Game
            </button>
          </div>
        )}

        {/* Number Pad */}
        <NumberPad
          onNumberClick={handleNumberInput}
          onEraseClick={handleEraseClick}
          disabled={isPaused || isCompleted}
        />

        {/* Controls */}
        <Controls
          onCheck={handleCheck}
          onPause={handlePauseToggle}
          isPaused={isPaused}
          isCompleted={isCompleted}
          hasConflicts={conflicts.length > 0}
        />
      </main>

      {/* Modals */}
      {showStats && (
        <StatsModal
          passkey={passkey}
          onClose={() => setShowStats(false)}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal
          passkey={passkey}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {showCompletion && (
        <CompletionModal
          time={time}
          difficulty={difficulty}
          onClose={() => setShowCompletion(false)}
        />
      )}
    </div>
  )
}

export default App
