/**
 * 9x9 Sudoku grid component.
 * Renders cells with proper 3x3 box borders and handles selection highlighting.
 */

import Cell from './Cell'

export default function SudokuGrid({
  board,
  originalBoard,
  conflicts,
  wrongCells,
  selectedCell,
  onCellClick,
  mistakeCell,
}) {
  // Create a Set of conflict positions for quick lookup
  const conflictSet = new Set(
    conflicts.map(({ row, col }) => `${row},${col}`)
  )

  // Get the value of the selected cell for highlighting same numbers
  // Only highlight same numbers if selected cell has a value (like sudoku.com)
  const selectedValue = selectedCell
    ? board[selectedCell.row][selectedCell.col]
    : null

  // Check if a cell is in the same row or column as selected (no 3x3 box, like sudoku.com)
  const isHighlighted = (row, col) => {
    if (!selectedCell) return false
    if (row === selectedCell.row && col === selectedCell.col) return false

    // Same row or column only
    return row === selectedCell.row || col === selectedCell.col
  }

  const handleCellClick = (row, col) => {
    onCellClick({ row, col })
  }

  return (
    <div className="w-full aspect-square">
      <div
        className="grid border-2 border-gray-800 rounded-lg overflow-hidden"
        style={{ gridTemplateColumns: 'repeat(9, 1fr)' }}
      >
        {board.map((row, rowIndex) =>
          row.map((cellValue, colIndex) => (
            <Cell
              key={`${rowIndex}-${colIndex}`}
              value={cellValue}
              isGiven={originalBoard[rowIndex][colIndex] !== 0}
              isSelected={
                selectedCell?.row === rowIndex && selectedCell?.col === colIndex
              }
              isHighlighted={isHighlighted(rowIndex, colIndex)}
              isConflict={conflictSet.has(`${rowIndex},${colIndex}`)}
              isSameNumber={
                selectedValue !== null &&
                selectedValue !== 0 &&
                cellValue === selectedValue
              }
              isMistake={
                mistakeCell?.row === rowIndex && mistakeCell?.col === colIndex
              }
              isWrong={wrongCells?.has(`${rowIndex},${colIndex}`)}
              row={rowIndex}
              col={colIndex}
              onClick={handleCellClick}
            />
          ))
        )}
      </div>
    </div>
  )
}
