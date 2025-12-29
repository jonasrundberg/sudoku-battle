/**
 * Timer component with pause functionality.
 * Displays elapsed time in MM:SS format, along with difficulty and lives.
 */

export default function Timer({ time, isPaused, isCompleted, isFailed, onPauseToggle, difficulty, mistakes, maxMistakes }) {
  // Format time as MM:SS with accent colon
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return {
      mins: mins.toString().padStart(2, '0'),
      secs: secs.toString().padStart(2, '0')
    }
  }

  const { mins, secs } = formatTime(time)

  return (
    <div className="flex items-center justify-between w-full max-w-md mb-1 px-1">
      <div className="timer text-gray-800">
        <span>{mins}</span>
        <span style={{ color: '#2563EB' }}>:</span>
        <span>{secs}</span>
      </div>
      
      {!isCompleted && !isFailed && (
        <button
          type="button"
          onClick={onPauseToggle}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? (
            // Play icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            // Pause icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </button>
      )}
      
      {isCompleted && (
        <span className="text-green-600 font-semibold">✓ Complete!</span>
      )}

      {/* Difficulty and Lives */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-500 uppercase">
          {difficulty}
        </span>
        <div className="flex items-center gap-0.5">
          {[...Array(maxMistakes)].map((_, i) => (
            <span
              key={i}
              className={`text-lg transition-all duration-300 ${
                i < maxMistakes - mistakes
                  ? ''
                  : 'grayscale opacity-40'
              }`}
            >
              ⭐
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
