"""
Firestore client wrapper for all database operations.

Collections:
- users: User profiles and stats
- progress: User puzzle progress (completed, failed, and in-progress games)
- leaderboards: Private leaderboard definitions
- auth_challenges: Temporary WebAuthn challenges
- credentials: WebAuthn credentials for cross-device sync
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

def get_or_create_user(user_id: str) -> dict:
    """
    Get user by user_id, or create if doesn't exist.

    Returns user document data.
    """
    db = get_firestore_client()
    user_ref = db.collection("users").document(user_id)
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


def update_username(user_id: str, username: str) -> dict:
    """Update user's display name."""
    db = get_firestore_client()
    user_ref = db.collection("users").document(user_id)
    user_ref.update({"username": username})
    return get_or_create_user(user_id)


def get_user_stats(user_id: str) -> dict:
    """Get user's statistics."""
    user = get_or_create_user(user_id)
    return {
        "username": user.get("username"),
        **user.get("stats", {}),
    }


def update_user_stats_on_completion(
    user_id: str,
    time_seconds: int,
    difficulty: str,
    completed_date: date
) -> None:
    """
    Update user stats after completing a puzzle.

    Updates: total_completed, total_time, best_times, streaks
    """
    db = get_firestore_client()
    user_ref = db.collection("users").document(user_id)
    user = get_or_create_user(user_id)
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


def recalculate_user_stats(user_id: str, dry_run: bool = False) -> dict:
    """
    Recalculate user stats from progress history.

    This rebuilds all stats from the progress collection, useful for:
    - Fixing sync issues
    - Account migrations
    - Data recovery

    Args:
        user_id: The user ID to recalculate stats for
        dry_run: If True, print what would be updated but don't save

    Returns:
        The newly calculated stats dict
    """
    from app.services.puzzle_generator import get_difficulty_for_date

    db = get_firestore_client()

    # Get all progress records for this user
    progress_docs = db.collection("progress").where(
        filter=FieldFilter("user_id", "==", user_id)
    ).stream()

    # Collect completed games sorted by date
    completed_games = []
    failed_games = []

    for doc in progress_docs:
        data = doc.to_dict()
        game_date = date.fromisoformat(data.get("date"))

        if data.get("is_completed"):
            # Get difficulty for this date
            difficulty, _ = get_difficulty_for_date(game_date)
            completed_games.append({
                "date": game_date,
                "time_seconds": data.get("time_seconds", 0),
                "difficulty": difficulty,
                "mistakes": data.get("mistakes", 0),
            })
        elif data.get("is_failed"):
            failed_games.append({
                "date": game_date,
            })

    # Sort by date
    completed_games.sort(key=lambda x: x["date"])

    # Calculate stats
    total_completed = len(completed_games)
    total_failed = len(failed_games)
    total_time_seconds = sum(g["time_seconds"] for g in completed_games)

    # Best times by difficulty
    best_times = {}
    for game in completed_games:
        diff = game["difficulty"]
        time = game["time_seconds"]
        if diff not in best_times or time < best_times[diff]:
            best_times[diff] = time

    # Calculate streaks
    current_streak = 0
    longest_streak = 0
    last_completed_date = None

    if completed_games:
        # Process in chronological order
        streak = 1
        prev_date = completed_games[0]["date"]

        for game in completed_games[1:]:
            days_diff = (game["date"] - prev_date).days
            if days_diff == 1:
                streak += 1
            elif days_diff > 1:
                # Streak broken - check if it's the longest
                if streak > longest_streak:
                    longest_streak = streak
                streak = 1
            # days_diff == 0: same day, don't change streak
            prev_date = game["date"]

        # Final streak check
        if streak > longest_streak:
            longest_streak = streak

        # Current streak: count back from most recent
        last_game_date = completed_games[-1]["date"]
        last_completed_date = last_game_date.isoformat()

        # Check if streak is still active (last game was today or yesterday)
        today = date.today()
        days_since_last = (today - last_game_date).days

        if days_since_last <= 1:
            # Count current streak backwards from last game
            current_streak = 1
            for i in range(len(completed_games) - 2, -1, -1):
                prev_game = completed_games[i]
                days_diff = (last_game_date - prev_game["date"]).days
                if days_diff == 1:
                    current_streak += 1
                    last_game_date = prev_game["date"]
                elif days_diff > 1:
                    break
                # days_diff == 0: same day, continue checking
        else:
            current_streak = 0

    new_stats = {
        "total_completed": total_completed,
        "total_failed": total_failed,
        "total_time_seconds": total_time_seconds,
        "best_times": best_times,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "last_completed_date": last_completed_date,
    }

    print(f"User: {user_id}")
    print(f"  Games completed: {total_completed}")
    print(f"  Games failed: {total_failed}")
    print(f"  Total time: {total_time_seconds}s ({total_time_seconds // 60}m)")
    print(f"  Best times: {best_times}")
    print(f"  Current streak: {current_streak}")
    print(f"  Longest streak: {longest_streak}")
    print(f"  Last completed: {last_completed_date}")

    if dry_run:
        print("  [DRY RUN] Would update stats")
    else:
        user_ref = db.collection("users").document(user_id)
        user_ref.update({"stats": new_stats})
        print("  ✅ Stats updated")

    return new_stats


