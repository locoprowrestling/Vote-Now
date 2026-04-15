import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getSessionId, hasSubmittedEmail, recordEmailSubmitted } from '../lib/localVotes'

export default function MailingListSignup() {
  const [submitted, setSubmitted] = useState(() => hasSubmittedEmail())
  const [email, setEmail] = useState('')
  const [mailingList, setMailingList] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || submitting) return
    setSubmitting(true)
    setError(null)

    const { error: dbError } = await supabase.from('voter_emails').upsert(
      { session_id: getSessionId(), email: email.trim(), mailing_list: mailingList },
      { onConflict: 'session_id' }
    )

    if (dbError) {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    recordEmailSubmitted()
    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-6 mb-4">
        <div className="bg-loco-purple-deep border border-loco-purple rounded-2xl p-5 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <p className="text-loco-green font-semibold">You're on the list!</p>
          <p className="text-sm text-loco-light/50 mt-1">We'll be in touch before the next event.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto mt-6 mb-4">
      <div className="bg-loco-purple-deep border border-loco-purple rounded-2xl p-5">
        <p className="text-sm font-semibold text-loco-gold uppercase tracking-widest mb-3">
          Stay in the loop
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Your email address"
            required
            className="w-full bg-loco-purple-dark border border-loco-purple rounded-xl px-4 py-2.5 text-sm text-white placeholder-loco-light/30 focus:outline-none focus:border-loco-gold transition-colors"
          />
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mailingList}
              onChange={e => setMailingList(e.target.checked)}
              className="w-4 h-4 accent-loco-gold"
            />
            <span className="text-sm text-loco-light/60">Sign me up for the LoCo Pro mailing list</span>
          </label>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="w-full bg-loco-gold text-loco-text font-bold py-2.5 rounded-xl hover:bg-loco-gold-dark active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {submitting ? 'Submitting…' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  )
}
