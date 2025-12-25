"""Pydantic models for API request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ============ Move History (for replay) ============

class MoveRecord(BaseModel):
    """A single move in the game, for replay functionality."""
    row: int = Field(..., ge=0, le=8, description="Row index (0-8)")
    col: int = Field(..., ge=0, le=8, description="Column index (0-8)")
    value: int = Field(..., ge=0, le=9, description="Value entered (0 = erase)")
    time_ms: int = Field(..., ge=0, description="Milliseconds since game start")
    is_correct: bool = Field(..., description="Whether this move was correct")


class ReplayMoveRecord(BaseModel):
    """A move record for replay - excludes actual value to prevent cheating."""
    row: int = Field(..., ge=0, le=8, description="Row index (0-8)")
    col: int = Field(..., ge=0, le=8, description="Column index (0-8)")
    time_ms: int = Field(..., ge=0, description="Milliseconds since game start")
    is_correct: bool = Field(..., description="Whether this move was correct")
    is_erase: bool = Field(default=False, description="Whether this was an erase action")


# ============ Puzzle ============

class PuzzleResponse(BaseModel):
    """Response containing today's puzzle."""
    date: str = Field(..., description="Puzzle date in YYYY-MM-DD format")
    puzzle: list[list[int]] = Field(..., description="9x9 puzzle grid (0 = empty)")
    solution: list[list[int]] = Field(..., description="9x9 solution grid")
    difficulty: str = Field(..., description="Difficulty level: easy, medium, hard, expert")
    day_of_week: str = Field(..., description="Day of the week")


# ============ Progress ============

class ProgressRequest(BaseModel):
    """Request to save user progress."""
    passkey: str = Field(..., min_length=1, description="User's unique passkey")
    board: list[list[int]] = Field(..., description="Current board state (0 = empty)")
    time_seconds: int = Field(..., ge=0, description="Time spent in seconds")
    is_paused: bool = Field(default=False, description="Whether the game is paused")
    mistakes: int = Field(default=0, ge=0, le=3, description="Number of mistakes made")
    move_history: list[MoveRecord] = Field(default_factory=list, description="History of all moves for replay")


class ProgressResponse(BaseModel):
    """Response containing user's saved progress."""
    date: str
    board: list[list[int]]
    time_seconds: int
    is_completed: bool
    is_paused: bool
    mistakes: int = 0
    is_failed: bool = False
    move_history: list[MoveRecord] = Field(default_factory=list, description="History of all moves for replay")


class ReplayResponse(BaseModel):
    """Response containing replay data for a friend's completed game."""
    passkey: str
    username: str
    date: str
    difficulty: str
    puzzle: list[list[int]] = Field(..., description="Original puzzle (0 = empty)")
    time_seconds: int
    move_history: list[ReplayMoveRecord] = Field(..., description="Move history without actual values")
    is_completed: bool
    is_failed: bool = False


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
