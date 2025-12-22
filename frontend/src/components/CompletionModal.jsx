/**
 * Modal shown when puzzle is completed successfully.
 */

export default function CompletionModal({ time, difficulty, onClose }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Fun messages based on time
  const getMessage = () => {
    if (time < 120) return "Lightning fast! ⚡"
    if (time < 300) return "Great job! 🎉"
    if (time < 600) return "Well done! 👏"
    return "You did it! 🏆"
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-6xl mb-4">🎊</div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Puzzle Complete!
        </h2>
        
        <p className="text-lg text-gray-600 mb-6">{getMessage()}</p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-4xl font-mono font-bold text-blue-600 mb-1">
            {formatTime(time)}
          </div>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize
            ${difficulty === 'easy' ? 'bg-green-100 text-green-800' : ''}
            ${difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
            ${difficulty === 'hard' ? 'bg-orange-100 text-orange-800' : ''}
            ${difficulty === 'expert' ? 'bg-red-100 text-red-800' : ''}
          `}>
            {difficulty}
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mb-4">
          Come back tomorrow for a new puzzle!
        </p>
        
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}
