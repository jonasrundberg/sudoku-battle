"""Puzzle API endpoints."""

from datetime import date
from fastapi import APIRouter

from app.models.schemas import PuzzleResponse
from app.services.puzzle_generator import generate_puzzle
from app.services import firestore

router = APIRouter()


@router.get("/puzzle/today", response_model=PuzzleResponse)
async def get_today_puzzle():
    """
    Get today's sudoku puzzle.

    The puzzle is the same for all users on the same day.
    Difficulty rotates by day of week.
    """
    puzzle_data = generate_puzzle(date.today())

    return PuzzleResponse(
        date=puzzle_data["date"],
        puzzle=puzzle_data["puzzle"],
        solution=puzzle_data["solution"],
        difficulty=puzzle_data["difficulty"],
        day_of_week=puzzle_data["day_of_week"],
    )


@router.get("/puzzle/today/stats")
async def get_today_stats():
    """
    Get stats for today's puzzle without revealing the puzzle itself.
    Used for the start screen.
    """
    puzzle_data = generate_puzzle(date.today())
    player_count = firestore.get_today_player_count()

    return {
        "date": puzzle_data["date"],
        "difficulty": puzzle_data["difficulty"],
        "player_count": player_count,
    }


@router.get("/puzzle/today/friends")
async def get_friends_completions(user_id: str):
    """
    Get friends who completed today's puzzle.
    Friends are users who share at least one leaderboard with the user.
    Sorted by number of shared leaderboards (most shared first).
    """
    friends = firestore.get_friends_completions_today(user_id)
    return {"friends": friends}
