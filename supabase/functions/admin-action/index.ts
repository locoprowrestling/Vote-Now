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
    const { adminPassword, action, payload } = await req.json()

    // Validate password server-side — service key never leaves this function
    const expectedPassword = Deno.env.get('ADMIN_PASSWORD')
    if (!expectedPassword || adminPassword !== expectedPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let result

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
