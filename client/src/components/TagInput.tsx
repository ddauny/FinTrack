import React, { useState, KeyboardEvent } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      const val = input.trim()
      
      if (val) {
        e.preventDefault()
        e.stopPropagation()
        if (!tags.includes(val)) {
          onChange([...tags, val])
        }
        setInput('')
      } else if (e.key === ',') {
        e.preventDefault()
      }
      // If Enter and empty, allow event to bubble to trigger form submission
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove))
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#1f1f1f] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
      {tags.map(tag => (
        <span key={tag} className="flex items-center gap-1 px-2 py-1 text-sm font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-md">
          #{tag}
          <button 
            type="button"
            onClick={() => removeTag(tag)}
            className="hover:text-indigo-800 dark:hover:text-indigo-100 ml-1"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? "Add tags (press Enter)..." : ""}
        className="flex-1 min-w-[120px] bg-transparent border-none outline-none focus:ring-0 focus:border-transparent focus:outline-none p-0 m-0 text-base font-medium text-slate-900 dark:text-[#f0f0f0] placeholder-slate-400"
      />
    </div>
  )
}
