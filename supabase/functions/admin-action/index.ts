import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_TOKEN_TTL_MS = 1000 * 60 * 60 * 12

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

async function importSigningKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

async function createAdminToken(secret: string) {
  const payloadBytes = encoder.encode(JSON.stringify({
    exp: Date.now() + ADMIN_TOKEN_TTL_MS,
  }))
  const key = await importSigningKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, payloadBytes)

  return `${bytesToBase64Url(payloadBytes)}.${bytesToBase64Url(new Uint8Array(signature))}`
}

async function verifyAdminToken(token: string, secret: string) {
  try {
    const [payloadPart, signaturePart] = token.split('.')
    if (!payloadPart || !signaturePart) return false

    const payloadBytes = base64UrlToBytes(payloadPart)
    const signatureBytes = base64UrlToBytes(signaturePart)
    const key = await importSigningKey(secret)
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, payloadBytes)
    if (!valid) return false

    const payload = JSON.parse(decoder.decode(payloadBytes))
    return typeof payload?.exp === 'number' && payload.exp > Date.now()
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { adminPassword, adminToken, action, payload } = await req.json()

    const expectedPassword = Deno.env.get('ADMIN_PASSWORD')
    const sessionSecret = Deno.env.get('ADMIN_SESSION_SECRET') || expectedPassword || ''

    if (!expectedPassword) {
      return new Response(JSON.stringify({ error: 'Admin password is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const passwordMatches = adminPassword === expectedPassword
    const tokenMatches = Boolean(adminToken) && await verifyAdminToken(adminToken, sessionSecret)

    if (!passwordMatches && !tokenMatches) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let result

    if (action === 'verify_admin') {
      result = {
        success: true,
        adminToken: await createAdminToken(sessionSecret),
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'create_poll') {
      const { title, description, type, options } = payload
      const { data: poll, error } = await supabase
        .from('polls')
        .insert({ title, description: description || null, type, status: 'closed' })
        .select()
        .single()
      if (error) throw error

      const optionRows = options.map((o: { label: string; emoji?: string }, i: number) => ({
        poll_id: poll.id,
        label: o.label,
        emoji: o.emoji || null,
        sort_order: i,
      }))
      const { error: optError } = await supabase.from('options').insert(optionRows)
      if (optError) throw optError
      result = poll

    } else if (action === 'update_poll') {
      const { pollId, title, description, type, options } = payload
      const { error } = await supabase
        .from('polls')
        .update({ title, description: description || null, type })
        .eq('id', pollId)
      if (error) throw error

      const { error: delError } = await supabase.from('options').delete().eq('poll_id', pollId)
      if (delError) throw delError

      const optionRows = options.map((o: { label: string; emoji?: string }, i: number) => ({
        poll_id: pollId,
        label: o.label,
        emoji: o.emoji || null,
        sort_order: i,
      }))
      const { error: optError } = await supabase.from('options').insert(optionRows)
      if (optError) throw optError
      result = { success: true }

    } else if (action === 'toggle_status') {
      const { pollId, status } = payload
      const { error } = await supabase.from('polls').update({ status }).eq('id', pollId)
      if (error) throw error
      result = { success: true }

    } else if (action === 'delete_poll') {
      const { pollId } = payload
      const { error } = await supabase.from('polls').delete().eq('id', pollId)
      if (error) throw error
      result = { success: true }

    } else if (action === 'copy_poll') {
      const { pollId } = payload
      const { data: original, error } = await supabase
        .from('polls')
        .select('*, options(*)')
        .eq('id', pollId)
        .single()
      if (error) throw error

      const { data: newPoll, error: pollError } = await supabase
        .from('polls')
        .insert({
          title: original.title + ' (Copy)',
          description: original.description || null,
          type: original.type,
          status: 'closed',
        })
        .select()
        .single()
      if (pollError) throw pollError

      const optionRows = original.options
        .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
        .map((o: { label: string; emoji?: string; sort_order: number }, i: number) => ({
          poll_id: newPoll.id,
          label: o.label,
          emoji: o.emoji || null,
          sort_order: i,
        }))
      const { error: optError } = await supabase.from('options').insert(optionRows)
      if (optError) throw optError
      result = newPoll

    } else if (action === 'toggle_show_results') {
      const { pollId, showResults } = payload
      const { error } = await supabase.from('polls').update({ show_results: showResults }).eq('id', pollId)
      if (error) throw error
      result = { success: true }

    } else if (action === 'get_mailing_list') {
      const { data, error } = await supabase
        .from('voter_emails')
        .select('id, email, mailing_list, created_at')
        .eq('mailing_list', true)
        .is('removed_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      result = data

    } else if (action === 'remove_from_mailing_list') {
      const { id } = payload
      const { error } = await supabase
        .from('voter_emails')
        .update({ removed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      result = { success: true }

    } else {
      return new Response(JSON.stringify({ error: 'Unknown action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
