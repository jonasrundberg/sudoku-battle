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

export async function getFriendsCompletions(passkey) {
  return apiRequest(`/puzzle/today/friends?passkey=${passkey}`)
}

// ============ Progress ============

export async function getProgress(passkey) {
  return apiRequest(`/progress/${passkey}`)
}

export async function saveProgress(passkey, board, timeSeconds, isPaused = false, mistakes = 0, moveHistory = []) {
  return apiRequest('/progress', {
    method: 'POST',
    body: JSON.stringify({
      passkey,
      board,
      time_seconds: timeSeconds,
      is_paused: isPaused,
      mistakes,
      move_history: moveHistory,
    }),
  })
}

export async function verifySolution(passkey, board, timeSeconds) {
  return apiRequest('/verify', {
    method: 'POST',
    body: JSON.stringify({
      passkey,
      board,
      time_seconds: timeSeconds,
    }),
  })
}

// ============ Replay ============

export async function getReplay(targetPasskey, passkey, date = null) {
  let url = `/replay/${targetPasskey}`
  const params = []
  if (passkey) params.push(`passkey=${passkey}`)
  if (date) params.push(`date=${date}`)
  if (params.length > 0) url += `?${params.join('&')}`
  return apiRequest(url)
}

// ============ User ============

export async function getUserStats(passkey) {
  return apiRequest(`/user/${passkey}/stats`)
}

export async function setUsername(passkey, username) {
  return apiRequest('/user/username', {
    method: 'PUT',
    body: JSON.stringify({
      passkey,
      username,
    }),
  })
}

// ============ Leaderboard ============

export async function getUserLeaderboards(passkey) {
  return apiRequest(`/leaderboards/${passkey}`)
}

export async function createLeaderboard(passkey, name) {
  return apiRequest('/leaderboard', {
    method: 'POST',
    body: JSON.stringify({
      passkey,
      name,
    }),
  })
}

export async function joinLeaderboard(passkey, inviteCode) {
  return apiRequest('/leaderboard/join', {
    method: 'POST',
    body: JSON.stringify({
      passkey,
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

export async function startPasskeyRegistration(passkey, username) {
  return apiRequest('/auth/register/start', {
    method: 'POST',
    body: JSON.stringify({ passkey, username }),
  })
}

export async function finishPasskeyRegistration(passkey, credential) {
  return apiRequest('/auth/register/finish', {
    method: 'POST',
    body: JSON.stringify({ passkey, credential }),
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

export async function checkPasskeyRegistered(passkey) {
  return apiRequest(`/auth/check/${passkey}`)
}
