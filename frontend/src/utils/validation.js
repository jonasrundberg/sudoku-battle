/**
 * Client-side validation for Sudoku rules.
 * Finds conflicts (duplicate numbers in same row/column/3x3 box).
 */

/**
 * Find all cells that have conflicts (duplicates in row, column, or box).
 * 
 * @param {number[][]} board - 9x9 grid with 0 for empty cells
 * @returns {Array<{row: number, col: number}>} - List of conflicting cell positions
 */
export function findConflicts(board) {
  const conflicts = new Set()

  // Check each cell
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const value = board[row][col]
      if (value === 0) continue

      // Check row
      for (let c = 0; c < 9; c++) {
        if (c !== col && board[row][c] === value) {
          conflicts.add(`${row},${col}`)
          conflicts.add(`${row},${c}`)
        }
      }

      // Check column
      for (let r = 0; r < 9; r++) {
        if (r !== row && board[r][col] === value) {
          conflicts.add(`${row},${col}`)
          conflicts.add(`${r},${col}`)
        }
      }

      // Check 3x3 box
      const boxRowStart = Math.floor(row / 3) * 3
      const boxColStart = Math.floor(col / 3) * 3
      for (let r = boxRowStart; r < boxRowStart + 3; r++) {
        for (let c = boxColStart; c < boxColStart + 3; c++) {
          if ((r !== row || c !== col) && board[r][c] === value) {
            conflicts.add(`${row},${col}`)
            conflicts.add(`${r},${c}`)
          }
        }
      }
    }
  }

  // Convert Set to array of {row, col} objects
  return Array.from(conflicts).map((key) => {
    const [row, col] = key.split(',').map(Number)
    return { row, col }
  })
}

/**
 * Check if the board is completely filled (no empty cells).
 * 
 * @param {number[][]} board - 9x9 grid
 * @returns {boolean} - True if all cells are filled
 */
export function isBoardComplete(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) return false
    }
  }
  return true
}

/**
 * Check if the board is valid (no conflicts) and complete.
 * Note: This doesn't verify the solution is correct, just that it follows rules.
 * 
 * @param {number[][]} board - 9x9 grid
 * @returns {boolean} - True if board is valid and complete
 */
export function isValidAndComplete(board) {
  if (!isBoardComplete(board)) return false
  return findConflicts(board).length === 0
}
