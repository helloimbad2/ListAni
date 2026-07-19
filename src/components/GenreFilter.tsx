import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { GENRES } from '../types'
import clsx from 'clsx'

interface Props {
  selected: number[]
  onChange: (ids: number[]) => void
}

export default function GenreFilter({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter(g => g !== id) : [...selected, id])

  const clearAll = () => onChange([])

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-display font-600 transition-all',
          open
            ? 'bg-card border-accent/40 text-text-base'
            : 'bg-surface border-white/[0.08] text-text-muted hover:border-white/[0.18] hover:text-text-base'
        )}
      >
        <span>
          {selected.length === 0
            ? 'Select genre'
            : `${selected.length} genre${selected.length > 1 ? 's' : ''} selected`}
        </span>
        {selected.length > 0 && (
          <span
            onClick={e => { e.stopPropagation(); clearAll() }}
            className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center hover:bg-accent/40 transition-colors"
          >
            <X className="w-2.5 h-2.5 text-accent" />
          </span>
        )}
        {open ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-30 animate-fade-in"
          style={{ width: 'min(720px, 92vw)' }}>
          <div className="bg-card border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="text-xs font-display font-600 text-text-muted uppercase tracking-wider">
                Filter by Genre
              </span>
              {selected.length > 0 && (
                <button onClick={clearAll} className="text-xs text-text-muted hover:text-accent transition-colors flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>

            {/* Genre grid */}
            <div className="p-3 genre-dropdown-grid">
              {GENRES.map((g, i) => {
                const checked = selected.includes(g.id)
                return (
                  <button
                    key={`${g.id}-${i}`}
                    onClick={() => toggle(g.id)}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-display font-500 transition-all',
                      checked
                        ? 'bg-accent/15 text-accent border border-accent/30'
                        : 'text-text-muted hover:bg-white/[0.05] hover:text-text-base border border-transparent'
                    )}
                  >
                    {/* Checkbox box */}
                    <div className={clsx(
                      'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all',
                      checked ? 'bg-accent border-accent' : 'border-white/20'
                    )}>
                      {checked && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10">
                          <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    {g.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
