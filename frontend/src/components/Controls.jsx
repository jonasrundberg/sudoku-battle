/**
 * Control buttons for checking solution.
 */

export default function Controls({
  onCheck,
  isPaused,
  isCompleted,
  hasConflicts,
}) {
  return (
    <div className="mt-6 w-full max-w-md px-4">
      <button
        type="button"
        onClick={onCheck}
        disabled={isPaused || isCompleted || hasConflicts}
        className={`
          w-full py-3 rounded-lg font-semibold text-lg transition-colors
          ${
            isPaused || isCompleted || hasConflicts
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
          }
        `}
      >
        {isCompleted ? '✓ Completed!' : 'Check Solution'}
      </button>
      
      {hasConflicts && !isCompleted && (
        <p className="text-center text-sm text-red-500 mt-2">
          Fix conflicts before checking
        </p>
      )}
    </div>
  )
}
