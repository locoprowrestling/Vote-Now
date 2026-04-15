import { useState, useEffect } from 'react'
import { adminAction } from '../lib/supabaseClient'

export default function AdminMailingList() {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    adminAction('get_mailing_list')
      .then(data => setEmails(data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function copyEmails() {
    const text = emails.map(r => r.email).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden mb-4">
      {/* Header — always visible, toggles list */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Mailing List Signups</span>
          {!loading && (
            <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full font-semibold">
              {emails.length}
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-700 px-4 pb-4 pt-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-red-400 text-sm py-2">{error}</p>
          ) : emails.length === 0 ? (
            <p className="text-gray-500 text-sm py-2 text-center">No signups yet.</p>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                <button
                  onClick={copyEmails}
                  className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 rounded-lg transition-all"
                >
                  {copied ? '✓ Copied' : 'Copy all emails'}
                </button>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {emails.map((row, i) => (
                  <div key={i} className="text-sm text-gray-300 py-1 border-b border-gray-800 last:border-0">
                    {row.email}
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
