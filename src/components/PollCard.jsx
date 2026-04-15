import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { hasVoted, recordVote, getSessionId, hasSubmittedEmail, recordEmailSubmitted } from '../lib/localVotes'
import { useVoteCounts } from '../hooks/useVoteCounts'
import ResultsBar from './ResultsBar'

export default function PollCard({ poll }) {
  const options = [...(poll.options || [])].sort((a, b) => a.sort_order - b.sort_order)
  const [voted, setVoted] = useState(() => hasVoted(poll.id))
  const [submitting, setSubmitting] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const { counts } = useVoteCounts(poll.id)

  // Email opt-in state — only shown on first vote of the session
  const [email, setEmail] = useState('')
  const [mailingList, setMailingList] = useState(false)
  const showEmailForm = !voted && !hasSubmittedEmail() && poll.status === 'open'

  // Closed poll with show_results — display final results, no voting
  if (poll.status === 'closed') {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-2 mb-1">
          <span className="text-xs uppercase tracking-widest text-red-500 font-semibold">
            {poll.type === 'prediction' && 'Match Prediction'}
            {poll.type === 'favorite' && 'Fan Favorite'}
            {poll.type === 'reaction' && 'Live Reaction'}
            {poll.type === 'custom' && 'Vote Now'}
          </span>
          <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold ml-auto">
            Final Results
          </span>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">{poll.title}</h2>
        {poll.description && (
          <p className="text-sm text-gray-400 mb-3">{poll.description}</p>
        )}
        <ResultsBar options={options} counts={counts} />
      </div>
    )
  }

  async function handleVote(optionId) {
    if (voted || submitting) return
    setSubmitting(optionId)
    setErrorMsg(null)

    const { error } = await supabase.from('votes').insert({
      poll_id: poll.id,
      option_id: optionId,
      session_id: getSessionId(),
    })

    if (error) {
      if (error.code === '23505') {
        // Unique constraint — already voted from another tab/device
        recordVote(poll.id)
        setVoted(true)
      } else {
        setErrorMsg('Something went wrong. Please try again.')
        setSubmitting(null)
        return
      }
    } else {
      recordVote(poll.id)
      setVoted(true)
    }

    // Save email if provided (upsert in case of retry)
    if (email.trim()) {
      await supabase.from('voter_emails').upsert(
        { session_id: getSessionId(), email: email.trim(), mailing_list: mailingList },
        { onConflict: 'session_id' }
      )
    }
    recordEmailSubmitted()

    setSubmitting(null)
  }

  const isReaction = poll.type === 'reaction'

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-4">
      <div className="flex items-start gap-2 mb-1">
        <span className="text-xs uppercase tracking-widest text-red-500 font-semibold">
          {poll.type === 'prediction' && 'Match Prediction'}
          {poll.type === 'favorite' && 'Fan Favorite'}
          {poll.type === 'reaction' && 'Live Reaction'}
          {poll.type === 'custom' && 'Vote Now'}
        </span>
      </div>

      <h2 className="text-xl font-bold text-white mb-1">{poll.title}</h2>
      {poll.description && (
        <p className="text-sm text-gray-400 mb-3">{poll.description}</p>
      )}

      {/* Email opt-in — shown once per session before first vote */}
      {showEmailForm && (
        <div className="mb-4 pb-4 border-b border-gray-700">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email (optional)"
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-600 transition-colors"
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mailingList}
              onChange={e => setMailingList(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            <span className="text-sm text-gray-400">I would like to sign up for your mailing list</span>
          </label>
        </div>
      )}

      {voted ? (
        <>
          <div className="text-sm text-green-400 font-medium mb-2">
            Your vote is in!
          </div>
          <ResultsBar options={options} counts={counts} />
        </>
      ) : isReaction ? (
        // Emoji reaction layout — big tappable buttons in a row
        <div className="flex flex-wrap gap-3 justify-center mt-3">
          {options.map(option => (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={!!submitting}
              className="flex flex-col items-center gap-1 bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-2xl px-5 py-4 transition-all disabled:opacity-50 min-w-[72px]"
            >
              <span className="text-3xl">{option.emoji || option.label}</span>
              <span className="text-xs text-gray-400">{option.label}</span>
            </button>
          ))}
        </div>
      ) : (
        // Standard vote buttons — full-width stacked
        <div className="space-y-2 mt-3">
          {options.map(option => (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={!!submitting}
              className="w-full text-left bg-gray-800 hover:bg-red-900/40 border border-gray-600 hover:border-red-600 active:scale-[0.98] rounded-xl px-4 py-4 text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submitting === option.id ? (
                <span className="text-gray-400 text-sm">Submitting...</span>
              ) : (
                <>
                  {option.emoji && <span className="text-xl">{option.emoji}</span>}
                  {option.label}
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {errorMsg && (
        <p className="text-red-400 text-sm mt-3 text-center">{errorMsg}</p>
      )}
    </div>
  )
}
