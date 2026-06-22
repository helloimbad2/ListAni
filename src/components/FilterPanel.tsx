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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    userList: true, genres: true, types: false, ratings: false, statuses: false, years: false,
  })

  const toggle = (key: string) => setOpenSections((s) => ({ ...s, [key]: !s[key] }))

  const toggleGenre = (id: number) =>
    onChange({ ...filters, genres: filters.genres.includes(id) ? filters.genres.filter((g) => g !== id) : [...filters.genres, id] })

  const toggleType = (t: string) =>
    onChange({ ...filters, types: filters.types.includes(t) ? filters.types.filter((x) => x !== t) : [...filters.types, t] })

  const toggleRating = (r: string) =>
    onChange({ ...filters, ratings: filters.ratings.includes(r) ? filters.ratings.filter((x) => x !== r) : [...filters.ratings, r] })

  const toggleStatus = (s: string) =>
    onChange({ ...filters, statuses: filters.statuses.includes(s) ? filters.statuses.filter((x) => x !== s) : [...filters.statuses, s] })

  const toggleYear = (y: number) =>
    onChange({ ...filters, years: filters.years.includes(y) ? filters.years.filter((x) => x !== y) : [...filters.years, y] })

  const activeCount =
    filters.genres.length + filters.types.length + filters.ratings.length +
    filters.statuses.length + filters.years.length + (filters.userList !== 'all' ? 1 : 0)

  const clearAll = () =>
    onChange({ ...filters, genres: [], types: [], ratings: [], statuses: [], years: [], userList: 'all' })

  return (
    <aside className="w-52 shrink-0 flex flex-col gap-1 font-body text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display font-700 text-sm text-text-base">Filters</span>
        {activeCount > 0 && (
          <button onClick={clearAll} className="flex items-center gap-0.5 text-text-muted hover:text-accent transition-colors text-xs">
            <X className="w-3 h-3" /> Clear ({activeCount})
          </button>
        )}
      </div>

      {/* User List */}
      <Section label="My List" open={openSections.userList} onToggle={() => toggle('userList')}>
        {(['all', 'watchlist', 'finished'] as const).map((v) => (
          <Checkbox
            key={v}
            checked={filters.userList === v}
            label={v === 'all' ? 'All Anime' : v === 'watchlist' ? 'Watchlist' : 'Finished Watching'}
            onChange={() => onChange({ ...filters, userList: v })}
          />
        ))}
      </Section>

      {/* Genres */}
      <Section label="Genre" open={openSections.genres} onToggle={() => toggle('genres')}>
        <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-0.5">
          {GENRES.map((g, i) => (
            <Checkbox
              key={`${g.id}-${i}`}
              checked={filters.genres.includes(g.id)}
              label={g.name}
              onChange={() => toggleGenre(g.id)}
            />
          ))}
        </div>
      </Section>

      {/* Type */}
      <Section label="Type" open={openSections.types} onToggle={() => toggle('types')}>
        {ANIME_TYPES.map((t) => (
          <Checkbox key={t} checked={filters.types.includes(t)} label={t} onChange={() => toggleType(t)} />
        ))}
      </Section>

      {/* Rating */}
      <Section label="Rating" open={openSections.ratings} onToggle={() => toggle('ratings')}>
        {ANIME_RATINGS.map((r) => (
          <Checkbox key={r.value} checked={filters.ratings.includes(r.value)} label={r.label} onChange={() => toggleRating(r.value)} />
        ))}
      </Section>

      {/* Status */}
      <Section label="Status" open={openSections.statuses} onToggle={() => toggle('statuses')}>
        {ANIME_STATUSES.map((s) => (
          <Checkbox key={s.value} checked={filters.statuses.includes(s.value)} label={s.label} onChange={() => toggleStatus(s.value)} />
        ))}
      </Section>

      {/* Year */}
      <Section label="Year" open={openSections.years} onToggle={() => toggle('years')}>
        <div className="max-h-40 overflow-y-auto pr-1 flex flex-col gap-0.5">
          {YEARS.map((y) => (
            <Checkbox key={y} checked={filters.years.includes(y)} label={String(y)} onChange={() => toggleYear(y)} />
          ))}
        </div>
      </Section>
    </aside>
  )
}

function Section({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface hover:bg-card transition-colors"
      >
        <span className="font-display font-700 text-xs text-text-base uppercase tracking-wider">{label}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
      </button>
      {open && (
        <div className="px-3 py-2 bg-card flex flex-col gap-0.5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

// ✅ Fixed: label has onClick so clicking anywhere on the row fires onChange
function Checkbox({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <label
      className="flex items-center gap-2 py-0.5 cursor-pointer group select-none"
      onClick={(e) => { e.preventDefault(); onChange() }}
    >
      <div className={clsx(
        'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all',
        checked ? 'bg-accent border-accent' : 'border-white/20 group-hover:border-white/40'
      )}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className={clsx('text-[11px] transition-colors leading-tight', checked ? 'text-accent font-600' : 'text-text-muted group-hover:text-text-base')}>
        {label}
      </span>
    </label>
  )
}
