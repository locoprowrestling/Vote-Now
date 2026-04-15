import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizeDisplayResponse(value: string) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function normalizeResponseKey(value: string) {
  return normalizeDisplayResponse(value).replace(/\s+/g, '').toLowerCase()
}

function aggregateTextResponses(rows: Array<{
  normalized_response?: string
  display_response?: string
  response?: string
  response_count?: number
  first_response_at?: string
  created_at?: string
}>) {
  const grouped = new Map<string, {
    normalized_response: string
    display_response: string
    response_count: number
    first_response_at: string
  }>()

  for (const row of rows) {
    const normalizedResponse = row.normalized_response || normalizeResponseKey(row.display_response || row.response || '')
    if (!normalizedResponse) continue

    const displayResponse = normalizeDisplayResponse(row.display_response || row.response || '')
    if (!displayResponse) continue

    const responseCount = Number(row.response_count || 1)
    const firstResponseAt = row.first_response_at || row.created_at || new Date(0).toISOString()
    const existing = grouped.get(normalizedResponse)

    if (!existing) {
      grouped.set(normalizedResponse, {
        normalized_response: normalizedResponse,
        display_response: displayResponse,
        response_count: responseCount,
        first_response_at: firstResponseAt,
      })
      continue
    }

    existing.response_count += responseCount
    if (firstResponseAt < existing.first_response_at) {
      existing.first_response_at = firstResponseAt
    }

    if (
      displayResponse.length > existing.display_response.length ||
      (
        displayResponse.length === existing.display_response.length &&
        /\s/.test(displayResponse) &&
        !/\s/.test(existing.display_response)
      )
    ) {
      existing.display_response = displayResponse
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (b.response_count !== a.response_count) {
      return b.response_count - a.response_count
    }
    return a.first_response_at.localeCompare(b.first_response_at)
  })
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pollId } = await req.json()
    if (!pollId) {
      return new Response(JSON.stringify({ error: 'pollId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('id, type, status, show_results')
      .eq('id', pollId)
      .single()

    if (pollError) throw pollError

    if (!poll || poll.type !== 'text' || !poll.show_results || poll.status !== 'closed') {
      return new Response(JSON.stringify({ error: 'Results are not available for this poll' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await supabase
      .from('text_response_counts')
      .select('normalized_response, display_response, response_count, first_response_at')
      .eq('poll_id', pollId)
      .order('response_count', { ascending: false })
      .order('first_response_at', { ascending: true })

    if (!error) {
      return new Response(JSON.stringify(data || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: rawData, error: rawError } = await supabase
      .from('text_responses')
      .select('id, response, created_at')
      .eq('poll_id', pollId)
      .order('created_at', { ascending: true })

    if (rawError) throw rawError

    return new Response(JSON.stringify(aggregateTextResponses(rawData || [])), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
