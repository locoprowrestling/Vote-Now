import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { poll_id, option_id, text_response, session_id, turnstileToken } = await req.json()

    // Verify Turnstile token with Cloudflare
    const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
    const verifyRes = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: turnstileToken }),
      }
    )
    const { success } = await verifyRes.json()

    if (!success) {
      return new Response(JSON.stringify({ error: 'Bot check failed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insert vote/response using service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let insertError = null

    if (text_response !== undefined) {
      // Text-entry poll: insert into text_responses
      const { error } = await supabase
        .from('text_responses')
        .insert({ poll_id, session_id, response: text_response })
      insertError = error
    } else {
      // Choice poll: insert into votes
      const { error } = await supabase
        .from('votes')
        .insert({ poll_id, option_id, session_id })
      insertError = error
    }

    // Treat duplicate (23505) as success — user already responded
    if (insertError && insertError.code !== '23505') {
      return new Response(JSON.stringify({ error: insertError.message, code: insertError.code }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isDuplicate = insertError?.code === '23505'
    return new Response(JSON.stringify({ ok: true, duplicate: isDuplicate }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
