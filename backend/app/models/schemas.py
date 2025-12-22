"""Pydantic models for API request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ============ Puzzle ============

class PuzzleResponse(BaseModel):
    """Response containing today's puzzle."""
    date: str = Field(..., description="Puzzle date in YYYY-MM-DD format")
    puzzle: list[list[int]] = Field(..., description="9x9 puzzle grid (0 = empty)")
    difficulty: str = Field(..., description="Difficulty level: easy, medium, hard, expert")
    day_of_week: str = Field(..., description="Day of the week")


# ============ Progress ============

class ProgressRequest(BaseModel):
    """Request to save user progress."""
    passkey: str = Field(..., min_length=1, description="User's unique passkey")
    board: list[list[int]] = Field(..., description="Current board state (0 = empty)")
    time_seconds: int = Field(..., ge=0, description="Time spent in seconds")
    is_paused: bool = Field(default=False, description="Whether the game is paused")


class ProgressResponse(BaseModel):
    """Response containing user's saved progress."""
    date: str
    board: list[list[int]]
    time_seconds: int
    is_completed: bool
    is_paused: bool


# ============ Verification ============

class VerifyRequest(BaseModel):
    """Request to verify a completed puzzle."""
    passkey: str = Field(..., min_length=1, description="User's unique passkey")
    board: list[list[int]] = Field(..., description="Completed board to verify")
    time_seconds: int = Field(..., ge=0, description="Completion time in seconds")


class VerifyResponse(BaseModel):
    """Response from puzzle verification."""
    is_correct: bool = Field(..., description="Whether the solution is correct")
    message: str = Field(..., description="Success or error message")


# ============ User ============

class UsernameRequest(BaseModel):
    """Request to set/update username."""
    passkey: str = Field(..., min_length=1, description="User's unique passkey")
    username: str = Field(..., min_length=1, max_length=20, description="Display name")


class BestTimesByDifficulty(BaseModel):
    """Best completion times by difficulty level."""
    easy: Optional[int] = None
    medium: Optional[int] = None
    hard: Optional[int] = None
    expert: Optional[int] = None


class UserStatsResponse(BaseModel):
    """User's personal statistics."""
    username: Optional[str] = None
    total_completed: int = 0
    total_time_seconds: int = 0
    best_times: BestTimesByDifficulty = Field(default_factory=BestTimesByDifficulty)
    current_streak: int = 0
    longest_streak: int = 0


# ============ Leaderboard ============

class LeaderboardCreateRequest(BaseModel):
    """Request to create a new leaderboard."""
    passkey: str = Field(..., min_length=1, description="Creator's passkey")
    name: str = Field(..., min_length=1, max_length=50, description="Leaderboard name")


class LeaderboardResponse(BaseModel):
    """Response with leaderboard info."""
    id: str
    name: str
    invite_code: str
    member_count: int
    created_at: datetime


class LeaderboardJoinRequest(BaseModel):
    """Request to join a leaderboard."""
    passkey: str = Field(..., min_length=1, description="User's passkey")
    invite_code: str = Field(..., min_length=1, description="Invite code to join")


class LeaderboardMemberResult(BaseModel):
    """A member's result on the leaderboard."""
    username: str
    time_seconds: Optional[int] = None
    completed_at: Optional[datetime] = None
    rank: Optional[int] = None


class LeaderboardResultsResponse(BaseModel):
    """Leaderboard results for today."""
    leaderboard_id: str
    leaderboard_name: str
    date: str
    difficulty: str
    results: list[LeaderboardMemberResult]
