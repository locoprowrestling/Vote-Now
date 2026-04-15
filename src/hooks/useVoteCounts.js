import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useVoteCounts(pollId, resetToken = 0) {
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadCounts() {
      if (!pollId) {
        if (!cancelled) {
          setCounts({})
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('vote_counts')
        .select('option_id, vote_count')
        .eq('poll_id', pollId)

      if (cancelled) return

      if (!error && data) {
        const map = {}
        data.forEach(row => {
          map[row.option_id] = Number(row.vote_count)
        })
        setCounts(map)
      } else {
        setCounts({})
      }

      setLoading(false)
    }

    void loadCounts()

    if (!pollId) {
      return () => {
        cancelled = true
      }
    }

    const channel = supabase
      .channel(`votes-${pollId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
        },
        payload => {
          const changedPollId = payload.new?.poll_id || payload.old?.poll_id
          if (changedPollId === pollId) {
            void loadCounts()
          }
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [pollId, resetToken])

  return { counts, loading }
}
