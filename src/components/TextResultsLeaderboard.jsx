export default function TextResultsLeaderboard({ results, emptyLabel = 'No responses yet.' }) {
  const total = results.reduce((sum, result) => sum + result.response_count, 0)

  if (results.length === 0) {
    return <p className="text-xs text-loco-light/30 italic">{emptyLabel}</p>
  }

  return (
    <div className="space-y-3">
      {results.map((result, index) => {
        const count = result.response_count
        const pct = total > 0 ? Math.round((count / total) * 100) : 0

        return (
          <div key={result.normalized_response}>
            <div className="flex items-center justify-between gap-3 text-sm mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 shrink-0 text-xs font-mono text-loco-light/40">
                  #{index + 1}
                </span>
                <span className="truncate text-white">{result.display_response}</span>
              </div>
              <span className="shrink-0 text-xs text-loco-light/50">
                <span className="font-bold text-white text-sm">{count}</span>{' '}
                {count === 1 ? 'response' : 'responses'}
              </span>
            </div>
            <div className="w-full bg-loco-purple-dark rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #5a2488, #cfac00)',
                }}
              />
            </div>
          </div>
        )
      })}
      <p className="text-xs text-loco-light/40 text-center pt-1">
        {total} total {total === 1 ? 'response' : 'responses'}
      </p>
    </div>
  )
}
