import { useState } from 'react'
import PasswordGate from '../components/PasswordGate'
import AdminPollForm from '../components/AdminPollForm'
import AdminPollList from '../components/AdminPollList'
import AdminMailingList from '../components/AdminMailingList'
import { usePolls } from '../hooks/usePolls'

function AdminDashboard({ onSignOut }) {
  const { polls, loading, refetch } = usePolls({ adminView: true })
  const [showForm, setShowForm] = useState(false)

  function handleCreated() {
    setShowForm(false)
    refetch()
  }

  return (
    <div className="min-h-screen bg-black px-4 pb-10">
      <div className="flex items-center justify-between py-5 border-b border-gray-800 mb-5">
        <div>
          <div className="text-red-500 font-black text-lg tracking-tight uppercase">
            LoCo Pro Wrestling
          </div>
          <div className="text-gray-500 text-xs tracking-widest uppercase">
            Admin Panel
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="max-w-lg mx-auto">
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full mb-5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold rounded-xl py-3 transition-all"
          >
            + New Poll
          </button>
        )}

        {showForm && (
          <AdminPollForm
            onCreated={handleCreated}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <div className="flex justify-center pt-10">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AdminPollList polls={polls} onRefetch={refetch} />
        )}

        <div className="mt-6">
          <AdminMailingList />
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <PasswordGate>
      {({ onSignOut }) => <AdminDashboard onSignOut={onSignOut} />}
    </PasswordGate>
  )
}
