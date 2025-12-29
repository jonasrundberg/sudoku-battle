import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import SudokuGrid from './components/SudokuGrid'
import NumberPad from './components/NumberPad'
import Timer from './components/Timer'
import StatsModal from './components/StatsModal'
import LeaderboardModal from './components/LeaderboardModal'
import CompletionModal from './components/CompletionModal'
import GameOverModal from './components/GameOverModal'
import AccountModal from './components/AccountModal'
import StartScreen from './components/StartScreen'
import { useUserId } from './hooks/useUserId'
import { useSudoku } from './hooks/useSudoku'
import { useTimer } from './hooks/useTimer'
import { getProgress, getUserStats } from './utils/api'

function App() {
  const { userId, isLoading: userIdLoading, updateUserId } = useUserId()
  const {
    puzzle,
    board,
    originalBoard,
    difficulty,
    date,
    isCompleted,
    isFailed,
    mistakes,
    maxMistakes,
    conflicts,
    wrongCells,
    selectedCell,
    setSelectedCell,
    handleCellInput,
    handleErase,
    loadPuzzle,
    loadProgress,
    saveProgress,
    verifyAndComplete,
    moveHistory,
  } = useSudoku(userId)

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
  const [showGameOver, setShowGameOver] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [verificationError, setVerificationError] = useState(null)
  const [lastMistakeCell, setLastMistakeCell] = useState(null)
  const [showStartScreen, setShowStartScreen] = useState(null) // null = checking, true = show, false = hide
  const [checkingProgress, setCheckingProgress] = useState(true)
  
  // Notes feature - local only, not saved to backend
  const [notesMode, setNotesMode] = useState(false)
  const [notes, setNotes] = useState({}) // { "row,col": [1, 3, 5], ... }

  // Track if user has set a username (for header notification dot)
  const [hasUsername, setHasUsername] = useState(true) // Assume true until loaded

  // Check username status
  const checkUsernameStatus = useCallback(async () => {
    if (!userId) return
    try {
      const stats = await getUserStats(userId)
      setHasUsername(!!stats.username)
    } catch {
      // Ignore errors
    }
  }, [userId])

  // Check username on mount and when userId changes
  useEffect(() => {
    if (userId && !userIdLoading) {
      checkUsernameStatus()
    }
  }, [userId, userIdLoading, checkUsernameStatus])

  // Check if user has progress for today before showing the game
  useEffect(() => {
    if (!userId || userIdLoading) return

    const checkTodayProgress = async () => {
      try {
        const progress = await getProgress(userId)
        if (progress && progress.date) {
          // User has progress for today
          if (progress.is_completed || progress.is_failed) {
            // Already completed or failed - show start screen with completion info
            setShowStartScreen(true)
          } else {
            // In progress - go straight to game
            setShowStartScreen(false)
          }
        } else {
          // No progress - show start screen
          setShowStartScreen(true)
        }
      } catch {
        // No progress found - show start screen
        setShowStartScreen(true)
      } finally {
        setCheckingProgress(false)
      }
    }
    checkTodayProgress()
  }, [userId, userIdLoading])

  // Load puzzle and progress when game starts (after clicking Play or if user has existing progress)
  useEffect(() => {
    if (userId && !userIdLoading && showStartScreen === false) {
      loadPuzzle().then(() => {
        loadProgress().then((progress) => {
          if (progress) {
            setTime(progress.time_seconds)
            if (progress.is_failed) {
              pause()
              setShowGameOver(true)
            } else if (!progress.is_completed) {
              // Always start the timer mechanism for in-progress games
              start()
              // If it was saved as paused, pause it after starting
              if (progress.is_paused) {
                pause()
              }
            }
          } else {
            start()
          }
        })
      })
    }
  }, [userId, userIdLoading, showStartScreen])

  // Auto-save progress periodically
  useEffect(() => {
    if (!userId || isCompleted || isFailed || showStartScreen) return

    const interval = setInterval(() => {
      saveProgress(board, time, isPaused, mistakes, moveHistory)
    }, 30000) // Save every 30 seconds

    return () => clearInterval(interval)
  }, [userId, board, time, isPaused, isCompleted, isFailed, mistakes, moveHistory, showStartScreen])

  // Handle pause/resume
  const handlePauseToggle = useCallback(() => {
    if (isPaused) {
      resume()
    } else {
      pause()
      saveProgress(board, time, true, mistakes, moveHistory)
    }
  }, [isPaused, pause, resume, board, time, saveProgress, mistakes, moveHistory])

  // Toggle note for a cell
  const toggleNote = useCallback((row, col, num) => {
    const key = `${row},${col}`
    setNotes(prev => {
      const cellNotes = prev[key] || []
      if (cellNotes.includes(num)) {
        // Remove the note
        const newNotes = cellNotes.filter(n => n !== num)
        if (newNotes.length === 0) {
          const { [key]: _, ...rest } = prev
          return rest
        }
        return { ...prev, [key]: newNotes }
      } else {
        // Add the note
        return { ...prev, [key]: [...cellNotes, num].sort() }
      }
    })
  }, [])

  // Clear notes for a cell (when a number is placed)
  const clearNotesForCell = useCallback((row, col) => {
    const key = `${row},${col}`
    setNotes(prev => {
      const { [key]: _, ...rest } = prev
      return rest
    })
  }, [])

  // Handle number input
  const handleNumberInput = useCallback((num) => {
    if (selectedCell && !isPaused && !isCompleted && !isFailed) {
      // Check if cell is a given (original) cell - can't edit those
      if (originalBoard && originalBoard[selectedCell.row][selectedCell.col] !== 0) {
        return
      }
      
      // If notes mode is on, toggle the note instead of placing a number
      if (notesMode) {
        // Only allow notes on empty cells
        if (board[selectedCell.row][selectedCell.col] === 0) {
          toggleNote(selectedCell.row, selectedCell.col, num)
        }
        return
      }
      
      // Clear notes when placing a number
      clearNotesForCell(selectedCell.row, selectedCell.col)
      
      // Pass time * 1000 to get accurate time_ms (excludes paused time)
      const result = handleCellInput(selectedCell.row, selectedCell.col, num, time * 1000)
      setVerificationError(null) // Clear error when user makes changes
      
      if (result.mistake) {
        // Show mistake feedback
        setLastMistakeCell({ row: selectedCell.row, col: selectedCell.col })
        setTimeout(() => setLastMistakeCell(null), 500) // Clear after animation
        
        if (result.gameOver) {
          pause()
          // Save failed state to server - use returned values to avoid stale closure
          saveProgress(result.newBoard, time, false, result.newMistakes, result.newMoveHistory)
          setShowGameOver(true)
        } else {
          // Save progress with updated mistakes - use returned values to avoid stale closure
          saveProgress(result.newBoard, time, false, result.newMistakes, result.newMoveHistory)
        }
      }
    }
  }, [selectedCell, isPaused, isCompleted, isFailed, notesMode, board, originalBoard, handleCellInput, pause, saveProgress, time, toggleNote, clearNotesForCell])

  // Handle erase
  const handleEraseClick = useCallback(() => {
    if (selectedCell && !isPaused && !isCompleted && !isFailed) {
      // Also clear notes when erasing
      clearNotesForCell(selectedCell.row, selectedCell.col)
      // Pass time * 1000 to get accurate time_ms (excludes paused time)
      handleErase(selectedCell.row, selectedCell.col, time * 1000)
    }
  }, [selectedCell, isPaused, isCompleted, isFailed, handleErase, clearNotesForCell, time])

  // Check if board is complete (all cells filled)
  const isBoardComplete = useCallback(() => {
    if (!board) return false
    return board.every(row => row.every(cell => cell !== 0))
  }, [board])

  // Auto-verify when board is complete and no conflicts
  useEffect(() => {
    if (!board || isCompleted || isFailed || isPaused || conflicts.length > 0) return
    if (!isBoardComplete()) return

    // Board is complete with no conflicts - verify with server
    const verify = async () => {
      setVerificationError(null)
      const result = await verifyAndComplete(time)
      if (result.is_correct) {
        pause()
        setShowCompletion(true)
      } else {
        // Solution was wrong (likely cheating attempt)
        setVerificationError('The solution is incorrect. Please check your answers.')
      }
    }
    verify()
  }, [board, isCompleted, isFailed, isPaused, conflicts, isBoardComplete, verifyAndComplete, time, pause])

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isPaused || isCompleted || isFailed || !selectedCell) return

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
  }, [selectedCell, isPaused, isCompleted, isFailed, handleNumberInput, handleEraseClick, setSelectedCell])

  // Handle Play button from start screen
  const handlePlay = useCallback(() => {
    setShowStartScreen(false)
  }, [])

  // Handle clicking logo to go back to start screen
  const handleHomeClick = useCallback(() => {
    if (!isCompleted && !isFailed && isRunning) {
      pause()
      saveProgress(board, time, true, mistakes, moveHistory)
    }
    setShowStartScreen(true)
  }, [isCompleted, isFailed, isRunning, pause, saveProgress, board, time, mistakes, moveHistory])

  // Show loading while checking for existing progress
  if (userIdLoading || checkingProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show start screen if user hasn't started today's puzzle
  if (showStartScreen) {
    return (
      <>
        <StartScreen
          userId={userId}
          onPlay={handlePlay}
          onStatsClick={() => setShowStats(true)}
          onLeaderboardClick={() => setShowLeaderboard(true)}
          onAccountClick={() => setShowAccount(true)}
          hasUsername={hasUsername}
        />
        {/* Modals */}
        {showStats && (
          <StatsModal
            userId={userId}
            onClose={() => setShowStats(false)}
          />
        )}
        {showLeaderboard && (
          <LeaderboardModal
            userId={userId}
            onClose={() => setShowLeaderboard(false)}
            onUsernameChange={() => setHasUsername(true)}
          />
        )}
        {showAccount && (
          <AccountModal
            userId={userId}
            onUserIdChange={(newUserId) => {
              updateUserId(newUserId)
              window.location.reload()
            }}
            onClose={() => setShowAccount(false)}
            onUsernameChange={() => setHasUsername(true)}
          />
        )}
      </>
    )
  }

  // Show loading while puzzle loads after clicking Play
  if (!puzzle || !board) {
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
        userId={userId}
        onStatsClick={() => setShowStats(true)}
        onLeaderboardClick={() => setShowLeaderboard(true)}
        onAccountClick={() => setShowAccount(true)}
        onHomeClick={handleHomeClick}
        hasUsername={hasUsername}
      />

      <main className="flex-1 flex flex-col items-center p-2 pt-1 max-w-lg mx-auto w-full">
        {/* Timer with difficulty and lives */}
        <Timer
          time={time}
          isPaused={isPaused}
          isCompleted={isCompleted}
          isFailed={isFailed}
          onPauseToggle={handlePauseToggle}
          difficulty={difficulty}
          mistakes={mistakes}
          maxMistakes={maxMistakes}
        />

        {/* Sudoku Grid */}
        <div className="w-full max-w-md relative">
          <div className={isPaused || isFailed ? 'opacity-0' : ''}>
            <SudokuGrid
              board={board}
              originalBoard={originalBoard}
              conflicts={conflicts}
              wrongCells={wrongCells}
              selectedCell={selectedCell}
              onCellClick={setSelectedCell}
              mistakeCell={lastMistakeCell}
              notes={notes}
            />
          </div>
          {isPaused && !isCompleted && !isFailed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={handlePauseToggle}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors shadow-lg"
              >
                Resume Game
              </button>
            </div>
          )}
        </div>

        {/* Number Pad */}
        <NumberPad
          onNumberClick={handleNumberInput}
          onEraseClick={handleEraseClick}
          disabled={isPaused || isCompleted || isFailed}
          notesMode={notesMode}
          onNotesToggle={() => setNotesMode(prev => !prev)}
          onClearAllNotes={() => setNotes({})}
          hasNotes={Object.keys(notes).length > 0}
          board={board}
        />

        {/* Verification Error */}
        {verificationError && (
          <div className="mt-4 w-full max-w-md px-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
              {verificationError}
            </div>
          </div>
        )}

        {/* Completion indicator */}
        {isCompleted && (
          <div className="mt-4 w-full max-w-md px-4">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-center font-semibold">
              ✓ Puzzle Completed!
            </div>
          </div>
        )}

        {/* Game Over indicator */}
        {isFailed && (
          <div className="mt-4 w-full max-w-md px-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center font-semibold">
              Game Over - Try again tomorrow!
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showStats && (
        <StatsModal
          userId={userId}
          onClose={() => setShowStats(false)}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal
          userId={userId}
          onClose={() => setShowLeaderboard(false)}
          onUsernameChange={() => setHasUsername(true)}
        />
      )}

      {showCompletion && (
        <CompletionModal
          time={time}
          difficulty={difficulty}
          mistakes={mistakes}
          userId={userId}
          onContinue={() => {
            setShowCompletion(false)
            setShowStartScreen(true)
          }}
        />
      )}

      {showGameOver && (
        <GameOverModal
          mistakes={mistakes}
          onContinue={() => {
            setShowGameOver(false)
            setShowStartScreen(true)
          }}
        />
      )}

      {showAccount && (
        <AccountModal
          userId={userId}
          onUserIdChange={(newUserId) => {
            updateUserId(newUserId)
            // Reload the page to fetch data for the new user
            window.location.reload()
          }}
          onClose={() => setShowAccount(false)}
          onUsernameChange={() => setHasUsername(true)}
        />
      )}
    </div>
  )
}

export default App
