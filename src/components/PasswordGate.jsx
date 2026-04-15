import { useState } from 'react'
import { clearAdminAuth, verifyAdminPassword } from '../lib/supabaseClient'

export default function PasswordGate({ children }) {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)
      await verifyAdminPassword(password)
      setAuthed(true)
      setPassword('')
    } catch (err) {
      if (err?.context?.status === 401 || err?.message?.includes('Unauthorized')) {
        setError('Incorrect password')
      } else {
        setError('Unable to sign in. Try again.')
      }
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  function handleSignOut() {
    clearAdminAuth()
    setAuthed(false)
    setPassword('')
    setError(null)
  }

  if (authed) return children({ onSignOut: handleSignOut })

  return (
    <div className="min-h-screen bg-loco-purple-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-loco-gold font-black text-2xl tracking-tight uppercase">
            LoCo Pro Wrestling
          </div>
          <div className="text-loco-light/60 text-sm mt-1 tracking-widest uppercase">
            Admin Panel
          </div>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-loco-purple-deep border border-loco-purple rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-sm text-loco-light/60 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              autoFocus
              required
              className="w-full bg-loco-purple-dark border border-loco-purple rounded-xl px-4 py-3 text-white focus:outline-none focus:border-loco-gold text-base transition-colors"
              placeholder="Admin password"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-loco-purple hover:bg-loco-purple-dark active:scale-[0.98] text-white font-bold rounded-xl py-3 transition-all border border-loco-purple"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
