/**
 * Number pad for entering values 1-9 and erasing.
 * Touch-friendly for mobile devices.
 */

export default function NumberPad({ onNumberClick, onEraseClick, disabled }) {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  return (
    <div className="mt-6 w-full max-w-md">
      <div className="grid grid-cols-5 gap-2 px-4">
        {numbers.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onNumberClick(num)}
            disabled={disabled}
            className={`
              numpad-btn
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            aria-label={`Enter ${num}`}
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          onClick={onEraseClick}
          disabled={disabled}
          className={`
            numpad-btn text-red-500 border-red-200
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
    </div>
  )
}
