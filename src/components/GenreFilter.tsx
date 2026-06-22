import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { GENRES } from '../types'
import clsx from 'clsx'

interface Props { selected: number[]; onChange: (ids: number[]) => void }

export default function GenreFilter({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter(g => g !== id) : [...selected, id])
  const clearAll = () => onChange([])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-display font-600 transition-all',
          open ? 'bg-card border-accent/40 text-text-base' : 'bg-surface border-white/[0.08] text-text-muted hover:border-white/[0.18] hover:text-text-base'
        )}
      >
        <span>{selected.length === 0 ? 'Filter by genre' : `${selected.length} genre${selected.length > 1 ? 's' : ''} selected`}</span>
        {selected.length > 0 && (
          <span onClick={e => { e.stopPropagation(); clearAll() }}
            className="w-3.5 h-3.5 rounded-full bg-accent/20 flex items-center justify-center hover:bg-accent/40 transition-colors">
            <X className="w-2 h-2 text-accent" />
          </span>
        )}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 animate-fade-in" style={{ width: 'min(620px, 90vw)' }}>
          <div className="bg-card border border-white/[0.1] rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
              <span className="text-[10px] font-display font-600 text-text-muted uppercase tracking-wider">Filter by Genre</span>
              {selected.length > 0 && (
                <button onClick={clearAll} className="text-[10px] text-text-muted hover:text-accent transition-colors flex items-center gap-0.5">
                  <X className="w-2.5 h-2.5" /> Clear
                </button>
              )}
            </div>
            {/* Compact 5-column grid */}
            <div className="p-2 grid gap-0.5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {GENRES.map((g, i) => {
                const checked = selected.includes(g.id)
                return (
                  <button key={`${g.id}-${i}`} onClick={() => toggle(g.id)}
                    className={clsx(
                      'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-all',
                      checked ? 'bg-accent/15 text-accent' : 'text-text-muted hover:bg-white/[0.04] hover:text-text-base'
                    )}>
                    <div className={clsx('w-3 h-3 rounded border flex items-center justify-center shrink-0 transition-all',
                      checked ? 'bg-accent border-accent' : 'border-white/20')}>
                      {checked && <svg className="w-2 h-2 text-white" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span className="text-[10px] font-display font-500 leading-tight">{g.name}</span>
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
