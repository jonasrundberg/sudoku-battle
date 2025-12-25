/**
 * API client for backend communication.
 */

const API_BASE = '/api'

/**
 * Make an API request with error handling.
 */
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  // Handle empty responses
  const text = await response.text()
  if (!text) return null
  return JSON.parse(text)
}

// ============ Puzzle ============

export async function getTodayPuzzle() {
  return apiRequest('/puzzle/today')
}

export async function getTodayStats() {
  return apiRequest('/puzzle/today/stats')
}

export async function getFriendsCompletions(userId) {
  return apiRequest(`/puzzle/today/friends?user_id=${userId}`)
}

// ============ Progress ============

export async function getProgress(userId) {
  return apiRequest(`/progress/${userId}`)
}

export async function saveProgress(userId, board, timeSeconds, isPaused = false, mistakes = 0, moveHistory = []) {
  return apiRequest('/progress', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      board,
      time_seconds: timeSeconds,
      is_paused: isPaused,
      mistakes,
      move_history: moveHistory,
    }),
  })
}

export async function verifySolution(userId, board, timeSeconds) {
  return apiRequest('/verify', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      board,
      time_seconds: timeSeconds,
    }),
  })
}

// ============ Replay ============

export async function getReplay(targetUserId, userId, date = null) {
  let url = `/replay/${targetUserId}`
  const params = []
  if (userId) params.push(`user_id=${userId}`)
  if (date) params.push(`date=${date}`)
  if (params.length > 0) url += `?${params.join('&')}`
  return apiRequest(url)
}

// ============ User ============

export async function getUserStats(userId) {
  return apiRequest(`/user/${userId}/stats`)
}

export async function setUsername(userId, username) {
  return apiRequest('/user/username', {
    method: 'PUT',
    body: JSON.stringify({
      user_id: userId,
      username,
    }),
  })
}

// ============ Leaderboard ============

export async function getUserLeaderboards(userId) {
  return apiRequest(`/leaderboards/${userId}`)
}

export async function createLeaderboard(userId, name) {
  return apiRequest('/leaderboard', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      name,
    }),
  })
}

export async function joinLeaderboard(userId, inviteCode) {
  return apiRequest('/leaderboard/join', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      invite_code: inviteCode,
    }),
  })
}

export async function getLeaderboardResults(leaderboardId) {
  return apiRequest(`/leaderboard/${leaderboardId}/results`)
}

export async function getLeaderboardByCode(inviteCode) {
  return apiRequest(`/leaderboard/code/${inviteCode}`)
}

export async function getGlobalLeaderboard() {
  return apiRequest('/leaderboard/global')
}

// ============ Auth/Passkey ============

export async function startPasskeyRegistration(userId, username) {
  return apiRequest('/auth/register/start', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, username }),
  })
}

export async function finishPasskeyRegistration(userId, credential) {
  return apiRequest('/auth/register/finish', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, credential }),
  })
}

export async function startPasskeyLogin() {
  return apiRequest('/auth/login/start', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function finishPasskeyLogin(credential) {
  return apiRequest('/auth/login/finish', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  })
}

export async function checkPasskeyRegistered(userId) {
  return apiRequest(`/auth/check/${userId}`)
}
