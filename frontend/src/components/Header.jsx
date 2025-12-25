/**
 * App header with title, user info, and navigation.
 */

export default function Header({ userId, onStatsClick, onLeaderboardClick, onAccountClick }) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center gap-2">
          <img src="/sudoku.svg" alt="" className="h-8 w-8" />
          <h1 className="text-xl font-bold text-gray-900">Sudoku Battle</h1>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          {/* Stats button */}
          <button
            type="button"
            onClick={onStatsClick}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="View stats"
            title="Your Stats"
          >
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </button>

          {/* Leaderboard button */}
          <button
            type="button"
            onClick={onLeaderboardClick}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Leaderboards"
            title="Leaderboards"
          >
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </button>

          {/* Account button */}
          <button
            type="button"
            onClick={onAccountClick}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Account"
            title="Account"
          >
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
