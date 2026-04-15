import { useEffect, useState } from 'react'
import { adminAction, supabase } from '../lib/supabaseClient'
import { summarizeTextResponses } from '../lib/textResponseResults'

export function useAdminTextResponses(pollId, { enabled = true, resetToken = 0 } = {}) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(enabled && Boolean(pollId))
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadResults() {
      if (!enabled || !pollId) {
        if (!cancelled) {
          setResults([])
          setError(null)
          setLoading(false)
        }
        return
      }

      try {
        const data = await adminAction('get_text_responses', { pollId })
        if (cancelled) return

        setResults(summarizeTextResponses(data || []))
        setError(null)
      } catch (loadError) {
        if (cancelled) return

        setResults([])
        setError(loadError)
      }

      if (!cancelled) {
        setLoading(false)
      }
    }

    void loadResults()

    if (!enabled || !pollId) return

    const channel = supabase
      .channel(`admin-text-responses-${pollId}`)
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

  return { results, loading, error }
}