def recalculate_all_user_stats(dry_run: bool = False) -> None:
    """
    Recalculate stats for all users.

    Args:
        dry_run: If True, print what would be updated but don't save
    """
    db = get_firestore_client()

    print("=== Recalculating All User Stats ===\n")

    users = db.collection("users").stream()
    count = 0

    for user_doc in users:
        user_id = user_doc.id
        recalculate_user_stats(user_id, dry_run=dry_run)
        print()
        count += 1

    print(f"=== Done: {count} users processed ===")


def get_today_player_count() -> int:
    """Get the number of unique players who have started today's puzzle."""
    db = get_firestore_client()
    today = date.today().isoformat()

    # Count progress documents for today
    results = db.collection("progress").where(
        filter=FieldFilter("date", "==", today)
    ).get()

    return len(list(results))


def get_friends_completions_today(user_id: str) -> list[dict]:
    """
    Get friends who completed today's puzzle, sorted by shared leaderboard count.

    Friends are defined as users who share at least one leaderboard with this user.
    """
    db = get_firestore_client()
    today = date.today().isoformat()

    # Get all leaderboards this user is on
    leaderboards = db.collection("leaderboards").where(
        filter=FieldFilter("members", "array_contains", user_id)
    ).get()

    # Count how many leaderboards each friend shares with this user
    friend_leaderboard_count: dict[str, int] = {}
    for lb in leaderboards:
        lb_data = lb.to_dict()
        for member in lb_data.get("members", []):
            if member != user_id:
                friend_leaderboard_count[member] = friend_leaderboard_count.get(member, 0) + 1

    if not friend_leaderboard_count:
        return []

    # Get today's completions for all friends
    friends_completions = []
    for friend_user_id, shared_count in friend_leaderboard_count.items():
        progress = get_progress(friend_user_id, date.today())
        if progress and progress.get("is_completed"):
            user = get_or_create_user(friend_user_id)
            friends_completions.append({
                "user_id": friend_user_id,
                "username": user.get("username") or f"Player-{friend_user_id[:6]}",
                "time_seconds": progress.get("time_seconds", 0),
                "shared_leaderboards": shared_count,
            })

    # Sort by shared leaderboard count (desc), then by time (asc)
    friends_completions.sort(key=lambda x: (-x["shared_leaderboards"], x["time_seconds"]))

    return friends_completions


# ============ Progress Operations ============

def flatten_board(board: list[list[int]]) -> list[int]:
    """Flatten 2D board to 1D array for Firestore (doesn't support nested arrays)."""
    return [cell for row in board for cell in row]


def unflatten_board(flat_board: list[int]) -> list[list[int]]:
    """Convert 1D array back to 2D 9x9 board."""
    return [flat_board[i*9:(i+1)*9] for i in range(9)]


