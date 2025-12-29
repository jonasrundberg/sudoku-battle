import { useMemo } from 'react'

/**
 * Number pad for entering values 1-9, toggling notes mode, and erasing.
 * Touch-friendly for mobile devices.
 */

export default function NumberPad({ onNumberClick, onEraseClick, disabled, notesMode, onNotesToggle, onClearAllNotes, hasNotes, board }) {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  // Count occurrences of each digit on the board
  // A digit is "complete" when all 9 instances are placed
  const completedDigits = useMemo(() => {
    if (!board) return new Set()
    
    const counts = {}
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const val = board[row][col]
        if (val >= 1 && val <= 9) {
          counts[val] = (counts[val] || 0) + 1
        }
      }
    }
    
    const completed = new Set()
    for (let num = 1; num <= 9; num++) {
      if (counts[num] === 9) {
        completed.add(num)
      }
    }
    return completed
  }, [board])

  return (
    <div className="mt-2 w-full max-w-md px-2">
      {/* Notes toggle and Erase button row */}
      <div className="flex justify-end gap-2 mb-2">
        {/* Clear all notes button - only show when there are notes */}
        {hasNotes && (
          <button
            type="button"
            onClick={onClearAllNotes}
            disabled={disabled}
            className={`
              numpad-btn px-3 py-2 text-gray-500 border-gray-200 flex items-center gap-1.5
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
            `}
            aria-label="Clear all notes"
          >
            {/* Trash icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span className="text-sm font-medium">Clear</span>
          </button>
        )}

        {/* Notes toggle button */}
        <button
          type="button"
          onClick={onNotesToggle}
          disabled={disabled}
          className={`
            numpad-btn px-3 py-2 flex items-center gap-1.5 transition-all
            ${notesMode 
              ? 'active' 
              : 'text-gray-500 border-gray-200 hover:bg-gray-50'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label={notesMode ? 'Notes mode on' : 'Notes mode off'}
          aria-pressed={notesMode}
        >
          {/* Pencil icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          <span className="text-sm font-medium">Notes</span>
        </button>

        {/* Erase button */}
        <button
          type="button"
          onClick={onEraseClick}
          disabled={disabled}
          className={`
            numpad-btn px-4 py-2 text-red-500 border-red-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50'}
          `}
          aria-label="Erase"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
            />
          </svg>
        </button>
      </div>
      
      {/* Number buttons row */}
      <div className="flex gap-1">
        {numbers.map((num) => {
          const isComplete = completedDigits.has(num)
          const isDisabled = disabled || isComplete
          
          return (
            <button
              key={num}
              type="button"
              onClick={() => onNumberClick(num)}
              disabled={isDisabled}
              className={`
                numpad-btn flex-1 min-w-0 aspect-square
                ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}
                ${notesMode && !isComplete ? 'border-blue-300' : ''}
              `}
              aria-label={notesMode ? `Toggle note ${num}` : `Enter ${num}`}
            >
              {num}
            </button>
          )
        })}
      </div>
    </div>
  )
}
