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

// Set by PasswordGate on successful login so Edge Function calls use the
// same password the admin typed, not a potentially-mismatched build env var.
let _adminPassword = ''

export function setAdminPassword(pw) {
  _adminPassword = pw
}

export async function adminAction(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('admin-action', {
    body: {
      adminPassword: _adminPassword,
      action,
      payload,
    },
  })
  if (error) throw error
  return data
}
