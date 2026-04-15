import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

async function getPolls(adminView) {
  let query = supabase
    .from('polls')
    .select('*, options(*)')
    .order('sort_order', { ascending: true })

  if (!adminView) {
    query = query.or('status.eq.open,show_results.eq.true')
  }

  return query
}

export function usePolls({ adminView = false } = {}) {
  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPolls = useCallback(async () => {
    const { data, error } = await getPolls(adminView)
    if (error) {
      setError(error)
    } else {
      setPolls(data)
      setError(null)
    }
    setLoading(false)
  }, [adminView])

  useEffect(() => {
    let cancelled = false

    async function loadPolls() {
      const { data, error } = await getPolls(adminView)
      if (cancelled) return

      if (error) {
        setError(error)
      } else {
        setPolls(data)
        setError(null)
      }
      setLoading(false)
    }

    void loadPolls()

    const channel = supabase
      .channel('polls-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls' },
        () => {
          void loadPolls()
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [adminView])

  return { polls, loading, error, refetch: fetchPolls }
}
