"""Progress and verification API endpoints."""

from datetime import date
from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    ProgressRequest,
    ProgressResponse,
    ReplayResponse,
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
        mistakes=progress.get("mistakes", 0),
        is_failed=progress.get("is_failed", False),
        move_history=progress.get("move_history", []),
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

    # Check if failed (3 mistakes)
    is_failed = request.mistakes >= 3

    # Convert move_history to list of dicts for Firestore
    move_history = [m.model_dump() for m in request.move_history] if request.move_history else []

    progress = firestore.save_progress(
        passkey=request.passkey,
        puzzle_date=date.today(),
        board=request.board,
        time_seconds=request.time_seconds,
        is_paused=request.is_paused,
        is_completed=False,
        mistakes=request.mistakes,
        is_failed=is_failed,
        move_history=move_history,
    )

    return ProgressResponse(
        date=progress["date"],
        board=progress["board"],
        time_seconds=progress["time_seconds"],
        is_completed=progress["is_completed"],
        is_paused=progress["is_paused"],
        mistakes=progress.get("mistakes", 0),
        is_failed=progress.get("is_failed", False),
        move_history=progress.get("move_history", []),
    )


@router.get("/replay/{target_passkey}")
async def get_replay(
    target_passkey: str,
    passkey: str | None = None,
    replay_date: str | None = Query(None, alias="date")
):
    """
    Get replay data for a completed game.

    - If passkey is provided, verifies the user shares a leaderboard with target
    - If date is provided, gets replay for that specific date
    - Replays are only available for completed or failed games
    """
    # Determine which date to use
    if replay_date:
        try:
            puzzle_date = date.fromisoformat(replay_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        puzzle_date = date.today()

    # If passkey provided, verify friendship (optional - allows public replay links)
    if passkey:
        friends = firestore.get_friends_completions_today(passkey)
        friend_passkeys = [f["passkey"] for f in friends]
        # Only check friendship for today's puzzles
        if puzzle_date == date.today() and target_passkey not in friend_passkeys:
            # Allow if it's the user's own replay
            if target_passkey != passkey:
                raise HTTPException(
                    status_code=403,
                    detail="You can only watch replays of friends who share a leaderboard with you"
                )

    # Get replay data
    replay_data = firestore.get_replay_data(target_passkey, puzzle_date)

    if not replay_data:
        raise HTTPException(status_code=404, detail="No replay data found")

    # Get puzzle for the replay date
    puzzle_data = generate_puzzle(puzzle_date)

    return ReplayResponse(
        passkey=replay_data["passkey"],
        username=replay_data["username"],
        date=replay_data["date"],
        difficulty=puzzle_data["difficulty"],
        puzzle=puzzle_data["puzzle"],
        time_seconds=replay_data["time_seconds"],
        move_history=replay_data["move_history"],
        is_completed=replay_data["is_completed"],
        is_failed=replay_data.get("is_failed", False),
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