def get_progress(user_id: str, puzzle_date: date) -> Optional[dict]:
    """Get user's progress for a specific puzzle date."""
    db = get_firestore_client()
    doc_id = f"{user_id}_{puzzle_date.isoformat()}"
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
    user_id: str,
    puzzle_date: date,
    board: list[list[int]],
    time_seconds: int,
    is_paused: bool = False,
    is_completed: bool = False,
    mistakes: int = 0,
    is_failed: bool = False,
    move_history: list[dict] = None
) -> dict:
    """Save user's progress on a puzzle."""
    db = get_firestore_client()
    doc_id = f"{user_id}_{puzzle_date.isoformat()}"
    progress_ref = db.collection("progress").document(doc_id)

    # Flatten board for Firestore storage (doesn't support nested arrays)
    flat_board = flatten_board(board) if board else []

    data = {
        "user_id": user_id,
        "date": puzzle_date.isoformat(),
        "board": flat_board,
        "time_seconds": time_seconds,
        "is_paused": is_paused,
        "is_completed": is_completed,
        "mistakes": mistakes,
        "is_failed": is_failed,
        "updated_at": datetime.utcnow(),
    }

    # Store move history for replay functionality
    if move_history is not None:
        data["move_history"] = move_history

    if is_completed:
        data["completed_at"] = datetime.utcnow()

    if is_failed:
        data["failed_at"] = datetime.utcnow()

    progress_ref.set(data, merge=True)

    # Return with 2D board for API response
    data["board"] = board
    return data


def mark_completed(
    user_id: str,
    puzzle_date: date,
    time_seconds: int,
    difficulty: str,
    mistakes: int = 0,
    move_history: list[dict] = None
) -> None:
    """Mark a puzzle as completed and update user stats."""
    # Save final progress with move history and mistakes
    save_progress(
        user_id=user_id,
        puzzle_date=puzzle_date,
        board=[],  # Not storing final board
        time_seconds=time_seconds,
        is_paused=False,
        is_completed=True,
        mistakes=mistakes,
        move_history=move_history,
    )

    # Update user stats
    update_user_stats_on_completion(user_id, time_seconds, difficulty, puzzle_date)


def get_replay_data(user_id: str, puzzle_date: date) -> Optional[dict]:
    """
    Get replay data for a user's completed game.

    Returns move history and game metadata for playback.
    """
    progress = get_progress(user_id, puzzle_date)

    if not progress:
        return None

    # Only allow replay of completed or failed games
    if not progress.get("is_completed") and not progress.get("is_failed"):
        return None

    user = get_or_create_user(user_id)

    return {
        "user_id": user_id,
        "username": user.get("username") or f"Player-{user_id[:6]}",
        "date": progress.get("date"),
        "time_seconds": progress.get("time_seconds", 0),
        "move_history": progress.get("move_history", []),
        "is_completed": progress.get("is_completed", False),
        "is_failed": progress.get("is_failed", False),
    }


# ============ Leaderboard Operations ============

def create_leaderboard(user_id: str, name: str) -> dict:
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
        "created_by": user_id,
        "created_at": datetime.utcnow(),
        "members": [user_id],
    }
    leaderboard_ref.set(leaderboard_data)

    return leaderboard_data


def join_leaderboard(user_id: str, invite_code: str) -> Optional[dict]:
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
    if user_id not in leaderboard_data.get("members", []):
        leaderboard_ref.update({
            "members": firestore.ArrayUnion([user_id])
        })
        leaderboard_data["members"].append(user_id)

    return leaderboard_data


def get_user_leaderboards(user_id: str) -> list[dict]:
    """Get all leaderboards a user is a member of."""
    db = get_firestore_client()

    results = db.collection("leaderboards").where(
        filter=FieldFilter("members", "array_contains", user_id)
    ).get()

    return [doc.to_dict() for doc in results]


def get_leaderboard(leaderboard_id: str) -> Optional[dict]:
    """Get a leaderboard by ID."""
    db = get_firestore_client()
    doc = db.collection("leaderboards").document(leaderboard_id).get()

    if doc.exists:
        return doc.to_dict()
    return None


def get_leaderboard_by_invite_code(invite_code: str) -> Optional[dict]:
    """Get a leaderboard by invite code."""
    db = get_firestore_client()

    results = db.collection("leaderboards").where(
        filter=FieldFilter("invite_code", "==", invite_code.upper())
    ).limit(1).get()

    results_list = list(results)
    if not results_list:
        return None

    return results_list[0].to_dict()


