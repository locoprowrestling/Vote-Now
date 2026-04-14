import { usePolls } from '../hooks/usePolls'
import PollCard from '../components/PollCard'

export default function FanPage() {
  const { polls, loading } = usePolls()

  return (
    <div className="min-h-screen bg-black px-4 pb-10">
      {/* Header */}
      <div className="text-center py-6 border-b border-gray-800 mb-6">
        <div className="text-red-500 font-black text-2xl tracking-tight uppercase">
          LoCo Pro Wrestling
        </div>
        <div className="text-gray-400 text-sm mt-1 tracking-widest uppercase">
          Live Fan Vote
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center pt-16">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center pt-16 text-gray-500">
          <div className="text-4xl mb-4">🎤</div>
          <p className="text-lg font-medium text-gray-300">No active votes right now</p>
          <p className="text-sm mt-2">Stay tuned — voting opens before each match!</p>
        </div>
      ) : (
        <div className="max-w-lg mx-auto">
          {polls.map(poll => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}
    </div>
  )
}
