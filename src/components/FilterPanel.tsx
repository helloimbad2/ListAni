import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { FilterState, GENRES, ANIME_TYPES, ANIME_RATINGS, ANIME_STATUSES } from '../types'
import clsx from 'clsx'

interface Props {
  filters: FilterState
  onChange: (f: FilterState) => void
}

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 1959 }, (_, i) => currentYear - i)

export default function FilterPanel({ filters, onChange }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    userList: true, genres: true, types: false, ratings: false, statuses: false, years: false,
  })

  const sec = (k: string) => setOpen(s => ({ ...s, [k]: !s[k] }))

  // Genre: 3-state cycle — none → include → exclude → none
  const cycleGenre = (id: number) => {
    const included = filters.genres.includes(id)
    const excluded = (filters.excludeGenres || []).includes(id)
    if (!included && !excluded) {
      // none → include
      onChange({ ...filters, genres: [...filters.genres, id] })
    } else if (included) {
      // include → exclude
      onChange({
        ...filters,
        genres: filters.genres.filter(x => x !== id),
        excludeGenres: [...(filters.excludeGenres || []), id],
      })
    } else {
      // exclude → none
      onChange({ ...filters, excludeGenres: (filters.excludeGenres || []).filter(x => x !== id) })
    }
  }

  const toggleType = (t: string) =>
    onChange({ ...filters, types: filters.types.includes(t) ? filters.types.filter(x => x !== t) : [...filters.types, t] })
  const toggleRating = (r: string) =>
    onChange({ ...filters, ratings: filters.ratings.includes(r) ? filters.ratings.filter(x => x !== r) : [...filters.ratings, r] })
  const toggleStatus = (s: string) =>
    onChange({ ...filters, statuses: filters.statuses.includes(s) ? filters.statuses.filter(x => x !== s) : [...filters.statuses, s] })
  const toggleYear = (y: number) =>
    onChange({ ...filters, years: filters.years.includes(y) ? filters.years.filter(x => x !== y) : [...filters.years, y] })

  const activeCount =
    filters.genres.length + (filters.excludeGenres?.length || 0) + filters.types.length +
    filters.ratings.length + filters.statuses.length + filters.years.length +
    (filters.userList !== 'all' ? 1 : 0)

  const clearAll = () => onChange({ ...filters, genres: [], excludeGenres: [], types: [], ratings: [], statuses: [], years: [], userList: 'all' })

  return (
    <aside className="w-52 shrink-0 flex flex-col gap-1 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display font-700 text-sm text-text-base">Filters</span>
        {activeCount > 0 && (
          <button onClick={clearAll} className="flex items-center gap-0.5 text-text-muted hover:text-accent transition-colors text-xs">
            <X className="w-3 h-3" /> Clear ({activeCount})
          </button>
        )}
      </div>

      {/* My List */}
      <Section label="My List" open={open.userList} onToggle={() => sec('userList')}>
        {(['all', 'watchlist', 'finished'] as const).map(v => (
          <TwoStateCheck key={v}
            checked={filters.userList === v}
            label={v === 'all' ? 'All Anime' : v === 'watchlist' ? 'Watchlist' : 'Finished Watching'}
            onChange={() => onChange({ ...filters, userList: v })} />
        ))}
      </Section>

      {/* Genres — 3-state */}
      <Section label="Genre" open={open.genres} onToggle={() => sec('genres')}>
        <p className="text-[9px] text-text-dim mb-1.5 leading-tight">Click once to include ✓, again to exclude ✕</p>
        <div className="max-h-52 overflow-y-auto pr-1 flex flex-col gap-0.5">
          {GENRES.map((g, i) => {
            const included = filters.genres.includes(g.id)
            const excluded = (filters.excludeGenres || []).includes(g.id)
            const state = included ? 'include' : excluded ? 'exclude' : 'none'
            return (
              <ThreeStateCheck key={`${g.id}-${i}`}
                state={state} label={g.name}
                onChange={() => cycleGenre(g.id)} />
            )
          })}
        </div>
      </Section>

      {/* Type */}
      <Section label="Type" open={open.types} onToggle={() => sec('types')}>
        {ANIME_TYPES.map(t => (
          <TwoStateCheck key={t} checked={filters.types.includes(t)} label={t} onChange={() => toggleType(t)} />
        ))}
      </Section>

      {/* Rating */}
      <Section label="Rating" open={open.ratings} onToggle={() => sec('ratings')}>
        {ANIME_RATINGS.map(r => (
          <TwoStateCheck key={r.value} checked={filters.ratings.includes(r.value)} label={r.label} onChange={() => toggleRating(r.value)} />
        ))}
      </Section>

      {/* Status */}
      <Section label="Status" open={open.statuses} onToggle={() => sec('statuses')}>
        {ANIME_STATUSES.map(s => (
          <TwoStateCheck key={s.value} checked={filters.statuses.includes(s.value)} label={s.label} onChange={() => toggleStatus(s.value)} />
        ))}
      </Section>

      {/* Year */}
      <Section label="Year" open={open.years} onToggle={() => sec('years')}>
        <div className="max-h-40 overflow-y-auto pr-1 flex flex-col gap-0.5">
          {YEARS.map(y => (
            <TwoStateCheck key={y} checked={filters.years.includes(y)} label={String(y)} onChange={() => toggleYear(y)} />
          ))}
        </div>
      </Section>
    </aside>
  )
}

function Section({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 bg-surface hover:bg-card transition-colors">
        <span className="font-display font-700 text-xs text-text-base uppercase tracking-wider">{label}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
      </button>
      {open && <div className="px-3 py-2 bg-card flex flex-col gap-0.5 animate-fade-in">{children}</div>}
    </div>
  )
}

// Standard 2-state checkbox (all filters except genres)
function TwoStateCheck({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 py-0.5 cursor-pointer group select-none"
      onClick={e => { e.preventDefault(); onChange() }}>
      <div className={clsx('w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all',
        checked ? 'bg-accent border-accent' : 'border-white/20 group-hover:border-white/40')}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span className={clsx('text-[11px] transition-colors leading-tight',
        checked ? 'text-accent font-600' : 'text-text-muted group-hover:text-text-base')}>
        {label}
      </span>
    </label>
  )
}

// 3-state: none | include (green ✓) | exclude (red ✕)
function ThreeStateCheck({ state, label, onChange }: { state: 'none' | 'include' | 'exclude'; label: string; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 py-0.5 cursor-pointer group select-none"
      onClick={e => { e.preventDefault(); onChange() }}>
      <div className={clsx('w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all',
        state === 'include' ? 'bg-accent border-accent' :
        state === 'exclude' ? 'bg-red-600 border-red-500' :
        'border-white/20 group-hover:border-white/40')}>
        {state === 'include' && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {state === 'exclude' && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10">
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>
      <span className={clsx('text-[11px] transition-colors leading-tight',
        state === 'include' ? 'text-accent font-600' :
        state === 'exclude' ? 'text-red-400 font-600 line-through' :
        'text-text-muted group-hover:text-text-base')}>
        {label}
      </span>
    </label>
  )
}
