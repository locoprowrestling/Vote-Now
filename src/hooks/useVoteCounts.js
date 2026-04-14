import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useVoteCounts(pollId) {
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchCounts = useCallback(async () => {
    if (!pollId) return
    const { data, error } = await supabase
      .from('vote_counts')
      .select('option_id, vote_count')
      .eq('poll_id', pollId)

    if (!error && data) {
      const map = {}
      data.forEach(row => {
        map[row.option_id] = Number(row.vote_count)
      })
      setCounts(map)
    }
    setLoading(false)
  }, [pollId])

  useEffect(() => {
    fetchCounts()

    const channel = supabase
      .channel(`votes-${pollId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `poll_id=eq.${pollId}`,
        },
        () => {
          fetchCounts()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [pollId, fetchCounts])

  return { counts, loading }
}
