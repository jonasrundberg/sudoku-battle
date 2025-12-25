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
import { usePasskey } from './hooks/usePasskey'
import { useSudoku } from './hooks/useSudoku'
import { useTimer } from './hooks/useTimer'
import { getProgress } from './utils/api'

function App() {
  const { passkey, isLoading: passkeyLoading, updatePasskey } = usePasskey()
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
  const [showGameOver, setShowGameOver] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [verificationError, setVerificationError] = useState(null)
  const [lastMistakeCell, setLastMistakeCell] = useState(null)
  const [showStartScreen, setShowStartScreen] = useState(null) // null = checking, true = show, false = hide
  const [checkingProgress, setCheckingProgress] = useState(true)

  // Check if user has progress for today before showing the game
  useEffect(() => {
    if (!passkey || passkeyLoading) return

    const checkTodayProgress = async () => {
      try {
        const progress = await getProgress(passkey)
        if (progress && progress.date) {
          // User has progress for today - go straight to game
          setShowStartScreen(false)
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
  }, [passkey, passkeyLoading])

  // Load puzzle and progress when game starts (after clicking Play or if user has existing progress)
  useEffect(() => {
    if (passkey && !passkeyLoading && showStartScreen === false) {
      loadPuzzle().then(() => {
        loadProgress().then((progress) => {
          if (progress) {
            setTime(progress.time_seconds)
            if (progress.is_failed) {
              pause()
              setShowGameOver(true)
            } else if (!progress.is_completed && !progress.is_paused) {
              start()
            }
          } else {
            start()
          }
        })
      })
    }
  }, [passkey, passkeyLoading, showStartScreen])

  // Auto-save progress periodically
  useEffect(() => {
    if (!passkey || isCompleted || isFailed) return

    const interval = setInterval(() => {
      saveProgress(board, time, isPaused, mistakes)
    }, 30000) // Save every 30 seconds

    return () => clearInterval(interval)
  }, [passkey, board, time, isPaused, isCompleted, isFailed, mistakes])

  // Handle pause/resume
  const handlePauseToggle = useCallback(() => {
    if (isPaused) {
      resume()
    } else {
      pause()
      saveProgress(board, time, true, mistakes)
    }
  }, [isPaused, pause, resume, board, time, saveProgress, mistakes])

  // Handle number input
  const handleNumberInput = useCallback((num) => {
    if (selectedCell && !isPaused && !isCompleted && !isFailed) {
      const result = handleCellInput(selectedCell.row, selectedCell.col, num)
      setVerificationError(null) // Clear error when user makes changes
      
      if (result.mistake) {
        // Show mistake feedback
        setLastMistakeCell({ row: selectedCell.row, col: selectedCell.col })
        setTimeout(() => setLastMistakeCell(null), 500) // Clear after animation
        
        if (result.gameOver) {
          pause()
          // Save failed state to server
          saveProgress(board, time, false, maxMistakes)
          setShowGameOver(true)
        } else {
          // Save progress with updated mistakes
          saveProgress(board, time, false, mistakes + 1)
        }
      }
    }
  }, [selectedCell, isPaused, isCompleted, isFailed, handleCellInput, pause, saveProgress, board, time, mistakes, maxMistakes])

  // Handle erase
  const handleEraseClick = useCallback(() => {
    if (selectedCell && !isPaused && !isCompleted && !isFailed) {
      handleErase(selectedCell.row, selectedCell.col)
    }
  }, [selectedCell, isPaused, isCompleted, isFailed, handleErase])

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

  // Show loading while checking for existing progress
  if (passkeyLoading || checkingProgress) {
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
          passkey={passkey}
          onPlay={handlePlay}
          onStatsClick={() => setShowStats(true)}
          onLeaderboardClick={() => setShowLeaderboard(true)}
          onAccountClick={() => setShowAccount(true)}
        />
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
        {showAccount && (
          <AccountModal
            passkey={passkey}
            onPasskeyChange={(newPasskey) => {
              updatePasskey(newPasskey)
              window.location.reload()
            }}
            onClose={() => setShowAccount(false)}
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
        passkey={passkey}
        onStatsClick={() => setShowStats(true)}
        onLeaderboardClick={() => setShowLeaderboard(true)}
        onAccountClick={() => setShowAccount(true)}
      />

      <main className="flex-1 flex flex-col items-center justify-center p-2 pt-0 max-w-lg mx-auto w-full">
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
        <div className={`w-full max-w-md ${isPaused || isFailed ? 'opacity-20 pointer-events-none' : ''}`}>
          <SudokuGrid
            board={board}
            originalBoard={originalBoard}
            conflicts={conflicts}
            wrongCells={wrongCells}
            selectedCell={selectedCell}
            onCellClick={setSelectedCell}
            mistakeCell={lastMistakeCell}
          />
        </div>

        {isPaused && !isCompleted && !isFailed && (
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
          disabled={isPaused || isCompleted || isFailed}
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

      {showGameOver && (
        <GameOverModal
          mistakes={mistakes}
          onClose={() => setShowGameOver(false)}
        />
      )}

      {showAccount && (
        <AccountModal
          passkey={passkey}
          onPasskeyChange={(newPasskey) => {
            updatePasskey(newPasskey)
            // Reload the page to fetch data for the new passkey
            window.location.reload()
          }}
          onClose={() => setShowAccount(false)}
        />
      )}
    </div>
  )
}

export default App
