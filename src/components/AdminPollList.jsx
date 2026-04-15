import { useState } from 'react'
import { adminAction } from '../lib/supabaseClient'
import { useVoteCounts } from '../hooks/useVoteCounts'
import AdminPollForm from './AdminPollForm'

function PollRow({ poll, onRefetch }) {
  const options = [...(poll.options || [])].sort((a, b) => a.sort_order - b.sort_order)
  const { counts } = useVoteCounts(poll.id)
  const totalVotes = Object.values(counts).reduce((s, n) => s + n, 0)
  const [editing, setEditing] = useState(false)

  async function toggleStatus() {
    const newStatus = poll.status === 'open' ? 'closed' : 'open'
    await adminAction('toggle_status', { pollId: poll.id, status: newStatus })
    onRefetch()
  }

  async function deletePoll() {
    if (!confirm(`Delete "${poll.title}"? This cannot be undone.`)) return
    await adminAction('delete_poll', { pollId: poll.id })
    onRefetch()
  }

  async function toggleShowResults() {
    await adminAction('toggle_show_results', { pollId: poll.id, showResults: !poll.show_results })
    onRefetch()
  }

  async function copyPoll() {
    await adminAction('copy_poll', { pollId: poll.id })
    onRefetch()
  }

  if (editing) {
    return (
      <AdminPollForm
        initialPoll={poll}
        onCreated={() => { setEditing(false); onRefetch() }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="bg-loco-purple-deep border border-loco-purple rounded-2xl p-4 mb-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                poll.status === 'open'
                  ? 'bg-loco-green/20 text-loco-green'
                  : 'bg-loco-purple text-loco-light/50'
              }`}
            >
              {poll.status === 'open' ? 'LIVE' : 'CLOSED'}
            </span>
            <span className="text-xs text-loco-light/40 uppercase tracking-wide">
              {poll.type}
            </span>
          </div>
          <h3 className="text-white font-bold mt-1 truncate">{poll.title}</h3>
          {poll.description && (
            <p className="text-xs text-loco-light/40 mt-0.5 truncate">{poll.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-white font-bold">{totalVotes}</div>
          <div className="text-xs text-loco-light/40">votes</div>
        </div>
      </div>

      {/* Options breakdown */}
      <div className="mt-3 space-y-1">
        {options.map(opt => {
          const count = counts[opt.id] || 0
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          return (
            <div key={opt.id} className="flex items-center gap-2 text-sm">
              <span className="text-loco-light/60 w-4 text-center">{opt.emoji || ''}</span>
              <span className="text-loco-light/80 flex-1 truncate">{opt.label}</span>
              <span className="text-loco-light/50 text-xs w-8 text-right">{pct}%</span>
              <span className="text-loco-light/40 text-xs w-10 text-right">{count}v</span>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 flex-wrap">
        <button
          onClick={toggleStatus}
          className={`flex-1 font-bold rounded-xl py-2.5 text-sm transition-all active:scale-[0.98] ${
            poll.status === 'open'
              ? 'bg-loco-gold hover:bg-loco-gold-dark text-loco-text'
              : 'bg-loco-green hover:bg-loco-green-dark text-white'
          }`}
        >
          {poll.status === 'open' ? 'Close Voting' : 'Open Voting'}
        </button>
        <button
          onClick={() => setEditing(true)}
          className="px-4 py-2.5 bg-loco-purple-dark hover:bg-loco-purple border border-loco-purple text-loco-light/70 rounded-xl text-sm transition-all active:scale-[0.98]"
        >
          Edit
        </button>
        <button
          onClick={copyPoll}
          className="px-4 py-2.5 bg-loco-purple-dark hover:bg-loco-purple border border-loco-purple text-loco-light/70 rounded-xl text-sm transition-all active:scale-[0.98]"
        >
          Copy
        </button>
        <button
          onClick={toggleShowResults}
          className={`px-4 py-2.5 border rounded-xl text-sm transition-all active:scale-[0.98] ${
            poll.show_results
              ? 'bg-loco-gold/20 border-loco-gold text-loco-gold hover:bg-loco-gold/30'
              : 'bg-loco-purple-dark hover:bg-loco-purple border-loco-purple text-loco-light/70'
          }`}
        >
          {poll.show_results ? 'Hide Results' : 'Show Results'}
        </button>
        <button
          onClick={deletePoll}
          className="px-3 py-2.5 bg-loco-purple-dark hover:bg-red-900/50 border border-loco-purple hover:border-red-700 text-loco-light/30 hover:text-red-400 rounded-xl text-sm transition-all active:scale-[0.98]"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default function AdminPollList({ polls, onRefetch }) {
  if (polls.length === 0) {
    return (
      <div className="text-center py-12 text-loco-light/30">
        <p>No polls yet. Create one above.</p>
      </div>
    )
  }

  const open = polls.filter(p => p.status === 'open')
  const closed = polls.filter(p => p.status === 'closed')

  return (
    <div>
      {open.length > 0 && (
        <div className="mb-2">
          <h4 className="text-xs text-loco-green uppercase tracking-widest font-semibold mb-2">
            Live Now
          </h4>
          {open.map(p => <PollRow key={p.id} poll={p} onRefetch={onRefetch} />)}
        </div>
      )}
      {closed.length > 0 && (
        <div>
          <h4 className="text-xs text-loco-light/30 uppercase tracking-widest font-semibold mb-2 mt-4">
            Closed
          </h4>
          {closed.map(p => <PollRow key={p.id} poll={p} onRefetch={onRefetch} />)}
        </div>
      )}
    </div>
  )
}
