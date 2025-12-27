"""
Deterministic sudoku puzzle generator.

Uses py-sudoku library with date-based seeding to ensure all users
get the same puzzle on the same day.

Difficulty is randomly determined using the same date seed as the puzzle,
ensuring everyone gets the same difficulty on the same day.
"""

import random
from datetime import date
from sudoku import Sudoku


# Difficulty settings: (difficulty_name, empty_cell_percentage)
DIFFICULTIES = [
    ("easy", 0.4),
    ("medium", 0.5),
    ("hard", 0.6),
    ("expert", 0.7),
]

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def date_to_seed(puzzle_date: date) -> int:
    """
    Convert a date to a deterministic seed.
    Same date always produces the same seed.
    """
    # Use ordinal (days since year 1) as seed base
    # Multiply by a prime to spread out values
    return puzzle_date.toordinal() * 31337


def get_difficulty_for_date(puzzle_date: date) -> tuple[str, float]:
    """
    Get the difficulty level and empty cell percentage for a given date.
    Uses date-based random selection so all users get the same difficulty.

    Returns:
        Tuple of (difficulty_name, empty_percentage)
    """
    # Use the date seed to randomly select difficulty
    seed = date_to_seed(puzzle_date)
    rng = random.Random(seed)
    return rng.choice(DIFFICULTIES)


def get_day_of_week(puzzle_date: date) -> str:
    """Get the day of week name for a date."""
    return DAY_NAMES[puzzle_date.weekday()]


def generate_puzzle(puzzle_date: date) -> dict:
    """
    Generate a sudoku puzzle for the given date.

    The puzzle is deterministic - same date always produces the same puzzle.
    Difficulty is randomly selected using the date as seed, so all users
    get the same difficulty on the same day.

    Args:
        puzzle_date: The date to generate a puzzle for

    Returns:
        Dictionary containing:
        - puzzle: 9x9 grid with 0 for empty cells
        - solution: 9x9 grid with the complete solution
        - difficulty: Difficulty level name
        - day_of_week: Name of the day
        - date: ISO format date string
    """
    seed = date_to_seed(puzzle_date)
    difficulty_name, empty_percentage = get_difficulty_for_date(puzzle_date)
    day_of_week = get_day_of_week(puzzle_date)

    # Generate puzzle using py-sudoku
    # Sudoku(3) creates a standard 9x9 grid (3x3 sub-grids)
    sudoku = Sudoku(3, seed=seed)

    # First get the solved puzzle
    solved = sudoku.solve()

    # Then create a puzzle with empty cells based on difficulty
    # We need to re-seed to get consistent empty cell removal
    puzzle_sudoku = Sudoku(3, seed=seed).difficulty(empty_percentage)

    # Convert to list format (py-sudoku uses None for empty cells)
    puzzle_board = [
        [cell if cell is not None else 0 for cell in row]
        for row in puzzle_sudoku.board
    ]

    solution_board = [
        [cell if cell is not None else 0 for cell in row]
        for row in solved.board
    ]

    return {
        "puzzle": puzzle_board,
        "solution": solution_board,
        "difficulty": difficulty_name,
        "day_of_week": day_of_week,
        "date": puzzle_date.isoformat(),
    }


def is_valid_complete_sudoku(board: list[list[int]]) -> bool:
    """
    Check if a board is a complete, valid sudoku solution.

    Validates that:
    - All cells contain values 1-9
    - Each row has unique values
    - Each column has unique values
    - Each 3x3 box has unique values

    Args:
        board: 9x9 grid to validate

    Returns:
        True if the board is a valid complete sudoku
    """
    # Check all cells are filled with 1-9
    for row in board:
        if not all(1 <= cell <= 9 for cell in row):
            return False

    # Check each row has unique values
    for row in board:
        if len(set(row)) != 9:
            return False

    # Check each column has unique values
    for col in range(9):
        column = [board[row][col] for row in range(9)]
        if len(set(column)) != 9:
            return False

    # Check each 3x3 box has unique values
    for box_row in range(3):
        for box_col in range(3):
            box = [
                board[box_row * 3 + r][box_col * 3 + c]
                for r in range(3)
                for c in range(3)
            ]
            if len(set(box)) != 9:
                return False

    return True


def verify_solution(puzzle_date: date, submitted_board: list[list[int]]) -> bool:
    """
    Verify if a submitted solution is valid for the puzzle.

    This accepts ANY valid sudoku solution, not just the one generated
    by py-sudoku. This is important because some puzzles may have
    multiple valid solutions.

    Args:
        puzzle_date: The date of the puzzle
        submitted_board: User's submitted 9x9 grid

    Returns:
        True if the solution is valid, False otherwise
    """
    puzzle = generate_puzzle(puzzle_date)["puzzle"]

    # 1. Check that user didn't change any of the original given numbers
    for row in range(9):
        for col in range(9):
            if puzzle[row][col] != 0:  # This was a given number
                if submitted_board[row][col] != puzzle[row][col]:
                    return False

    # 2. Check that the submitted board is a valid complete sudoku
    return is_valid_complete_sudoku(submitted_board)


def get_today_puzzle() -> dict:
    """Generate puzzle for today's date."""
    return generate_puzzle(date.today())


if __name__ == "__main__":
    # Test: Print today's puzzle
    from datetime import datetime

    today = date.today()
    puzzle_data = generate_puzzle(today)

    print(f"Date: {puzzle_data['date']} ({puzzle_data['day_of_week']})")
    print(f"Difficulty: {puzzle_data['difficulty']}")
    print("\nPuzzle:")
    for row in puzzle_data['puzzle']:
        print([cell if cell != 0 else '.' for cell in row])

    print("\nSolution:")
    for row in puzzle_data['solution']:
        print(row)

    # Verify consistency - generate again and check it's the same
    puzzle_data2 = generate_puzzle(today)
    assert puzzle_data['puzzle'] == puzzle_data2['puzzle'], "Puzzle generation not deterministic!"
    print("\n✓ Puzzle generation is deterministic")
