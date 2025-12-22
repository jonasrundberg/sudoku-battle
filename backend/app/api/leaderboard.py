"""Leaderboard API endpoints."""

from datetime import date
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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


@router.get("/leaderboards/{passkey}", response_model=LeaderboardListResponse)
async def get_user_leaderboards(passkey: str):
    """
    Get all leaderboards the user is a member of.
    """
    leaderboards = firestore.get_user_leaderboards(passkey)

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
    firestore.get_or_create_user(request.passkey)

    leaderboard = firestore.create_leaderboard(
        passkey=request.passkey,
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
    firestore.get_or_create_user(request.passkey)

    leaderboard = firestore.join_leaderboard(
        passkey=request.passkey,
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
    completed_passkeys = {r["passkey"] for r in results}
    for member_passkey in leaderboard.get("members", []):
        if member_passkey not in completed_passkeys:
            user = firestore.get_or_create_user(member_passkey)
            username = user.get("username") or f"Player-{member_passkey[:6]}"
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
