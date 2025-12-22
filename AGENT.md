# Sudoku Battle - Project Plan

## Project Overview
A daily sudoku challenge website where all users get the same puzzle each day, with zero-friction passkey authentication and private leaderboards.

---

## Decisions Made

| Component         | Choice                 | Rationale                                                              |
| ----------------- | ---------------------- | ---------------------------------------------------------------------- |
| Backend Framework | **FastAPI**            | Async support, auto OpenAPI docs                                       |
| Sudoku Library    | **py-sudoku**          | Deterministic seeding, difficulty control, simple API, well-maintained |
| State Management  | React useState/Context | Simple app, no need for Redux                                          |
| Styling           | Tailwind CSS           | Per spec                                                               |
| Hosting           | Single Cloud Run       | Serves both API + static frontend (cheap & simple)                     |
| Difficulty        | Rotating by day        | Mon/Thu=Easy, Tue/Fri=Medium, Wed/Sat=Hard, Sun=Expert                 |

## Feature Decisions

- **Puzzles**: Only today's puzzle (no historical archive)
- **Difficulty**: Rotates by day of week (deterministic)
- **Pause**: Allowed (not considered cheating)
- **Stats**: Personal stats only
- **Leaderboards**: Private leaderboards with invite codes (like Advent of Code)
- **Mobile**: Fully responsive from the start

---

## Task List

### Phase 1: Project Setup
- [x] Initialize Python backend project structure
- [x] Initialize React frontend project structure (Vite)
- [x] Set up .gitignore for secrets and build artifacts
- [x] Create requirements.txt and package.json

### Phase 2: Backend Development
- [x] Set up FastAPI web service with CORS
- [x] Implement deterministic puzzle generation (date-seeded, rotating difficulty)
- [x] Design Firestore data models (users, progress, leaderboards)
- [x] API: `GET /api/puzzle/today` - Get today's puzzle
- [x] API: `POST /api/progress` - Save user progress
- [x] API: `POST /api/verify` - Verify solution (server-side)
- [x] API: `PUT /api/user/username` - Set/update username
- [x] API: `GET /api/user/stats` - Get personal stats
- [x] API: `POST /api/leaderboard` - Create private leaderboard
- [x] API: `POST /api/leaderboard/join` - Join via invite code
- [x] API: `GET /api/leaderboard/:id` - Get leaderboard results

### Phase 3: Frontend Development
- [x] Set up React + Vite + Tailwind CSS
- [x] Implement passkey generation and storage (localStorage)
- [x] Build Sudoku grid component (9x9 with 3x3 boxes)
- [x] Build number pad component (1-9 + erase)
- [x] Implement cell selection and input handling (keyboard + touch)
- [x] Implement client-side conflict detection
- [x] Build timer component with pause
- [x] Implement progress auto-save
- [x] Build completion/verification flow
- [x] Add username display/edit UI
- [x] Build personal stats view
- [x] Build leaderboard UI (create, join, view)
- [x] Style UI (clean, mobile-first, sudoku.com-inspired)

### Phase 4: Integration & Testing
- [x] Connect frontend to backend APIs
- [ ] Test puzzle generation consistency
- [ ] Test progress saving/loading
- [ ] Test solution verification
- [ ] Test leaderboard functionality
- [ ] Mobile responsiveness testing

### Phase 5: Deployment
- [x] Create Dockerfile for combined frontend+backend
- [x] Create Cloud Run deployment script
- [ ] Configure Firestore in GCP
- [ ] Configure CORS and security headers
- [ ] Final production deployment

---

## File Structure

```
sudoku-battle/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry + serves static files
│   │   ├── config.py               # Settings and configuration
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── puzzle.py           # GET /api/puzzle/today
│   │   │   ├── progress.py         # POST /api/progress, POST /api/verify
│   │   │   ├── user.py             # PUT /api/user/username, GET /api/user/stats
│   │   │   └── leaderboard.py      # Leaderboard CRUD endpoints
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── puzzle_generator.py # Date-seeded puzzle generation
│   │   │   └── firestore.py        # Firestore client wrapper
│   │   └── models/
│   │       ├── __init__.py
│   │       └── schemas.py          # Pydantic request/response models
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SudokuGrid.jsx      # Main 9x9 grid
│   │   │   ├── Cell.jsx            # Individual cell
│   │   │   ├── NumberPad.jsx       # 1-9 + erase buttons
│   │   │   ├── Timer.jsx           # Timer with pause
│   │   │   ├── Header.jsx          # App header with user info
│   │   │   ├── StatsModal.jsx      # Personal stats display
│   │   │   ├── LeaderboardModal.jsx # Leaderboard UI
│   │   │   └── UsernameEditor.jsx  # Edit username
│   │   ├── hooks/
│   │   │   ├── usePasskey.js       # Generate/store passkey
│   │   │   ├── useSudoku.js        # Puzzle state management
│   │   │   ├── useTimer.js         # Timer logic with pause
│   │   │   └── useApi.js           # API client hooks
│   │   ├── utils/
│   │   │   ├── api.js              # API client
│   │   │   └── validation.js       # Client-side conflict detection
│   │   ├── App.jsx
│   │   ├── App.css                 # Global styles if needed
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── deploy/
│   └── deploy.sh
├── .gitignore
├── LICENSE
├── README.md
└── AGENT.md
```

---

## Firestore Data Models

### Collection: `users`
```
users/{passkey}
├── username: string (optional)
├── created_at: timestamp
└── stats: {
    total_completed: number
    total_time_seconds: number
    best_time_by_difficulty: { easy: number, medium: number, hard: number, expert: number }
}
```

### Collection: `progress`
```
progress/{passkey}_{date}
├── passkey: string
├── date: string (YYYY-MM-DD)
├── board: number[][] (current state, 0 = empty)
├── time_seconds: number
├── is_completed: boolean
├── completed_at: timestamp (optional)
└── paused: boolean
```

### Collection: `leaderboards`
```
leaderboards/{leaderboard_id}
├── name: string
├── invite_code: string (unique, 8 chars)
├── created_by: string (passkey)
├── created_at: timestamp
└── members: string[] (passkeys)
```

### Collection: `leaderboard_results`
```
leaderboard_results/{leaderboard_id}_{date}_{passkey}
├── leaderboard_id: string
├── date: string
├── passkey: string
├── username: string
├── time_seconds: number
├── completed_at: timestamp
└── difficulty: string
```

---

## Difficulty Rotation Schedule

| Day       | Difficulty | Empty Cells % |
| --------- | ---------- | ------------- |
| Monday    | Easy       | 40%           |
| Tuesday   | Medium     | 50%           |
| Wednesday | Hard       | 60%           |
| Thursday  | Easy       | 40%           |
| Friday    | Medium     | 50%           |
| Saturday  | Hard       | 60%           |
| Sunday    | Expert     | 70%           |
