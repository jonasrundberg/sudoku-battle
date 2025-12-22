"""
Firestore client wrapper for all database operations.

Collections:
- users: User profiles and stats
- progress: User puzzle progress (in-progress games)
- leaderboards: Private leaderboard definitions
- leaderboard_results: User results within leaderboards
"""

import os
from datetime import datetime, date
from typing import Optional
from functools import lru_cache
import secrets
import string

from google.cloud import firestore
from google.cloud.firestore_v1 import FieldFilter

from app.config import get_settings


@lru_cache()
def get_firestore_client() -> firestore.Client:
    """
    Get a cached Firestore client.
    Uses Application Default Credentials in production.
    """
    settings = get_settings()

    # Check for emulator
    if settings.firestore_emulator_host:
        os.environ["FIRESTORE_EMULATOR_HOST"] = settings.firestore_emulator_host

    if settings.gcp_project_id:
        return firestore.Client(project=settings.gcp_project_id)

    return firestore.Client()


def generate_invite_code(length: int = 8) -> str:
    """Generate a random invite code for leaderboards."""
    alphabet = string.ascii_uppercase + string.digits
    # Remove confusing characters
    alphabet = alphabet.replace("O", "").replace("0", "").replace("I", "").replace("1", "")
    return "".join(secrets.choice(alphabet) for _ in range(length))


# ============ User Operations ============

def get_or_create_user(passkey: str) -> dict:
    """
    Get user by passkey, or create if doesn't exist.

    Returns user document data.
    """
    db = get_firestore_client()
    user_ref = db.collection("users").document(passkey)
    user_doc = user_ref.get()

    if user_doc.exists:
        return user_doc.to_dict()

    # Create new user
    new_user = {
        "username": None,
        "created_at": datetime.utcnow(),
        "stats": {
            "total_completed": 0,
            "total_time_seconds": 0,
            "best_times": {
                "easy": None,
                "medium": None,
                "hard": None,
                "expert": None,
            },
            "current_streak": 0,
            "longest_streak": 0,
            "last_completed_date": None,
        },
    }
    user_ref.set(new_user)
    return new_user


def update_username(passkey: str, username: str) -> dict:
    """Update user's display name."""
    db = get_firestore_client()
    user_ref = db.collection("users").document(passkey)
    user_ref.update({"username": username})
    return get_or_create_user(passkey)


def get_user_stats(passkey: str) -> dict:
    """Get user's statistics."""
    user = get_or_create_user(passkey)
    return {
        "username": user.get("username"),
        **user.get("stats", {}),
    }


def update_user_stats_on_completion(
    passkey: str,
    time_seconds: int,
    difficulty: str,
    completed_date: date
) -> None:
    """
    Update user stats after completing a puzzle.

    Updates: total_completed, total_time, best_times, streaks
    """
    db = get_firestore_client()
    user_ref = db.collection("users").document(passkey)
    user = get_or_create_user(passkey)
    stats = user.get("stats", {})

    # Update totals
    stats["total_completed"] = stats.get("total_completed", 0) + 1
    stats["total_time_seconds"] = stats.get("total_time_seconds", 0) + time_seconds

    # Update best time for difficulty
    best_times = stats.get("best_times", {})
    current_best = best_times.get(difficulty)
    if current_best is None or time_seconds < current_best:
        best_times[difficulty] = time_seconds
    stats["best_times"] = best_times

    # Update streaks
    last_completed = stats.get("last_completed_date")
    if last_completed:
        # Parse last completed date
        if isinstance(last_completed, str):
            last_date = date.fromisoformat(last_completed)
        else:
            last_date = last_completed.date() if hasattr(last_completed, "date") else last_completed

        days_diff = (completed_date - last_date).days

        if days_diff == 1:
            # Consecutive day - extend streak
            stats["current_streak"] = stats.get("current_streak", 0) + 1
        elif days_diff > 1:
            # Streak broken
            stats["current_streak"] = 1
        # If days_diff == 0, same day - don't change streak
    else:
        stats["current_streak"] = 1

    # Update longest streak
    if stats["current_streak"] > stats.get("longest_streak", 0):
        stats["longest_streak"] = stats["current_streak"]

    stats["last_completed_date"] = completed_date.isoformat()

    user_ref.update({"stats": stats})


# ============ Progress Operations ============

def flatten_board(board: list[list[int]]) -> list[int]:
    """Flatten 2D board to 1D array for Firestore (doesn't support nested arrays)."""
    return [cell for row in board for cell in row]


def unflatten_board(flat_board: list[int]) -> list[list[int]]:
    """Convert 1D array back to 2D 9x9 board."""
    return [flat_board[i*9:(i+1)*9] for i in range(9)]


def get_progress(passkey: str, puzzle_date: date) -> Optional[dict]:
    """Get user's progress for a specific puzzle date."""
    db = get_firestore_client()
    doc_id = f"{passkey}_{puzzle_date.isoformat()}"
    progress_ref = db.collection("progress").document(doc_id)
    progress_doc = progress_ref.get()

    if progress_doc.exists:
        data = progress_doc.to_dict()
        # Unflatten board from 1D to 2D
        if "board" in data and isinstance(data["board"], list) and len(data["board"]) == 81:
            data["board"] = unflatten_board(data["board"])
        return data
    return None


