"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.config import get_settings
from app.api import puzzle, progress, user, leaderboard

settings = get_settings()

app = FastAPI(
    title="Sudoku Battle API",
    description="Daily sudoku challenge with leaderboards",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(puzzle.router, prefix="/api", tags=["puzzle"])
app.include_router(progress.router, prefix="/api", tags=["progress"])
app.include_router(user.router, prefix="/api", tags=["user"])
app.include_router(leaderboard.router, prefix="/api", tags=["leaderboard"])


# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint for Cloud Run."""
    return {"status": "healthy", "environment": settings.environment}


# Serve static files in production
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA for all non-API routes."""
        # Don't serve index.html for API routes
        if full_path.startswith("api/"):
            return {"error": "Not found"}

        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"error": "Frontend not built"}
