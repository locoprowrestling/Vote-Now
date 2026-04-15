const SESSION_KEY = 'vote_session_id'

export function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export function hasVoted(pollId) {
  return !!localStorage.getItem(`voted_${pollId}`)
}

export function recordVote(pollId) {
  localStorage.setItem(`voted_${pollId}`, '1')
}

export function hasSubmittedEmail() {
  return !!localStorage.getItem('vote-now:email-submitted')
}

export function recordEmailSubmitted() {
  localStorage.setItem('vote-now:email-submitted', 'true')
}
