import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

// Set by PasswordGate after server-side verification so admin actions use a
// short-lived token instead of a password bundled into the frontend.
let _adminToken = ''
let _submitEmailFunctionAvailable = true

function isDuplicateMailingListSignupError(error, status) {
  const message = String(error?.message || '')
  return (
    error?.code === '23505' ||
    status === 409 ||
    error?.status === 409 ||
    message.includes('voter_emails_session_id_key') ||
    message.toLowerCase().includes('duplicate key value')
  )
}

export function clearAdminAuth() {
  _adminToken = ''
}

export async function verifyAdminPassword(password) {
  const { data, error } = await supabase.functions.invoke('admin-action', {
    body: {
      adminPassword: password,
      action: 'verify_admin',
    },
  })

  if (error) throw error
  if (!data?.adminToken) throw new Error('Admin token was not returned')

  _adminToken = data.adminToken
  return data
}

export async function submitVote(poll_id, option_id, session_id, turnstileToken) {
  const { data, error } = await supabase.functions.invoke('submit-vote', {
    body: { poll_id, option_id, session_id, turnstileToken },
  })
  if (error) throw error
  return data
}

export async function submitTextResponse(poll_id, text_response, session_id, turnstileToken) {
  const { data, error } = await supabase.functions.invoke('submit-vote', {
    body: { poll_id, text_response, session_id, turnstileToken },
  })
  if (error) throw error
  return data
}

export async function fetchPublicTextResults(pollId) {
  const { data, error } = await supabase.functions.invoke('poll-results', {
    body: { pollId },
  })
  if (error) throw error
  return data
}

export async function submitMailingListSignup(session_id, email, mailing_list) {
  let invokeError = null

  if (_submitEmailFunctionAvailable) {
    try {
      const { data, error } = await supabase.functions.invoke('submit-email', {
        body: { session_id, email, mailing_list },
      })
      if (error) throw error
      return data
    } catch (error) {
      invokeError = error
      _submitEmailFunctionAvailable = false
    }
  }

  const { error, status } = await supabase
    .from('voter_emails')
    .insert({ session_id, email, mailing_list })

  if (error) {
    if (isDuplicateMailingListSignupError(error, status)) {
      return { ok: true, email, mailing_list, duplicate: true }
    }

    if (invokeError) {
      error.cause = invokeError
    }
    throw error
  }

  return { ok: true, email, mailing_list }
}

export async function adminAction(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('admin-action', {
    body: {
      adminToken: _adminToken,
      action,
      payload,
    },
  })
  if (error) throw error
  return data
}
