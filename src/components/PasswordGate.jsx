import { useState } from 'react'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

export default function PasswordGate({ children }) {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem('admin_authed') === 'true'
  )
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_authed', 'true')
      setAuthed(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  if (authed) return children

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
          onSubmit={handleSubmit}
          className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4"
        >
          <label className="block text-sm text-gray-400 mb-1">
            Admin Password
          </label>
          <input
            type="password"
            value={input}
            onChange={e => {
              setInput(e.target.value)
              setError(false)
            }}
            autoFocus
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 text-base"
            placeholder="Enter password"
          />
          {error && (
            <p className="text-red-400 text-sm">Incorrect password.</p>
          )}
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