def save_progress(
    passkey: str,
    puzzle_date: date,
    board: list[list[int]],
    time_seconds: int,
    is_paused: bool = False,
    is_completed: bool = False,
    mistakes: int = 0,
    is_failed: bool = False
) -> dict:
    """Save user's progress on a puzzle."""
    db = get_firestore_client()
    doc_id = f"{passkey}_{puzzle_date.isoformat()}"
    progress_ref = db.collection("progress").document(doc_id)

    # Flatten board for Firestore storage (doesn't support nested arrays)
    flat_board = flatten_board(board) if board else []

    data = {
        "passkey": passkey,
        "date": puzzle_date.isoformat(),
        "board": flat_board,
        "time_seconds": time_seconds,
        "is_paused": is_paused,
        "is_completed": is_completed,
        "mistakes": mistakes,
        "is_failed": is_failed,
        "updated_at": datetime.utcnow(),
    }

    if is_completed:
        data["completed_at"] = datetime.utcnow()

    if is_failed:
        data["failed_at"] = datetime.utcnow()

    progress_ref.set(data, merge=True)

    # Return with 2D board for API response
    data["board"] = board
    return data


def mark_completed(
    passkey: str,
    puzzle_date: date,
    time_seconds: int,
    difficulty: str
) -> None:
    """Mark a puzzle as completed and update user stats."""
    # Save final progress
    save_progress(
        passkey=passkey,
        puzzle_date=puzzle_date,
        board=[],  # Not storing final board
        time_seconds=time_seconds,
        is_paused=False,
        is_completed=True,
    )

    # Update user stats
    update_user_stats_on_completion(passkey, time_seconds, difficulty, puzzle_date)


# ============ Leaderboard Operations ============

def create_leaderboard(passkey: str, name: str) -> dict:
    """Create a new private leaderboard."""
    db = get_firestore_client()

    # Generate unique invite code
    invite_code = generate_invite_code()

    # Ensure invite code is unique
    while True:
        existing = db.collection("leaderboards").where(
            filter=FieldFilter("invite_code", "==", invite_code)
        ).limit(1).get()
        if not list(existing):
            break
        invite_code = generate_invite_code()

    leaderboard_ref = db.collection("leaderboards").document()
    leaderboard_data = {
        "id": leaderboard_ref.id,
        "name": name,
        "invite_code": invite_code,
        "created_by": passkey,
        "created_at": datetime.utcnow(),
        "members": [passkey],
    }
    leaderboard_ref.set(leaderboard_data)

    return leaderboard_data


def join_leaderboard(passkey: str, invite_code: str) -> Optional[dict]:
    """Join a leaderboard using an invite code."""
    db = get_firestore_client()

    # Find leaderboard by invite code
    results = db.collection("leaderboards").where(
        filter=FieldFilter("invite_code", "==", invite_code.upper())
    ).limit(1).get()

    results_list = list(results)
    if not results_list:
        return None

    leaderboard_ref = results_list[0].reference
    leaderboard_data = results_list[0].to_dict()

    # Add member if not already present
    if passkey not in leaderboard_data.get("members", []):
        leaderboard_ref.update({
            "members": firestore.ArrayUnion([passkey])
        })
        leaderboard_data["members"].append(passkey)

    return leaderboard_data


def get_user_leaderboards(passkey: str) -> list[dict]:
    """Get all leaderboards a user is a member of."""
    db = get_firestore_client()

    results = db.collection("leaderboards").where(
        filter=FieldFilter("members", "array_contains", passkey)
    ).get()

    return [doc.to_dict() for doc in results]


def get_leaderboard(leaderboard_id: str) -> Optional[dict]:
    """Get a leaderboard by ID."""
    db = get_firestore_client()
    doc = db.collection("leaderboards").document(leaderboard_id).get()

    if doc.exists:
        return doc.to_dict()
    return None


def save_leaderboard_result(
    leaderboard_id: str,
    passkey: str,
    puzzle_date: date,
    time_seconds: int,
    difficulty: str
) -> None:
    """Save a user's result to a leaderboard."""
    db = get_firestore_client()

    # Get username
    user = get_or_create_user(passkey)
    username = user.get("username") or f"Player-{passkey[:6]}"

    doc_id = f"{leaderboard_id}_{puzzle_date.isoformat()}_{passkey}"
    result_ref = db.collection("leaderboard_results").document(doc_id)

    result_ref.set({
        "leaderboard_id": leaderboard_id,
        "date": puzzle_date.isoformat(),
        "passkey": passkey,
        "username": username,
        "time_seconds": time_seconds,
        "difficulty": difficulty,
        "completed_at": datetime.utcnow(),
    })


def get_leaderboard_results(leaderboard_id: str, puzzle_date: date) -> list[dict]:
    """Get all results for a leaderboard on a specific date."""
    db = get_firestore_client()

    results = db.collection("leaderboard_results").where(
        filter=FieldFilter("leaderboard_id", "==", leaderboard_id)
    ).where(
        filter=FieldFilter("date", "==", puzzle_date.isoformat())
    ).order_by("time_seconds").get()

    return [doc.to_dict() for doc in results]


def record_completion_to_leaderboards(
    passkey: str,
    puzzle_date: date,
    time_seconds: int,
    difficulty: str
) -> None:
    """Record a completion to all leaderboards the user is a member of."""
    leaderboards = get_user_leaderboards(passkey)

    for lb in leaderboards:
        save_leaderboard_result(
            leaderboard_id=lb["id"],
            passkey=passkey,
            puzzle_date=puzzle_date,
            time_seconds=time_seconds,
            difficulty=difficulty,
        )
