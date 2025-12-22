/**
 * Modal shown when player runs out of lives.
 */

export default function GameOverModal({ mistakes, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-6xl mb-4">💔</div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Game Over
        </h2>
        
        <p className="text-lg text-gray-600 mb-6">
          You made {mistakes} mistakes and ran out of lives.
        </p>
        
        <div className="bg-red-50 rounded-lg p-4 mb-6">
          <div className="text-4xl mb-2">
            <span className="text-gray-300">❤️</span>
            <span className="text-gray-300">❤️</span>
            <span className="text-gray-300">❤️</span>
          </div>
          <div className="text-sm text-red-600 font-medium">
            No lives remaining
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mb-4">
          Today's challenge is over. Come back tomorrow for a fresh puzzle!
        </p>
        
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  )
}
