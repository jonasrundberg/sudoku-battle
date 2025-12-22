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
  isMistake,
  isWrong,
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

  // Background color based on state - using inline styles to avoid Tailwind JIT issues
  let bgStyle = {}
  if (isMistake) {
    bgStyle = { backgroundColor: '#fca5a5' } // red-300
  } else if (isSelected) {
    bgStyle = { backgroundColor: isWrong ? '#93c5fd' : '#bfdbfe' } // blue-300 or blue-200
  } else if (isWrong) {
    bgStyle = { backgroundColor: '#fef2f2' } // red-50
  } else if (isConflict) {
    bgStyle = { backgroundColor: '#fee2e2' } // red-100
  } else if (isSameNumber && value !== 0) {
    bgStyle = { backgroundColor: '#dbeafe' } // blue-100
  } else if (isHighlighted) {
    bgStyle = { backgroundColor: '#eff6ff' } // blue-50
  }

  // Text color based on whether it's a given number, wrong, or user input
  let textColor = isGiven ? 'text-gray-900' : 'text-blue-600'
  if (isWrong) {
    textColor = 'text-red-600'
  }
  const fontWeight = isGiven ? 'font-bold' : 'font-semibold'

  return (
    <button
      type="button"
      onClick={() => onClick(row, col)}
      style={bgStyle}
      className={`
        sudoku-cell
        ${borderClasses}
        ${textColor}
        ${fontWeight}
        ${isMistake ? 'animate-pulse' : ''}
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
    prevProps.isSameNumber === nextProps.isSameNumber &&
    prevProps.isMistake === nextProps.isMistake &&
    prevProps.isWrong === nextProps.isWrong
  )
})
