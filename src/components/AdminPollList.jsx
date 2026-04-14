import { supabaseAdmin } from '../lib/supabaseClient'
import { useVoteCounts } from '../hooks/useVoteCounts'

function PollRow({ poll, onRefetch }) {
  const options = [...(poll.options || [])].sort((a, b) => a.sort_order - b.sort_order)
  const { counts } = useVoteCounts(poll.id)
  const totalVotes = Object.values(counts).reduce((s, n) => s + n, 0)

  async function toggleStatus() {
    const newStatus = poll.status === 'open' ? 'closed' : 'open'
    await supabaseAdmin.from('polls').update({ status: newStatus }).eq('id', poll.id)
    onRefetch()
  }

  async function deletePoll() {
    if (!confirm(`Delete "${poll.title}"? This cannot be undone.`)) return
    await supabaseAdmin.from('polls').delete().eq('id', poll.id)
    onRefetch()
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 mb-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                poll.status === 'open'
                  ? 'bg-green-900 text-green-400'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {poll.status === 'open' ? 'LIVE' : 'CLOSED'}
            </span>
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              {poll.type}
            </span>
          </div>
          <h3 className="text-white font-bold mt-1 truncate">{poll.title}</h3>
          {poll.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{poll.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-white font-bold">{totalVotes}</div>
          <div className="text-xs text-gray-500">votes</div>
        </div>
      </div>

      {/* Options breakdown */}
      <div className="mt-3 space-y-1">
        {options.map(opt => {
          const count = counts[opt.id] || 0
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          return (
            <div key={opt.id} className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 w-4 text-center">{opt.emoji || ''}</span>
              <span className="text-gray-300 flex-1 truncate">{opt.label}</span>
              <span className="text-gray-400 text-xs w-8 text-right">{pct}%</span>
              <span className="text-gray-500 text-xs w-10 text-right">{count}v</span>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={toggleStatus}
          className={`flex-1 font-bold rounded-xl py-2.5 text-sm transition-all active:scale-[0.98] ${
            poll.status === 'open'
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
              : 'bg-green-700 hover:bg-green-600 text-white'
          }`}
        >
          {poll.status === 'open' ? 'Close Voting' : 'Open Voting'}
        </button>
        <button
          onClick={deletePoll}
          className="px-4 py-2.5 bg-gray-800 hover:bg-red-900/50 border border-gray-700 hover:border-red-700 text-gray-400 hover:text-red-400 rounded-xl text-sm transition-all active:scale-[0.98]"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default function AdminPollList({ polls, onRefetch }) {
  if (polls.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
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
          <h4 className="text-xs text-green-500 uppercase tracking-widest font-semibold mb-2">
            Live Now
          </h4>
          {open.map(p => <PollRow key={p.id} poll={p} onRefetch={onRefetch} />)}
        </div>
      )}
      {closed.length > 0 && (
        <div>
          <h4 className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-2 mt-4">
            Closed
          </h4>
          {closed.map(p => <PollRow key={p.id} poll={p} onRefetch={onRefetch} />)}
        </div>
      )}
    </div>
  )
}
