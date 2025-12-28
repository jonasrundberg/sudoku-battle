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


@router.get("/progress/{user_id}", response_model=ProgressResponse | None)
async def get_progress(user_id: str):
    """
    Get user's progress on today's puzzle.

    Returns None if no progress exists.
    """
    progress = firestore.get_progress(user_id, date.today())

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
    firestore.get_or_create_user(request.user_id)

    # Check if failed (3 mistakes)
    is_failed = request.mistakes >= 3

    # Convert move_history to list of dicts for Firestore
    move_history = [m.model_dump() for m in request.move_history] if request.move_history else []

    progress = firestore.save_progress(
        user_id=request.user_id,
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


@router.get("/replay/{target_user_id}")
async def get_replay(
    target_user_id: str,
    user_id: str | None = None,
    replay_date: str | None = Query(None, alias="date")
):
    """
    Get replay data for a completed game.

    - If user_id is provided, verifies the user shares a leaderboard with target
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

    # If user_id provided, verify friendship (optional - allows public replay links)
    if user_id:
        friends = firestore.get_friends_completions_today(user_id)
        friend_user_ids = [f["user_id"] for f in friends]
        # Only check friendship for today's puzzles
        if puzzle_date == date.today() and target_user_id not in friend_user_ids:
            # Allow if it's the user's own replay
            if target_user_id != user_id:
                raise HTTPException(
                    status_code=403,
                    detail="You can only watch replays of friends who share a leaderboard with you"
                )

    # Get replay data
    replay_data = firestore.get_replay_data(target_user_id, puzzle_date)

    if not replay_data:
        raise HTTPException(status_code=404, detail="No replay data found")

    # Get puzzle for the replay date
    puzzle_data = generate_puzzle(puzzle_date)

    # Transform move history to strip out actual values (prevent cheating)
    safe_move_history = [
        {
            "row": move.get("row"),
            "col": move.get("col"),
            "time_ms": move.get("time_ms"),
            "is_correct": move.get("is_correct"),
            "is_erase": move.get("value", 0) == 0,
        }
        for move in replay_data.get("move_history", [])
    ]

    return ReplayResponse(
        user_id=replay_data["user_id"],
        username=replay_data["username"],
        date=replay_data["date"],
        difficulty=puzzle_data["difficulty"],
        puzzle=puzzle_data["puzzle"],
        time_seconds=replay_data["time_seconds"],
        move_history=safe_move_history,
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

    # Get existing progress to determine puzzle date
    # This handles the midnight edge case: if user started puzzle before midnight
    # but submits after midnight, we verify against the puzzle they actually played
    existing_progress = firestore.get_progress(request.user_id, date.today())

    # Determine puzzle date from progress, falling back to today
    if existing_progress:
        puzzle_date = date.fromisoformat(existing_progress["date"])
    else:
        puzzle_date = date.today()

    # Check if already completed
    if existing_progress and existing_progress.get("is_completed"):
        return VerifyResponse(
            is_correct=True,
            message="You have already completed today's puzzle!"
        )

    # Verify solution against the puzzle date from progress
    is_correct = verify_solution(puzzle_date, request.board)

    if is_correct:
        # Get puzzle difficulty for the puzzle date
        puzzle_data = generate_puzzle(puzzle_date)
        difficulty = puzzle_data["difficulty"]

        # Mark as completed and update stats (preserve move_history and mistakes)
        move_history_dicts = [m.model_dump() for m in request.move_history] if request.move_history else None
        firestore.mark_completed(
            user_id=request.user_id,
            puzzle_date=puzzle_date,
            time_seconds=request.time_seconds,
            difficulty=difficulty,
            mistakes=request.mistakes,
            move_history=move_history_dicts,
        )

        return VerifyResponse(
            is_correct=True,
            message="Congratulations! You completed today's puzzle!"
        )

    return VerifyResponse(
        is_correct=False,
        message="Solution is incorrect. Keep trying!"
    )
