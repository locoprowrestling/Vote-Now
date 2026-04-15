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

export default function AdminPollForm({ onCreated, onCancel, onReset, initialPoll }) {
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
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

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
    setNotice(null)

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

  async function handleResetPoll() {
    if (!isEditing) return
    if (!confirm(`Reset "${initialPoll.title}" and clear all votes? Fans will be able to vote again.`)) {
      return
    }

    setResetting(true)
    setError(null)
    setNotice(null)

    try {
      await adminAction('reset_poll', { pollId: initialPoll.id })
      await onReset?.()
      setNotice('Votes cleared. Fans can vote again.')
    } catch (err) {
      setError(err.message || 'Unable to reset the poll.')
    } finally {
      setResetting(false)
    }
  }

  const isReaction = type === 'reaction'
  const isBusy = submitting || resetting
  const inputClass = "w-full bg-loco-purple-dark border border-loco-purple rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-loco-gold transition-colors"

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-loco-purple-deep border border-loco-purple rounded-2xl p-5 mb-4"
    >
      <h3 className="text-white font-bold text-lg mb-4">
        {isEditing ? 'Edit Poll' : 'New Poll'}
      </h3>

      <div className="space-y-3">
        {/* Type */}
        <div>
          <label className="block text-xs text-loco-light/50 mb-1 uppercase tracking-wider">Type</label>
          <select
            value={type}
            onChange={e => handleTypeChange(e.target.value)}
            className={inputClass}
          >
            {POLL_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs text-loco-light/50 mb-1 uppercase tracking-wider">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className={inputClass}
            placeholder="Who will win the main event?"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-loco-light/50 mb-1 uppercase tracking-wider">
            Description <span className="normal-case text-loco-light/30">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className={inputClass}
            placeholder="Subtitle or extra context"
          />
        </div>

        {/* Options */}
        <div>
          <label className="block text-xs text-loco-light/50 mb-2 uppercase tracking-wider">Options</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                {isReaction && (
                  <input
                    type="text"
                    value={opt.emoji}
                    onChange={e => updateOption(i, 'emoji', e.target.value)}
                    className="w-14 bg-loco-purple-dark border border-loco-purple rounded-xl px-2 py-2.5 text-white text-center focus:outline-none focus:border-loco-gold transition-colors"
                    placeholder="😀"
                  />
                )}
                <input
                  type="text"
                  value={opt.label}
                  onChange={e => updateOption(i, 'label', e.target.value)}
                  className="flex-1 bg-loco-purple-dark border border-loco-purple rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-loco-gold transition-colors"
                  placeholder={`Option ${i + 1}`}
                />
                {!isReaction && (
                  <input
                    type="text"
                    value={opt.emoji}
                    onChange={e => updateOption(i, 'emoji', e.target.value)}
                    className="w-14 bg-loco-purple-dark border border-loco-purple rounded-xl px-2 py-2.5 text-white text-center focus:outline-none focus:border-loco-gold transition-colors"
                    placeholder="🏆"
                  />
                )}
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="text-loco-light/30 hover:text-red-400 text-lg leading-none px-1"
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
              className="mt-2 text-sm text-loco-gold hover:text-loco-gold-dark"
            >
              + Add option
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      {notice && <p className="text-loco-green text-sm mt-3">{notice}</p>}

      <div className="flex gap-2 mt-5">
        {isEditing && (
          <button
            type="button"
            onClick={handleResetPoll}
            disabled={isBusy}
            className="bg-red-900/30 hover:bg-red-900/50 border border-red-700/60 text-red-300 font-medium rounded-xl px-4 py-3 transition-all disabled:opacity-50"
          >
            {resetting ? 'Resetting...' : 'Reset Poll'}
          </button>
        )}
        <button
          type="submit"
          disabled={isBusy}
          className="flex-1 bg-loco-purple hover:bg-loco-purple-dark active:scale-[0.98] text-white font-bold rounded-xl py-3 transition-all disabled:opacity-50 border border-loco-purple"
        >
          {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Poll'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isBusy}
          className="flex-1 bg-loco-purple-dark hover:bg-loco-purple text-loco-light/60 font-medium rounded-xl py-3 transition-all border border-loco-purple"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
