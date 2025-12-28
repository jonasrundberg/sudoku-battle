/**
 * Individual cell in the Sudoku grid.
 * Handles display of given numbers, user input, conflicts, notes, and selection.
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
  maskValue = false,
  notes = [],
  row,
  col,
  onClick,
}) {
  // Determine border styles for 3x3 box separation per design spec
  // 3x3 blocks: 2px #9CA3AF, inner cells: 1px #D1D5DB
  const getBorderStyle = () => {
    const style = {}
    // Right border
    if (col === 2 || col === 5) {
      style.borderRight = '2px solid #9CA3AF'
    } else if (col < 8) {
      style.borderRight = '1px solid #D1D5DB'
    }
    // Bottom border
    if (row === 2 || row === 5) {
      style.borderBottom = '2px solid #9CA3AF'
    } else if (row < 8) {
      style.borderBottom = '1px solid #D1D5DB'
    }
    return style
  }
  const borderStyle = getBorderStyle()
  const borderClasses = ''

  // Background color based on state - per design spec
  let bgStyle = {}
  if (isMistake) {
    bgStyle = { backgroundColor: '#fca5a5' } // red-300
  } else if (isSelected) {
    bgStyle = { backgroundColor: '#dbeafe' } // blue-100 (original)
  } else if (isWrong) {
    bgStyle = { backgroundColor: '#fef2f2' } // red-50
  } else if (isConflict) {
    bgStyle = { backgroundColor: '#fee2e2' } // red-100
  } else if (isSameNumber && value !== 0) {
    bgStyle = { backgroundColor: '#dbeafe' } // blue-100
  } else if (isHighlighted) {
    bgStyle = { backgroundColor: '#eff6ff' } // blue-50 (original)
  }

  // Text color: given=#111827, player-entered=#2563EB, wrong=red
  let textStyle = {}
  if (isWrong) {
    textStyle = { color: '#dc2626' } // red-600
  } else if (isGiven) {
    textStyle = { color: '#111827' } // given numbers
  } else {
    textStyle = { color: '#2563EB' } // player-entered accent
  }
  const fontWeight = 'font-medium'

  // Render notes in a 3x3 mini-grid
  const renderNotes = () => {
    if (value !== 0 || notes.length === 0) return null
    
    return (
      <div className="grid grid-cols-3 grid-rows-3 w-full h-full min-w-0 min-h-0 p-[1px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <span
            key={num}
            className="flex items-center justify-center text-[9px] sm:text-[0.7rem] text-gray-500 font-medium leading-none min-w-0 min-h-0"
          >
            {notes.includes(num) ? num : ''}
          </span>
        ))}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onClick(row, col)}
      style={{ ...bgStyle, ...textStyle, ...borderStyle }}
      className={`
        sudoku-cell
        ${fontWeight}
        ${isMistake ? 'animate-pulse' : ''}
        ${isConflict ? 'conflict-pulse' : ''}
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset
        no-select
      `}
      aria-label={`Cell row ${row + 1} column ${col + 1}, value ${value || 'empty'}`}
    >
      {value !== 0 ? (maskValue ? '●' : value) : renderNotes()}
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
    prevProps.isWrong === nextProps.isWrong &&
    prevProps.maskValue === nextProps.maskValue &&
    JSON.stringify(prevProps.notes) === JSON.stringify(nextProps.notes)
  )
})
