"""Puzzle API endpoints."""

from datetime import date
from fastapi import APIRouter

from app.models.schemas import PuzzleResponse
from app.services.puzzle_generator import generate_puzzle

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
