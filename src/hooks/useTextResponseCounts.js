import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useTextResponseCounts(pollId, { enabled = true, resetToken = 0 } = {}) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(enabled && Boolean(pollId))

  useEffect(() => {
    let cancelled = false

    async function loadResults() {
      if (!enabled || !pollId) {
        if (!cancelled) {
          setResults([])
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('text_response_counts')
        .select('normalized_response, display_response, response_count, first_response_at')
        .eq('poll_id', pollId)
        .order('response_count', { ascending: false })
        .order('first_response_at', { ascending: true })

      if (cancelled) return

      if (!error && data) {
        setResults(data.map(row => ({
          ...row,
          response_count: Number(row.response_count),
        })))
      } else {
        setResults([])
      }

      setLoading(false)
    }

    void loadResults()

    if (!enabled || !pollId) return

    const channel = supabase
      .channel(`text-responses-${pollId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'text_responses',
        },
        payload => {
          const changedPollId = payload.new?.poll_id || payload.old?.poll_id
          if (changedPollId === pollId) {
            void loadResults()
          }
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [enabled, pollId, resetToken])

  return { results, loading }
}
