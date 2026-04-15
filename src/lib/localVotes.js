const SESSION_KEY = 'vote_session_id'
const MAILING_LIST_JOINED_KEY = 'vote-now:mailing-list-joined'
const MAILING_LIST_EMAIL_KEY = 'vote-now:mailing-list-email'
const MAILING_LIST_OPT_IN_KEY = 'vote-now:mailing-list-opt-in'

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

function getVoteKey(pollId, voteResetCount = 0) {
  return `voted_${pollId}_${voteResetCount}`
}

export function hasVoted(pollId, voteResetCount = 0) {
  return !!storageGet(getVoteKey(pollId, voteResetCount))
}

export function recordVote(pollId, voteResetCount = 0) {
  storageSet(getVoteKey(pollId, voteResetCount), '1')
}

export function hasSubmittedEmail() {
  return !!getSubmittedEmail()
}

export function getSubmittedEmail() {
  return (storageGet(MAILING_LIST_EMAIL_KEY) || '').trim()
}

export function getSubmittedMailingListPreference() {
  return storageGet(MAILING_LIST_OPT_IN_KEY) !== 'false'
}

export function recordEmailSubmitted(email, mailingList) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return

  storageSet(MAILING_LIST_JOINED_KEY, 'true')
  storageSet(MAILING_LIST_EMAIL_KEY, normalizedEmail)
  storageSet(MAILING_LIST_OPT_IN_KEY, mailingList ? 'true' : 'false')
}
