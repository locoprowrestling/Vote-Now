import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id, email, mailing_list } = await req.json()
    const sessionId = typeof session_id === 'string' ? session_id.trim() : ''
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const mailingList = Boolean(mailing_list)

    if (!sessionId || !normalizedEmail || !emailPattern.test(normalizedEmail)) {
      return new Response(JSON.stringify({ error: 'Invalid signup payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabase
      .from('voter_emails')
      .upsert(
        { session_id: sessionId, email: normalizedEmail, mailing_list: mailingList },
        { onConflict: 'session_id' }
      )
      .select('email, mailing_list')
      .single()

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ ok: true, ...data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
