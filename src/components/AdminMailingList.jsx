import { useState, useEffect } from 'react'
import { adminAction } from '../lib/supabaseClient'

export default function AdminMailingList() {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    adminAction('get_mailing_list')
      .then(data => setEmails(data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function removeEmail(id) {
    setRemoving(id)
    try {
      await adminAction('remove_from_mailing_list', { id })
      setEmails(prev => prev.filter(r => r.id !== id))
    } catch {
      // silent — row stays visible, user can retry
    } finally {
      setRemoving(null)
    }
  }

  async function copyEmails() {
    const text = emails.map(r => r.email).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-loco-purple-deep border border-loco-purple rounded-2xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-loco-purple/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Mailing List Signups</span>
          {!loading && (
            <span className="text-xs bg-loco-gold/20 text-loco-gold px-2 py-0.5 rounded-full font-semibold">
              {emails.length}
            </span>
          )}
        </div>
        <span className="text-loco-light/30 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-loco-purple px-4 pb-4 pt-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-loco-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm py-2">{error}</p>
          ) : emails.length === 0 ? (
            <p className="text-loco-light/30 text-sm py-2 text-center">No signups yet.</p>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                <button
                  onClick={copyEmails}
                  className="text-xs px-3 py-1.5 bg-loco-purple-dark hover:bg-loco-purple border border-loco-purple text-loco-light/60 rounded-lg transition-all"
                >
                  {copied ? '✓ Copied' : 'Copy all emails'}
                </button>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {emails.map((row) => (
                  <div key={row.id} className="flex items-center justify-between py-1 border-b border-loco-purple/50 last:border-0">
                    <span className="text-sm text-loco-light/70">{row.email}</span>
                    <button
                      onClick={() => removeEmail(row.id)}
                      disabled={removing === row.id}
                      className="ml-2 text-loco-light/30 hover:text-red-400 transition-colors text-xs px-1.5 disabled:opacity-40"
                      title="Remove from mailing list"
                    >
                      {removing === row.id ? '…' : '×'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
