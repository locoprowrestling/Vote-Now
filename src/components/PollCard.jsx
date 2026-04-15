import { useState, useRef } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { submitVote } from '../lib/supabaseClient'
import { hasVoted, recordVote, getSessionId } from '../lib/localVotes'
import { useVoteCounts } from '../hooks/useVoteCounts'
import ResultsBar from './ResultsBar'

export default function PollCard({ poll }) {
  const options = [...(poll.options || [])].sort((a, b) => a.sort_order - b.sort_order)
  const [voted, setVoted] = useState(() => hasVoted(poll.id))
  const [submitting, setSubmitting] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const { counts } = useVoteCounts(poll.id)
  const turnstileRef = useRef(null)
  const [cfToken, setCfToken] = useState(null)

  // Closed poll with show_results — display final results, no voting
  if (poll.status === 'closed') {
    return (
      <div className="bg-loco-purple-deep border border-loco-purple rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-2 mb-1">
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

    try {
      await submitVote(poll.id, optionId, getSessionId(), cfToken)
      recordVote(poll.id)
      setVoted(true)
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      turnstileRef.current?.reset()
      setCfToken(null)
    } finally {
      setSubmitting(null)
    }
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

      <Turnstile
        ref={turnstileRef}
        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
        onSuccess={setCfToken}
        options={{ size: 'invisible' }}
      />

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