def get_member_leaderboard_stats(leaderboard_id: str, user_id: str) -> dict:
    """
    Get comprehensive stats for a member based on their progress records.

    Returns:
        - username
        - games_total (completed + failed)
        - games_completed
        - games_failed
        - avg_stars (3 - avg_mistakes for completed games)
        - avg_time_all (average time for all completed games)
        - avg_time_last_5 (average time for last 5 completed games)
        - today_time (time for today's puzzle if completed)
    """
    db = get_firestore_client()

    # Get user info
    user = get_or_create_user(user_id)
    username = user.get("username") or f"Player-{user_id[:6]}"

    # Get all progress records for this user
    progress_docs = db.collection("progress").where(
        filter=FieldFilter("user_id", "==", user_id)
    ).get()

    progress_list = list(progress_docs)

    # Build stats from progress records
    completed_games = []
    games_failed = 0

    for doc in progress_list:
        data = doc.to_dict()
        if data.get("is_completed"):
            completed_games.append(data)
        elif data.get("is_failed"):
            games_failed += 1

    games_completed = len(completed_games)
    games_total = games_completed + games_failed

    # Sort completed games by date descending
    completed_games.sort(key=lambda x: x.get("date", ""), reverse=True)

    # Calculate avg_stars (based on mistakes in completed games)
    total_stars = 0
    for game in completed_games:
        mistakes = game.get("mistakes", 0)
        stars = max(0, 3 - mistakes)
        total_stars += stars
    avg_stars = total_stars / games_completed if games_completed > 0 else 0

    # Calculate avg times
    times = [g.get("time_seconds") for g in completed_games if g.get("time_seconds")]
    avg_time_all = sum(times) / len(times) if times else None

    last_5_times = times[:5]
    avg_time_last_5 = sum(last_5_times) / len(last_5_times) if last_5_times else None

    # Get today's time and check if failed
    today_str = date.today().isoformat()
    today_time = None
    today_failed = None
    for game in completed_games:
        if game.get("date") == today_str:
            today_time = game.get("time_seconds")
            break

    # Check if today's game was failed
    for doc in progress_list:
        data = doc.to_dict()
        if data.get("date") == today_str and data.get("is_failed"):
            today_failed = True
            break

    return {
        "username": username,
        "games_total": games_total,
        "games_completed": games_completed,
        "games_failed": games_failed,
        "avg_stars": round(avg_stars, 2),
        "avg_time_all": round(avg_time_all, 1) if avg_time_all else None,
        "avg_time_last_5": round(avg_time_last_5, 1) if avg_time_last_5 else None,
        "today_time": today_time,
        "today_failed": today_failed,
    }


def get_global_top_players(limit: int = 100) -> list[dict]:
    """
    Get top players globally by games completed.

    Returns list of player stats sorted by games_completed descending.
    """
    db = get_firestore_client()

    # Get all progress records
    all_progress = db.collection("progress").get()

    # Group progress by user_id
    progress_by_user = {}
    for doc in all_progress:
        data = doc.to_dict()
        uid = data.get("user_id")
        if uid:
            if uid not in progress_by_user:
                progress_by_user[uid] = []
            progress_by_user[uid].append(data)

    # Calculate stats for each player
    player_stats = []
    for user_id, progress_list in progress_by_user.items():
        # Get user info
        user = get_or_create_user(user_id)
        username = user.get("username") or f"Player-{user_id[:6]}"

        # Separate completed and failed games
        completed_games = [p for p in progress_list if p.get("is_completed")]
        games_failed = sum(1 for p in progress_list if p.get("is_failed"))
        games_completed = len(completed_games)
        games_total = games_completed + games_failed

        if games_completed == 0:
            continue  # Skip users with no completions

        # Sort completed games by date descending
        completed_games.sort(key=lambda x: x.get("date", ""), reverse=True)

        # Calculate avg_stars
        total_stars = 0
        for game in completed_games:
            mistakes = game.get("mistakes", 0)
            stars = max(0, 3 - mistakes)
            total_stars += stars
        avg_stars = total_stars / games_completed if games_completed > 0 else 0

        # Calculate avg times
        times = [g.get("time_seconds") for g in completed_games if g.get("time_seconds")]
        avg_time_all = sum(times) / len(times) if times else None

        last_5_times = times[:5]
        avg_time_last_5 = sum(last_5_times) / len(last_5_times) if last_5_times else None

        # Get today's time and check if failed
        today_str = date.today().isoformat()
        today_time = None
        today_failed = None
        for game in completed_games:
            if game.get("date") == today_str:
                today_time = game.get("time_seconds")
                break

        # Check if today's game was failed
        for game in progress_list:
            if game.get("date") == today_str and game.get("is_failed"):
                today_failed = True
                break

        player_stats.append({
            "username": username,
            "games_total": games_total,
            "games_completed": games_completed,
            "games_failed": games_failed,
            "avg_stars": round(avg_stars, 2),
            "avg_time_all": round(avg_time_all, 1) if avg_time_all else None,
            "avg_time_last_5": round(avg_time_last_5, 1) if avg_time_last_5 else None,
            "today_time": today_time,
            "today_failed": today_failed,
        })

    # Sort by games_completed descending
    player_stats.sort(key=lambda x: -x["games_completed"])

    return player_stats[:limit]


