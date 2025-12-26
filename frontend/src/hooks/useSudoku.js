/**
 * Hook for managing Sudoku puzzle state.
 * Handles loading puzzle, tracking board state, conflicts, mistakes, and completion.
 */

import { useState, useCallback, useRef } from 'react'
import { getTodayPuzzle, getProgress, saveProgress, verifySolution } from '../utils/api'
import { findConflicts } from '../utils/validation'

const MAX_MISTAKES = 3

export function useSudoku(userId) {
  // Puzzle data from server
  const [puzzle, setPuzzle] = useState(null)
  const [solution, setSolution] = useState(null)
  const [originalBoard, setOriginalBoard] = useState(null)
  const [difficulty, setDifficulty] = useState(null)
  const [date, setDate] = useState(null)
  const [dayOfWeek, setDayOfWeek] = useState(null)

  // Current board state (user's input)
  const [board, setBoard] = useState(null)
  
  // Game state
  const [isCompleted, setIsCompleted] = useState(false)
  const [isFailed, setIsFailed] = useState(false)
  const [mistakes, setMistakes] = useState(0)
  const [conflicts, setConflicts] = useState([])
  const [wrongCells, setWrongCells] = useState(new Set()) // Track cells with wrong values
  const [selectedCell, setSelectedCell] = useState(null)

  // Move history for replay functionality
  const [moveHistory, setMoveHistory] = useState([])
  const gameStartTime = useRef(null)

  // Load today's puzzle from server
  const loadPuzzle = useCallback(async () => {
    try {
      const data = await getTodayPuzzle()
      setPuzzle(data.puzzle)
      setSolution(data.solution)
      setOriginalBoard(data.puzzle)
      setBoard(data.puzzle.map(row => [...row])) // Deep copy
      setDifficulty(data.difficulty)
      setDate(data.date)
      setDayOfWeek(data.day_of_week)
      setMoveHistory([]) // Reset move history for new game
      gameStartTime.current = Date.now() // Mark game start
      return data
    } catch (error) {
      console.error('Failed to load puzzle:', error)
      throw error
    }
  }, [])

  // Load saved progress from server
  const loadProgress = useCallback(async () => {
    if (!userId) return null

    try {
      const progress = await getProgress(userId)
      
      if (progress) {
        // Restore move history if available
        if (progress.move_history) {
          setMoveHistory(progress.move_history)
        }
        // Calculate game start time based on saved time
        gameStartTime.current = Date.now() - (progress.time_seconds * 1000)
        
        if (progress.is_failed) {
          setIsFailed(true)
          setMistakes(progress.mistakes || MAX_MISTAKES)
        } else if (progress.is_completed) {
          setIsCompleted(true)
        } else if (progress.board) {
          setBoard(progress.board)
          setMistakes(progress.mistakes || 0)
          // Recalculate conflicts for loaded board
          setConflicts(findConflicts(progress.board))
        }
        return progress
      }
      return null
    } catch (error) {
      console.error('Failed to load progress:', error)
      return null
    }
  }, [userId])

  // Save progress to server
  const saveProgressToServer = useCallback(async (currentBoard, timeSeconds, isPaused = false, currentMistakes = 0, currentMoveHistory = null) => {
    if (!userId || isCompleted || isFailed) return
    // Don't save if board is not loaded yet
    if (!currentBoard || currentBoard.length !== 9) return

    try {
      await saveProgress(userId, currentBoard, timeSeconds, isPaused, currentMistakes, currentMoveHistory || moveHistory)
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }, [userId, isCompleted, isFailed, moveHistory])

  // Handle cell input - returns true if correct, false if wrong
  // Also returns newBoard and newMoveHistory to avoid stale closure issues when saving
  const handleCellInput = useCallback((row, col, value) => {
    // Don't allow editing original (given) cells
    if (originalBoard[row][col] !== 0) return { valid: false }
    if (isCompleted || isFailed) return { valid: false }

    // Check if the value is correct against solution
    const isCorrect = solution[row][col] === value
    const cellKey = `${row},${col}`
    
    // Record move for replay
    const timeMs = gameStartTime.current ? Date.now() - gameStartTime.current : 0
    const newMove = {
      row,
      col,
      value,
      time_ms: timeMs,
      is_correct: isCorrect,
    }
    
    // Calculate new board
    const newBoard = board.map(r => [...r])
    newBoard[row][col] = value
    
    // Calculate new move history
    const newMoveHistory = [...moveHistory, newMove]
    
    if (!isCorrect) {
      // Update state
      setMoveHistory(newMoveHistory)
      
      // Wrong answer - increment mistakes and place the wrong number
      const newMistakes = mistakes + 1
      setMistakes(newMistakes)
      
      // Place wrong number on board and mark as wrong
      setBoard(newBoard)
      setConflicts(findConflicts(newBoard))
      
      // Add to wrong cells set
      setWrongCells(prev => new Set([...prev, cellKey]))
      
      // Check if game over
      if (newMistakes >= MAX_MISTAKES) {
        setIsFailed(true)
        return { valid: false, mistake: true, gameOver: true, newMistakes, newBoard, newMoveHistory }
      }
      
      return { valid: false, mistake: true, gameOver: false, newMistakes, newBoard, newMoveHistory }
    }

    // Correct answer - update state
    setMoveHistory(newMoveHistory)
    setBoard(newBoard)
    setConflicts(findConflicts(newBoard))
    
    // Remove from wrong cells if corrected
    setWrongCells(prev => {
      const newSet = new Set(prev)
      newSet.delete(cellKey)
      return newSet
    })
    
    return { valid: true, mistake: false, gameOver: false, newBoard, newMoveHistory }
  }, [originalBoard, solution, isCompleted, isFailed, mistakes, board, moveHistory])

  // Handle erase
  const handleErase = useCallback((row, col) => {
    // Don't allow erasing original (given) cells
    if (originalBoard[row][col] !== 0) return
    if (isCompleted || isFailed) return

    const cellKey = `${row},${col}`
    
    // Record erase for replay (value 0 = erase)
    const timeMs = gameStartTime.current ? Date.now() - gameStartTime.current : 0
    setMoveHistory(prev => [...prev, {
      row,
      col,
      value: 0,
      time_ms: timeMs,
      is_correct: true, // Erase is always valid
    }])
    
    setBoard(prevBoard => {
      const newBoard = prevBoard.map(r => [...r])
      newBoard[row][col] = 0
      
      // Update conflicts
      const newConflicts = findConflicts(newBoard)
      setConflicts(newConflicts)
      
      return newBoard
    })
    
    // Remove from wrong cells
    setWrongCells(prev => {
      const newSet = new Set(prev)
      newSet.delete(cellKey)
      return newSet
    })
  }, [originalBoard, isCompleted, isFailed])

  // Verify and complete puzzle
  const verifyAndComplete = useCallback(async (timeSeconds) => {
    if (!userId || isCompleted || isFailed) return { is_correct: false, message: 'Already completed or failed' }

    try {
      const result = await verifySolution(userId, board, timeSeconds)
      
      if (result.is_correct) {
        setIsCompleted(true)
      }
      
      return result
    } catch (error) {
      console.error('Failed to verify solution:', error)
      return { is_correct: false, message: 'Verification failed' }
    }
  }, [userId, board, isCompleted, isFailed])

  return {
    // Data
    puzzle,
    board,
    originalBoard,
    difficulty,
    date,
    dayOfWeek,
    
    // State
    isCompleted,
    isFailed,
    mistakes,
    maxMistakes: MAX_MISTAKES,
    conflicts,
    wrongCells,
    selectedCell,
    setSelectedCell,
    moveHistory,
    
    // Actions
    handleCellInput,
    handleErase,
    loadPuzzle,
    loadProgress,
    saveProgress: saveProgressToServer,
    verifyAndComplete,
  }
}
