export default function ResultsBar({ options, counts }) {
  const total = options.reduce((sum, o) => sum + (counts[o.id] || 0), 0)

  return (
    <div className="space-y-3 mt-4">
      {options.map(option => {
        const count = counts[option.id] || 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={option.id}>
            <div className="flex justify-between text-sm mb-1 text-loco-light/80">
              <span>
                {option.emoji && <span className="mr-1">{option.emoji}</span>}
                {option.label}
              </span>
              <span className="font-bold text-white">{pct}%</span>
            </div>
            <div className="w-full bg-loco-purple-dark rounded-full h-4 overflow-hidden">
              <div
                className="h-4 rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #5a2488, #cfac00)',
                }}
              />
            </div>
            <div className="text-xs text-loco-light/40 mt-0.5 text-right">
              {count} {count === 1 ? 'vote' : 'votes'}
            </div>
          </div>
        )
      })}
      {total > 0 && (
        <p className="text-xs text-loco-light/40 text-center pt-1">
          {total} total {total === 1 ? 'vote' : 'votes'}
        </p>
      )}
    </div>
  )
}
