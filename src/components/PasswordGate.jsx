import { useState } from 'react'
import { setAdminPassword } from '../lib/supabaseClient'

export default function PasswordGate({ children }) {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  function handleLogin(e) {
    e.preventDefault()
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      setAdminPassword(password)
      setAuthed(true)
    } else {
      setError('Incorrect password')
      setPassword('')
    }
  }

  function handleSignOut() {
    setAuthed(false)
    setPassword('')
  }

  if (authed) return children({ onSignOut: handleSignOut })

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-red-500 font-black text-2xl tracking-tight uppercase">
            LoCo Pro Wrestling
          </div>
          <div className="text-gray-400 text-sm mt-1 tracking-widest uppercase">
            Admin Panel
          </div>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              autoFocus
              required
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 text-base"
              placeholder="Admin password"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold rounded-xl py-3 transition-all"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}
