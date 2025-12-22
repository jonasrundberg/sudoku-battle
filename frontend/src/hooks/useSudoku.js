/**
 * Hook for managing Sudoku puzzle state.
 * Handles loading puzzle, tracking board state, conflicts, and completion.
 */

import { useState, useCallback } from 'react'
import { getTodayPuzzle, getProgress, saveProgress, verifySolution } from '../utils/api'
import { findConflicts } from '../utils/validation'

export function useSudoku(passkey) {
  // Puzzle data from server
  const [puzzle, setPuzzle] = useState(null)
  const [originalBoard, setOriginalBoard] = useState(null)
  const [difficulty, setDifficulty] = useState(null)
  const [date, setDate] = useState(null)
  const [dayOfWeek, setDayOfWeek] = useState(null)

  // Current board state (user's input)
  const [board, setBoard] = useState(null)
  
  // Game state
  const [isCompleted, setIsCompleted] = useState(false)
  const [conflicts, setConflicts] = useState([])
  const [selectedCell, setSelectedCell] = useState(null)

  // Load today's puzzle from server
  const loadPuzzle = useCallback(async () => {
    try {
      const data = await getTodayPuzzle()
      setPuzzle(data.puzzle)
      setOriginalBoard(data.puzzle)
      setBoard(data.puzzle.map(row => [...row])) // Deep copy
      setDifficulty(data.difficulty)
      setDate(data.date)
      setDayOfWeek(data.day_of_week)
      return data
    } catch (error) {
      console.error('Failed to load puzzle:', error)
      throw error
    }
  }, [])

  // Load saved progress from server
  const loadProgress = useCallback(async () => {
    if (!passkey) return null

    try {
      const progress = await getProgress(passkey)
      
      if (progress) {
        if (progress.is_completed) {
          setIsCompleted(true)
        } else if (progress.board) {
          setBoard(progress.board)
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
  }, [passkey])

  // Save progress to server
  const saveProgressToServer = useCallback(async (currentBoard, timeSeconds, isPaused = false) => {
    if (!passkey || isCompleted) return

    try {
      await saveProgress(passkey, currentBoard, timeSeconds, isPaused)
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }, [passkey, isCompleted])

  // Handle cell input
  const handleCellInput = useCallback((row, col, value) => {
    // Don't allow editing original (given) cells
    if (originalBoard[row][col] !== 0) return
    if (isCompleted) return

    setBoard(prevBoard => {
      const newBoard = prevBoard.map(r => [...r])
      newBoard[row][col] = value
      
      // Update conflicts
      const newConflicts = findConflicts(newBoard)
      setConflicts(newConflicts)
      
      return newBoard
    })
  }, [originalBoard, isCompleted])

  // Handle erase
  const handleErase = useCallback((row, col) => {
    // Don't allow erasing original (given) cells
    if (originalBoard[row][col] !== 0) return
    if (isCompleted) return

    setBoard(prevBoard => {
      const newBoard = prevBoard.map(r => [...r])
      newBoard[row][col] = 0
      
      // Update conflicts
      const newConflicts = findConflicts(newBoard)
      setConflicts(newConflicts)
      
      return newBoard
    })
  }, [originalBoard, isCompleted])

  // Verify and complete puzzle
  const verifyAndComplete = useCallback(async (timeSeconds) => {
    if (!passkey || isCompleted) return { is_correct: false, message: 'Already completed' }

    try {
      const result = await verifySolution(passkey, board, timeSeconds)
      
      if (result.is_correct) {
        setIsCompleted(true)
      }
      
      return result
    } catch (error) {
      console.error('Failed to verify solution:', error)
      return { is_correct: false, message: 'Verification failed' }
    }
  }, [passkey, board, isCompleted])

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
    conflicts,
    selectedCell,
    setSelectedCell,
    
    // Actions
    handleCellInput,
    handleErase,
    loadPuzzle,
    loadProgress,
    saveProgress: saveProgressToServer,
    verifyAndComplete,
  }
}
