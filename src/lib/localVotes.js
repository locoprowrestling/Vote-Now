const SESSION_KEY = 'vote_session_id'

// In-memory fallback when localStorage is unavailable (e.g. browser blocks all cookies)
const memStore = new Map()

function storageGet(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return memStore.get(key) ?? null
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    memStore.set(key, value)
  }
}

export function getSessionId() {
  let id = storageGet(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    storageSet(SESSION_KEY, id)
  }
  return id
}

export function hasVoted(pollId) {
  return !!storageGet(`voted_${pollId}`)
}

export function recordVote(pollId) {
  storageSet(`voted_${pollId}`, '1')
}

export function hasSubmittedEmail() {
  return !!storageGet('vote-now:email-submitted')
}

export function recordEmailSubmitted() {
  storageSet('vote-now:email-submitted', 'true')
}
