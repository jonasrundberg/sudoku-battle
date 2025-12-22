/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom sudoku colors
        'sudoku-primary': '#2563eb',     // Blue for selection
        'sudoku-conflict': '#ef4444',    // Red for conflicts
        'sudoku-given': '#1e293b',       // Dark for given numbers
        'sudoku-input': '#2563eb',       // Blue for user input
        'sudoku-highlight': '#dbeafe',   // Light blue for related cells
        'sudoku-selected': '#bfdbfe',    // Selected cell background
      },
      fontFamily: {
        'sudoku': ['SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      gridTemplateColumns: {
        'sudoku': 'repeat(9, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
}
