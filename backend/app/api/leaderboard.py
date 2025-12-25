"""Leaderboard API endpoints."""

from datetime import date
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.models.schemas import (
    LeaderboardCreateRequest,
    LeaderboardResponse,
    LeaderboardJoinRequest,
    LeaderboardResultsResponse,
    LeaderboardMemberResult,
)
from app.services import firestore
from app.services.puzzle_generator import generate_puzzle

router = APIRouter()


class LeaderboardListResponse(BaseModel):
    """List of user's leaderboards."""
    leaderboards: list[LeaderboardResponse]


class LeaderboardMemberStats(BaseModel):
    """Stats for a single member on the leaderboard."""
    username: str
    games_total: int
    games_completed: int
    games_failed: int
    avg_stars: float
    avg_time_all: Optional[float] = None
    avg_time_last_5: Optional[float] = None
    today_time: Optional[int] = None  # Time for today's puzzle, None if not completed


class LeaderboardFullStatsResponse(BaseModel):
    """Full leaderboard with member stats."""
    leaderboard_id: str
    leaderboard_name: str
    member_count: int
    members: list[LeaderboardMemberStats]


class GlobalLeaderboardResponse(BaseModel):
    """Global top players leaderboard."""
    members: list[LeaderboardMemberStats]


@router.get("/leaderboard/global", response_model=GlobalLeaderboardResponse)
async def get_global_leaderboard():
    """
    Get top 100 players globally by games completed.
    """
    top_players = firestore.get_global_top_players(limit=100)

    member_stats = [
        LeaderboardMemberStats(**player) for player in top_players
    ]

    return GlobalLeaderboardResponse(members=member_stats)


@router.get("/leaderboard/code/{invite_code}", response_model=LeaderboardFullStatsResponse)
async def get_leaderboard_by_code(invite_code: str):
    """
    Get leaderboard info and full member stats by invite code.
    This is the public page endpoint.
    """
    leaderboard = firestore.get_leaderboard_by_invite_code(invite_code.upper())
    if not leaderboard:
        raise HTTPException(status_code=404, detail="Leaderboard not found")

    # Get stats for all members
    member_stats = []
    for member_user_id in leaderboard.get("members", []):
        stats = firestore.get_member_leaderboard_stats(leaderboard["id"], member_user_id)
        member_stats.append(LeaderboardMemberStats(**stats))

    # Sort by avg_stars descending, then avg_time_all ascending
    member_stats.sort(key=lambda m: (-m.avg_stars, m.avg_time_all or float('inf')))

    return LeaderboardFullStatsResponse(
        leaderboard_id=leaderboard["id"],
        leaderboard_name=leaderboard["name"],
        member_count=len(leaderboard.get("members", [])),
        members=member_stats,
    )


@router.get("/leaderboards/{user_id}", response_model=LeaderboardListResponse)
async def get_user_leaderboards(user_id: str):
    """
    Get all leaderboards the user is a member of.
    """
    leaderboards = firestore.get_user_leaderboards(user_id)

    return LeaderboardListResponse(
        leaderboards=[
            LeaderboardResponse(
                id=lb["id"],
                name=lb["name"],
                invite_code=lb["invite_code"],
                member_count=len(lb.get("members", [])),
                created_at=lb["created_at"],
            )
            for lb in leaderboards
        ]
    )


@router.post("/leaderboard", response_model=LeaderboardResponse)
async def create_leaderboard(request: LeaderboardCreateRequest):
    """
    Create a new private leaderboard.

    Returns the leaderboard with invite code.
    """
    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Leaderboard name cannot be empty")

    # Ensure user exists
    firestore.get_or_create_user(request.user_id)

    leaderboard = firestore.create_leaderboard(
        user_id=request.user_id,
        name=request.name.strip(),
    )

    return LeaderboardResponse(
        id=leaderboard["id"],
        name=leaderboard["name"],
        invite_code=leaderboard["invite_code"],
        member_count=len(leaderboard.get("members", [])),
        created_at=leaderboard["created_at"],
    )


@router.post("/leaderboard/join", response_model=LeaderboardResponse)
async def join_leaderboard(request: LeaderboardJoinRequest):
    """
    Join a leaderboard using an invite code.
    """
    # Ensure user exists
    firestore.get_or_create_user(request.user_id)

    leaderboard = firestore.join_leaderboard(
        user_id=request.user_id,
        invite_code=request.invite_code.strip().upper(),
    )

    if not leaderboard:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    return LeaderboardResponse(
        id=leaderboard["id"],
        name=leaderboard["name"],
        invite_code=leaderboard["invite_code"],
        member_count=len(leaderboard.get("members", [])),
        created_at=leaderboard["created_at"],
    )


@router.get("/leaderboard/{leaderboard_id}/results", response_model=LeaderboardResultsResponse)
async def get_leaderboard_results(leaderboard_id: str):
    """
    Get today's results for a leaderboard.

    Results are sorted by completion time.
    """
    # Get leaderboard info
    leaderboard = firestore.get_leaderboard(leaderboard_id)
    if not leaderboard:
        raise HTTPException(status_code=404, detail="Leaderboard not found")

    # Get today's puzzle info
    today = date.today()
    puzzle_data = generate_puzzle(today)

    # Get results
    results = firestore.get_leaderboard_results(leaderboard_id, today)

    # Build response with ranks
    member_results = []
    for i, result in enumerate(results):
        member_results.append(
            LeaderboardMemberResult(
                username=result["username"],
                time_seconds=result["time_seconds"],
                completed_at=result.get("completed_at"),
                rank=i + 1,
            )
        )

    # Add members who haven't completed yet
    completed_user_ids = {r["user_id"] for r in results}
    for member_user_id in leaderboard.get("members", []):
        if member_user_id not in completed_user_ids:
            user = firestore.get_or_create_user(member_user_id)
            username = user.get("username") or f"Player-{member_user_id[:6]}"
            member_results.append(
                LeaderboardMemberResult(
                    username=username,
                    time_seconds=None,
                    completed_at=None,
                    rank=None,
                )
            )

    return LeaderboardResultsResponse(
        leaderboard_id=leaderboard_id,
        leaderboard_name=leaderboard["name"],
        date=today.isoformat(),
        difficulty=puzzle_data["difficulty"],
        results=member_results,
    )
