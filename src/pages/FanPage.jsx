import { usePolls } from '../hooks/usePolls'
import PollCard from '../components/PollCard'
import MailingListSignup from '../components/MailingListSignup'

export default function FanPage() {
  const { polls, loading } = usePolls()

  return (
    <div className="min-h-screen bg-loco-purple-dark px-4 pb-10">
      {/* Header */}
      <div className="text-center py-6 border-b border-loco-purple mb-6">
        <img
          src="img/LoCoPro Primary Mark.png"
          alt="LoCo Pro Wrestling"
          className="mx-auto h-20 w-auto object-contain"
        />
        <div className="text-loco-light/60 text-sm mt-3 tracking-widest uppercase">
          Live Fan Vote
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center pt-16">
          <div className="w-8 h-8 border-2 border-loco-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center pt-16 text-loco-light/50">
          <div className="text-4xl mb-4">🎤</div>
          <p className="text-lg font-medium text-loco-light">No active votes right now</p>
          <p className="text-sm mt-2">Stay tuned — voting opens before each match!</p>
        </div>
      ) : (
        <div className="max-w-lg mx-auto">
          {polls.map(poll => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}

      <MailingListSignup />
    </div>
  )
}
