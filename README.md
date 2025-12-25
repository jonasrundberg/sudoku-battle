# Sudoku Battle 🎮

A daily sudoku challenge where everyone gets the same puzzle. Compete with friends, track your stats, and climb the leaderboards.

**🌐 Play now: [sudoku-battle-295309887144.europe-west1.run.app](https://sudoku-battle-295309887144.europe-west1.run.app)**

## How It Works

1. **One puzzle per day** — Everyone gets the same sudoku, refreshed at midnight
2. **3 lives** — Make 3 mistakes and it's game over
3. **Compete with friends** — Create private leaderboards and share invite codes
4. **Sync across devices** — Set up a passkey to play on phone, tablet, and desktop

## Features

- 🧩 **Daily puzzle** — Same puzzle for everyone, difficulty rotates by day of week
- ⭐ **3 lives system** — Lose a star for each mistake
- 🏆 **Private leaderboards** — Create groups with invite codes (like Advent of Code)
- 👥 **Friends feed** — See who completed today's puzzle on the start screen
- 📱 **Mobile-first** — Touch-optimized with responsive design
- 🔐 **Passkey sync** — Use Face ID/Touch ID to sync progress across devices
- ⏱️ **Timer with pause** — Track your solving time
- 💾 **Auto-save** — Progress saved automatically

## Difficulty Schedule

| Day       | Difficulty |
| --------- | ---------- |
| Monday    | Easy       |
| Tuesday   | Medium     |
| Wednesday | Hard       |
| Thursday  | Easy       |
| Friday    | Medium     |
| Saturday  | Hard       |
| Sunday    | Expert     |

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

| Variable                  | Description                   | Required |
| ------------------------- | ----------------------------- | -------- |
| `GCP_PROJECT_ID`          | Google Cloud project ID       | Yes      |
| `ENVIRONMENT`             | `development` or `production` | No       |
| `WEBAUTHN_RP_ID`          | Relying party ID for WebAuthn | Yes      |
| `WEBAUTHN_ORIGIN`         | Origin URL for WebAuthn       | Yes      |
| `FIRESTORE_EMULATOR_HOST` | Firestore emulator host       | No       |

## Deployment

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Deploy to Cloud Run
./deploy/deploy.sh
```

## Project Structure

```
sudoku-battle/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI endpoints
│   │   ├── models/        # Pydantic schemas
│   │   ├── services/      # Puzzle generation, Firestore, WebAuthn
│   │   └── main.py        # App entry point
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks (passkey, sudoku, timer)
│   │   └── utils/         # API client
│   └── package.json
├── deploy/
│   └── deploy.sh
└── Dockerfile
```

## License

MIT License - see [LICENSE](LICENSE)
