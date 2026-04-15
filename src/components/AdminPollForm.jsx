import { useState } from 'react'
import { adminAction } from '../lib/supabaseClient'

const POLL_TYPES = [
  { value: 'prediction', label: 'Match Prediction' },
  { value: 'favorite', label: 'Fan Favorite' },
  { value: 'custom', label: 'Custom Poll' },
  { value: 'reaction', label: 'Live Reaction (emoji)' },
]

const DEFAULT_REACTION_OPTIONS = [
  { label: 'Hype', emoji: '🔥' },
  { label: 'Love it', emoji: '❤️' },
  { label: 'Meh', emoji: '😐' },
  { label: 'Boo', emoji: '👎' },
]

export default function AdminPollForm({ onCreated, onCancel, initialPoll }) {
  const isEditing = !!initialPoll

  const [title, setTitle] = useState(initialPoll?.title || '')
  const [description, setDescription] = useState(initialPoll?.description || '')
  const [type, setType] = useState(initialPoll?.type || 'prediction')
  const [options, setOptions] = useState(() => {
    if (initialPoll?.options?.length) {
      return [...initialPoll.options]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(o => ({ label: o.label, emoji: o.emoji || '' }))
    }
    return [{ label: '', emoji: '' }, { label: '', emoji: '' }]
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function handleTypeChange(newType) {
    setType(newType)
    if (newType === 'reaction') {
      setOptions(DEFAULT_REACTION_OPTIONS.map(o => ({ ...o })))
    } else if (type === 'reaction') {
      setOptions([{ label: '', emoji: '' }, { label: '', emoji: '' }])
    }
  }

  function updateOption(index, field, value) {
    setOptions(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addOption() {
    setOptions(prev => [...prev, { label: '', emoji: '' }])
  }

  function removeOption(index) {
    setOptions(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const validOptions = options.filter(o => o.label.trim())
    if (validOptions.length < 2) {
      setError('At least 2 options are required.')
      return
    }

    setSubmitting(true)

    try {
      const opts = validOptions.map(o => ({
        label: o.label.trim(),
        emoji: o.emoji?.trim() || null,
      }))

      if (isEditing) {
        await adminAction('update_poll', {
          pollId: initialPoll.id,
          title: title.trim(),
          description: description.trim() || null,
          type,
          options: opts,
        })
      } else {
        await adminAction('create_poll', {
          title: title.trim(),
          description: description.trim() || null,
          type,
          options: opts,
        })
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onCreated?.()
  }

  const isReaction = type === 'reaction'

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-4"
    >
      <h3 className="text-white font-bold text-lg mb-4">
        {isEditing ? 'Edit Poll' : 'New Poll'}
      </h3>

      <div className="space-y-3">
        {/* Type */}
        <div>
          <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Type</label>
          <select
            value={type}
            onChange={e => handleTypeChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-red-500"
          >
            {POLL_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-red-500"
            placeholder="Who will win the main event?"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">
            Description <span className="normal-case text-gray-600">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-red-500"
            placeholder="Subtitle or extra context"
          />
        </div>

        {/* Options */}
        <div>
          <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Options</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                {isReaction && (
                  <input
                    type="text"
                    value={opt.emoji}
                    onChange={e => updateOption(i, 'emoji', e.target.value)}
                    className="w-14 bg-gray-800 border border-gray-600 rounded-xl px-2 py-2.5 text-white text-center focus:outline-none focus:border-red-500"
                    placeholder="😀"
                  />
                )}
                <input
                  type="text"
                  value={opt.label}
                  onChange={e => updateOption(i, 'label', e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-red-500"
                  placeholder={`Option ${i + 1}`}
                />
                {!isReaction && (
                  <input
                    type="text"
                    value={opt.emoji}
                    onChange={e => updateOption(i, 'emoji', e.target.value)}
                    className="w-14 bg-gray-800 border border-gray-600 rounded-xl px-2 py-2.5 text-white text-center focus:outline-none focus:border-red-500"
                    placeholder="🏆"
                  />
                )}
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="text-gray-500 hover:text-red-400 text-lg leading-none px-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {!isReaction && (
            <button
              type="button"
              onClick={addOption}
              className="mt-2 text-sm text-red-500 hover:text-red-400"
            >
              + Add option
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      <div className="flex gap-2 mt-5">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold rounded-xl py-3 transition-all disabled:opacity-50"
        >
          {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Poll'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl py-3 transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