def get_leaderboard_results(leaderboard_id: str, puzzle_date: date) -> list[dict]:
    """Get all results for a leaderboard on a specific date (from progress collection)."""
    db = get_firestore_client()

    # Get leaderboard members
    leaderboard = get_leaderboard(leaderboard_id)
    if not leaderboard:
        return []

    members = leaderboard.get("members", [])
    if not members:
        return []

    # Get progress for each member on this date
    results = []
    for user_id in members:
        progress = get_progress(user_id, puzzle_date)
        if progress and progress.get("is_completed"):
            user = get_or_create_user(user_id)
            results.append({
                "user_id": user_id,
                "username": user.get("username") or f"Player-{user_id[:6]}",
                "time_seconds": progress.get("time_seconds"),
                "completed_at": progress.get("completed_at"),
            })

    # Sort by time
    results.sort(key=lambda x: x.get("time_seconds") or float('inf'))

    return results


# ============ WebAuthn/Passkey Operations ============

def store_auth_challenge(
    identifier: str,
    challenge: str,
    challenge_type: str,
) -> None:
    """Store an authentication challenge for verification."""
    db = get_firestore_client()
    doc_ref = db.collection("auth_challenges").document(identifier)
    doc_ref.set({
        "challenge": challenge,
        "type": challenge_type,
        "created_at": datetime.utcnow(),
    })


def get_auth_challenge(identifier: str) -> Optional[dict]:
    """Get a stored authentication challenge."""
    db = get_firestore_client()
    doc = db.collection("auth_challenges").document(identifier).get()
    if doc.exists:
        return doc.to_dict()
    return None


def delete_auth_challenge(identifier: str) -> None:
    """Delete an authentication challenge after use."""
    db = get_firestore_client()
    db.collection("auth_challenges").document(identifier).delete()


def store_user_credential(
    user_id: str,
    credential_id: str,
    public_key: str,
    sign_count: int,
) -> None:
    """Store a WebAuthn credential for a user."""
    db = get_firestore_client()
    doc_ref = db.collection("credentials").document(credential_id)
    doc_ref.set({
        "user_id": user_id,
        "credential_id": credential_id,
        "public_key": public_key,
        "sign_count": sign_count,
        "created_at": datetime.utcnow(),
    })


def get_user_credentials(user_id: str) -> list[dict]:
    """Get all WebAuthn credentials for a user."""
    db = get_firestore_client()
    results = db.collection("credentials").where(
        filter=FieldFilter("user_id", "==", user_id)
    ).get()
    return [doc.to_dict() for doc in results]


def get_credential_by_id(credential_id: str) -> Optional[dict]:
    """Get a credential by its ID."""
    db = get_firestore_client()
    doc = db.collection("credentials").document(credential_id).get()
    if doc.exists:
        return doc.to_dict()
    return None


def update_credential_sign_count(
    user_id: str,
    credential_id: str,
    sign_count: int,
) -> None:
    """Update the sign count for a credential (replay attack prevention)."""
    db = get_firestore_client()
    doc_ref = db.collection("credentials").document(credential_id)
    doc_ref.update({"sign_count": sign_count})
