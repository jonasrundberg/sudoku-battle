# Family Sudoku 🧩

A daily sudoku challenge where everyone gets the same puzzle. Compete with friends, track your stats, and climb the leaderboards.

**🌐 Play now: [familysudoku.com](https://familysudoku.com)**

## How It Works

1. **One puzzle per day** — Everyone gets the same sudoku, refreshed at midnight
2. **3 lives** — Make 3 mistakes and it's game over
3. **Compete with friends** — Create private leaderboards and share invite codes
4. **Sync across devices** — Set up a passkey to play on phone, tablet, and desktop

## Features

- 🧩 **Daily puzzle** — Same puzzle for everyone, random difficulty each day
- ⭐ **3 lives system** — Lose a star for each mistake
- 🏆 **Private leaderboards** — Create groups with invite codes (like Advent of Code)
- 👥 **Friends feed** — See who completed today's puzzle on the start screen
- 📱 **Mobile-first** — Touch-optimized with responsive design
- 🔐 **Passkey sync** — Use Face ID/Touch ID to sync progress across devices
- ⏱️ **Timer with pause** — Track your solving time
- 💾 **Auto-save** — Progress saved automatically

## Difficulty Levels

Each day's difficulty is randomly selected using the date as a seed, so everyone gets the same difficulty:
- **Easy** — 40% empty cells
- **Medium** — 50% empty cells
- **Hard** — 60% empty cells
- **Expert** — 70% empty cells


## Tech Stack

- **Backend**: Python 3.12, FastAPI, Google Cloud Firestore
- **Frontend**: React 18, Vite, Tailwind CSS
- **Auth**: WebAuthn/Passkeys (Face ID, Touch ID, Windows Hello)
- **Hosting**: Google Cloud Run
- **Puzzle Generation**: py-sudoku with deterministic date-based seeding

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 20+
- Google Cloud account (for Firestore)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your settings
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173, proxies API to :8000
```

### Environment Variables

| Variable                  | Description                         | Default                 |
| ------------------------- | ----------------------------------- | ----------------------- |
| `GCP_PROJECT_ID`          | Google Cloud project ID             | (required)              |
| `ENVIRONMENT`             | `development` or `production`       | `development`           |
| `CORS_ORIGINS`            | Comma-separated origins (prod only) | `*` in dev              |
| `WEBAUTHN_RP_ID`          | Relying party ID (domain)           | `localhost`             |
| `WEBAUTHN_ORIGIN`         | Origin URL for WebAuthn             | `http://localhost:5173` |
| `FIRESTORE_EMULATOR_HOST` | Firestore emulator host (local dev) | (optional)              |

> **Note**: In production on Cloud Run, `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN` are auto-detected from the request headers, so you typically don't need to set them.

## Deployment

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Deploy to Cloud Run
./deploy/deploy.sh
```



## License

MIT License - see [LICENSE](LICENSE)
