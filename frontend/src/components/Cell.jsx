/**
 * Individual cell in the Sudoku grid.
 * Handles display of given numbers, user input, conflicts, and selection.
 */

import { memo } from 'react'

function Cell({
  value,
  isGiven,
  isSelected,
  isHighlighted,
  isConflict,
  isSameNumber,
  row,
  col,
  onClick,
}) {
  // Determine border classes for 3x3 box separation
  const borderClasses = [
    // Right thick border after columns 2, 5
    (col === 2 || col === 5) ? 'border-r-2 border-r-gray-800' : 'border-r border-r-gray-300',
    // Bottom thick border after rows 2, 5
    (row === 2 || row === 5) ? 'border-b-2 border-b-gray-800' : 'border-b border-b-gray-300',
  ].join(' ')

  // Background color based on state
  let bgColor = 'bg-white'
  if (isConflict) {
    bgColor = 'bg-red-100'
  } else if (isSelected) {
    bgColor = 'bg-blue-200'
  } else if (isSameNumber && value !== 0) {
    bgColor = 'bg-blue-100'
  } else if (isHighlighted) {
    bgColor = 'bg-gray-100'
  }

  // Text color based on whether it's a given number or user input
  const textColor = isGiven ? 'text-gray-900' : 'text-blue-600'
  const fontWeight = isGiven ? 'font-bold' : 'font-semibold'

  return (
    <button
      type="button"
      onClick={() => onClick(row, col)}
      className={`
        sudoku-cell
        ${borderClasses}
        ${bgColor}
        ${textColor}
        ${fontWeight}
        ${isConflict ? 'conflict-pulse' : ''}
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset
        no-select
      `}
      aria-label={`Cell row ${row + 1} column ${col + 1}, value ${value || 'empty'}`}
    >
      {value !== 0 ? value : ''}
    </button>
  )
}

// Memoize to prevent unnecessary re-renders
export default memo(Cell, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.isGiven === nextProps.isGiven &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.isConflict === nextProps.isConflict &&
    prevProps.isSameNumber === nextProps.isSameNumber
  )
})
