function normalizeDisplayResponse(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function normalizeResponseKey(value) {
  return normalizeDisplayResponse(value).replace(/\s+/g, '').toLowerCase()
}

function shouldUseCandidateDisplay(current, candidate) {
  if (!current) return true

  if (candidate.display_response.length !== current.display_response.length) {
    return candidate.display_response.length > current.display_response.length
  }

  const candidateHasSpaces = /\s/.test(candidate.display_response)
  const currentHasSpaces = /\s/.test(current.display_response)
  if (candidateHasSpaces !== currentHasSpaces) {
    return candidateHasSpaces
  }

  return candidate.first_response_at < current.first_response_at
}

export function summarizeTextResponses(rows = []) {
  const grouped = new Map()

  rows.forEach(row => {
    const normalizedResponse = row.normalized_response || normalizeResponseKey(row.display_response || row.response)
    if (!normalizedResponse) return

    const displayResponse = normalizeDisplayResponse(row.display_response || row.response)
    if (!displayResponse) return

    const responseCount = Number(row.response_count || 1)
    const firstResponseAt = row.first_response_at || row.created_at || new Date(0).toISOString()
    const candidate = {
      normalized_response: normalizedResponse,
      display_response: displayResponse,
      response_count: responseCount,
      first_response_at: firstResponseAt,
    }

    const existing = grouped.get(normalizedResponse)
    if (!existing) {
      grouped.set(normalizedResponse, candidate)
      return
    }

    existing.response_count += responseCount
    if (candidate.first_response_at < existing.first_response_at) {
      existing.first_response_at = candidate.first_response_at
    }
    if (shouldUseCandidateDisplay(existing, candidate)) {
      existing.display_response = candidate.display_response
    }
  })

  return Array.from(grouped.values()).sort((a, b) => {
    if (b.response_count !== a.response_count) {
      return b.response_count - a.response_count
    }
    return a.first_response_at.localeCompare(b.first_response_at)
  })
}
