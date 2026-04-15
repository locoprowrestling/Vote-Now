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

  const [email, setEmail] = useState('')
  const [mailingList, setMailingList] = useState(false)
  const showEmailForm = !voted && !hasSubmittedEmail() && poll.status === 'open'

  // Closed poll with show_results — display final results, no voting
  if (poll.status === 'closed') {
    return (
      <div className="bg-loco-purple-deep border border-loco-purple rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-2 mb-1">
          <span className="text-xs uppercase tracking-widest text-loco-gold font-semibold">
            {poll.type === 'prediction' && 'Match Prediction'}
            {poll.type === 'favorite' && 'Fan Favorite'}
            {poll.type === 'reaction' && 'Live Reaction'}
            {poll.type === 'custom' && 'Vote Now'}
          </span>
          <span className="text-xs uppercase tracking-widest text-loco-light/40 font-semibold ml-auto">
            Final Results
          </span>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">{poll.title}</h2>
        {poll.description && (
          <p className="text-sm text-loco-light/60 mb-3">{poll.description}</p>
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
    <div className="bg-loco-purple-deep border border-loco-purple rounded-2xl p-5 mb-4">
      <div className="flex items-start gap-2 mb-1">
        <span className="text-xs uppercase tracking-widest text-loco-gold font-semibold">
          {poll.type === 'prediction' && 'Match Prediction'}
          {poll.type === 'favorite' && 'Fan Favorite'}
          {poll.type === 'reaction' && 'Live Reaction'}
          {poll.type === 'custom' && 'Vote Now'}
        </span>
      </div>

      <h2 className="text-xl font-bold text-white mb-1">{poll.title}</h2>
      {poll.description && (
        <p className="text-sm text-loco-light/60 mb-3">{poll.description}</p>
      )}

      {/* Email opt-in — shown once per session before first vote */}
      {showEmailForm && (
        <div className="mb-4 pb-4 border-b border-loco-purple">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email (optional)"
            className="w-full bg-loco-purple-dark border border-loco-purple rounded-xl px-4 py-2.5 text-sm text-white placeholder-loco-light/30 focus:outline-none focus:border-loco-gold transition-colors"
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mailingList}
              onChange={e => setMailingList(e.target.checked)}
              className="w-4 h-4 accent-loco-gold"
            />
            <span className="text-sm text-loco-light/60">I would like to sign up for your mailing list</span>
          </label>
        </div>
      )}

      {voted ? (
        <>
          <div className="text-sm text-loco-green font-medium mb-2">
            Your vote is in!
          </div>
          <ResultsBar options={options} counts={counts} />
        </>
      ) : isReaction ? (
        <div className="flex flex-wrap gap-3 justify-center mt-3">
          {options.map(option => (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={!!submitting}
              className="flex flex-col items-center gap-1 bg-loco-purple-dark hover:bg-loco-purple active:scale-95 rounded-2xl px-5 py-4 transition-all disabled:opacity-50 min-w-[72px] border border-loco-purple hover:border-loco-gold"
            >
              <span className="text-3xl">{option.emoji || option.label}</span>
              <span className="text-xs text-loco-light/60">{option.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2 mt-3">
          {options.map(option => (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={!!submitting}
              className="w-full text-left bg-loco-purple-dark hover:bg-loco-purple/60 border border-loco-purple hover:border-loco-gold active:scale-[0.98] rounded-xl px-4 py-4 text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submitting === option.id ? (
                <span className="text-loco-light/40 text-sm">Submitting...</span>
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
