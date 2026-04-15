import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function usePolls({ adminView = false } = {}) {
  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchPolls() {
    let query = supabase
      .from('polls')
      .select('*, options(*)')
      .order('created_at', { ascending: false })

    if (!adminView) {
      query = query.or('status.eq.open,show_results.eq.true')
    }

    const { data, error } = await query
    if (error) {
      setError(error)
    } else {
      setPolls(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPolls()

    const channel = supabase
      .channel('polls-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls' },
        () => {
          fetchPolls()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [adminView])

  return { polls, loading, error, refetch: fetchPolls }
}
