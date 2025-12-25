"""User API endpoints."""

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    UsernameRequest,
    UserStatsResponse,
    BestTimesByDifficulty,
)
from app.services import firestore

router = APIRouter()


@router.get("/user/{user_id}/stats", response_model=UserStatsResponse)
async def get_user_stats(user_id: str):
    """
    Get user's personal statistics.

    Returns stats like total completed, best times, streaks.
    """
    stats = firestore.get_user_stats(user_id)

    best_times_data = stats.get("best_times", {})

    return UserStatsResponse(
        username=stats.get("username"),
        total_completed=stats.get("total_completed", 0),
        total_time_seconds=stats.get("total_time_seconds", 0),
        best_times=BestTimesByDifficulty(
            easy=best_times_data.get("easy"),
            medium=best_times_data.get("medium"),
            hard=best_times_data.get("hard"),
            expert=best_times_data.get("expert"),
        ),
        current_streak=stats.get("current_streak", 0),
        longest_streak=stats.get("longest_streak", 0),
    )


@router.put("/user/username", response_model=UserStatsResponse)
async def set_username(request: UsernameRequest):
    """
    Set or update user's display name.

    Username is visible on leaderboards.
    """
    # Validate username
    if not request.username.strip():
        raise HTTPException(status_code=400, detail="Username cannot be empty")

    # Sanitize username (basic)
    username = request.username.strip()[:20]

    # Update and return stats
    firestore.update_username(request.user_id, username)

    return await get_user_stats(request.user_id)
