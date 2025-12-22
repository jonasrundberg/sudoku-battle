# Sudoku Battle 🎮

A daily sudoku challenge website where all users get the same puzzle each day. Features zero-friction passkey authentication and private leaderboards.

## Features

- 🧩 **One puzzle per day** - Same puzzle for everyone, changes at midnight
- 📊 **Rotating difficulty** - Mon/Thu: Easy, Tue/Fri: Medium, Wed/Sat: Hard, Sun: Expert
- 🔐 **Zero-friction auth** - Automatic passkey generation, no signup required
- ⏱️ **Timer with pause** - Track your solving time
- 🏆 **Private leaderboards** - Create/join leaderboards with invite codes (like Advent of Code)
- 📱 **Mobile-friendly** - Fully responsive design
- 💾 **Auto-save** - Progress saved automatically

## Tech Stack

- **Backend**: Python, FastAPI, Google Cloud Firestore
- **Frontend**: React, Vite, Tailwind CSS
- **Hosting**: Google Cloud Run
- **Puzzle Generation**: py-sudoku with deterministic seeding

## Project Structure

```
sudoku-battle/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI route handlers
│   │   ├── models/        # Pydantic schemas
│   │   ├── services/      # Business logic (puzzle gen, Firestore)
│   │   ├── config.py      # App configuration
│   │   └── main.py        # FastAPI app entry point
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # API client, validation
│   ├── package.json
│   └── vite.config.js
├── deploy/
│   └── deploy.sh          # Cloud Run deployment script
├── Dockerfile
└── README.md
```

## Local Development

### Prerequisites

- Python 3.12+
- Node.js 20+
- Google Cloud SDK (for Firestore emulator, optional)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your settings

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server (proxies API to backend)
npm run dev
```

The frontend will be available at http://localhost:5173 and will proxy API requests to the backend at http://localhost:8000.

### Running with Firestore Emulator (Optional)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start emulator
firebase emulators:start --only firestore

# Set environment variable
export FIRESTORE_EMULATOR_HOST=localhost:8080
```

## Deployment

### Prerequisites

1. Google Cloud account with billing enabled
2. gcloud CLI installed and authenticated
3. Enable required APIs:

```bash
gcloud services enable run.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

4. Create Firestore database:
   - Go to [Firestore Console](https://console.cloud.google.com/firestore)
   - Create database in **Native mode**
   - Choose a region

### Deploy to Cloud Run

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Run deployment script
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

Or deploy manually:

```bash
gcloud run deploy sudoku-battle \
    --source . \
    --region europe-west1 \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars="GCP_PROJECT_ID=your-project-id,ENVIRONMENT=production"
```

## API Endpoints

| Method | Endpoint                        | Description             |
| ------ | ------------------------------- | ----------------------- |
| GET    | `/api/puzzle/today`             | Get today's puzzle      |
| GET    | `/api/progress/{passkey}`       | Get saved progress      |
| POST   | `/api/progress`                 | Save progress           |
| POST   | `/api/verify`                   | Verify solution         |
| GET    | `/api/user/{passkey}/stats`     | Get user stats          |
| PUT    | `/api/user/username`            | Set username            |
| GET    | `/api/leaderboards/{passkey}`   | Get user's leaderboards |
| POST   | `/api/leaderboard`              | Create leaderboard      |
| POST   | `/api/leaderboard/join`         | Join leaderboard        |
| GET    | `/api/leaderboard/{id}/results` | Get leaderboard results |

## Environment Variables

| Variable                  | Description                   | Default       |
| ------------------------- | ----------------------------- | ------------- |
| `GCP_PROJECT_ID`          | Google Cloud project ID       | -             |
| `ENVIRONMENT`             | `development` or `production` | `development` |
| `CORS_ORIGINS`            | Allowed origins (production)  | -             |
| `FIRESTORE_EMULATOR_HOST` | Firestore emulator host       | -             |

## License

MIT License - see [LICENSE](LICENSE) file.
