"""Progress and verification API endpoints."""

from datetime import date
from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    ProgressRequest,
    ProgressResponse,
    VerifyRequest,
    VerifyResponse,
)
from app.services import firestore
from app.services.puzzle_generator import verify_solution, generate_puzzle

router = APIRouter()


@router.get("/progress/{passkey}", response_model=ProgressResponse | None)
async def get_progress(passkey: str):
    """
    Get user's progress on today's puzzle.

    Returns None if no progress exists.
    """
    progress = firestore.get_progress(passkey, date.today())

    if not progress:
        return None

    return ProgressResponse(
        date=progress["date"],
        board=progress["board"],
        time_seconds=progress["time_seconds"],
        is_completed=progress.get("is_completed", False),
        is_paused=progress.get("is_paused", False),
    )


@router.post("/progress", response_model=ProgressResponse)
async def save_progress(request: ProgressRequest):
    """
    Save user's progress on today's puzzle.

    Called periodically (auto-save) and when pausing.
    """
    # Validate board dimensions
    if len(request.board) != 9 or any(len(row) != 9 for row in request.board):
        raise HTTPException(status_code=400, detail="Invalid board dimensions")

    # Ensure user exists
    firestore.get_or_create_user(request.passkey)

    progress = firestore.save_progress(
        passkey=request.passkey,
        puzzle_date=date.today(),
        board=request.board,
        time_seconds=request.time_seconds,
        is_paused=request.is_paused,
        is_completed=False,
    )

    return ProgressResponse(
        date=progress["date"],
        board=progress["board"],
        time_seconds=progress["time_seconds"],
        is_completed=progress["is_completed"],
        is_paused=progress["is_paused"],
    )


@router.post("/verify", response_model=VerifyResponse)
async def verify_puzzle(request: VerifyRequest):
    """
    Verify if the user's solution is correct.

    If correct, marks the puzzle as completed and updates stats.
    """
    # Validate board dimensions
    if len(request.board) != 9 or any(len(row) != 9 for row in request.board):
        raise HTTPException(status_code=400, detail="Invalid board dimensions")

    # Check if already completed
    existing_progress = firestore.get_progress(request.passkey, date.today())
    if existing_progress and existing_progress.get("is_completed"):
        return VerifyResponse(
            is_correct=True,
            message="You have already completed today's puzzle!"
        )

    # Verify solution
    today = date.today()
    is_correct = verify_solution(today, request.board)

    if is_correct:
        # Get puzzle difficulty
        puzzle_data = generate_puzzle(today)
        difficulty = puzzle_data["difficulty"]

        # Mark as completed and update stats
        firestore.mark_completed(
            passkey=request.passkey,
            puzzle_date=today,
            time_seconds=request.time_seconds,
            difficulty=difficulty,
        )

        # Record to all leaderboards user is a member of
        firestore.record_completion_to_leaderboards(
            passkey=request.passkey,
            puzzle_date=today,
            time_seconds=request.time_seconds,
            difficulty=difficulty,
        )

        return VerifyResponse(
            is_correct=True,
            message="Congratulations! You completed today's puzzle!"
        )

    return VerifyResponse(
        is_correct=False,
        message="Solution is incorrect. Keep trying!"
    )
