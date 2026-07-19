import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { FilterState, GENRES, ANIME_TYPES, ANIME_RATINGS, ANIME_STATUSES } from '../types'
import clsx from 'clsx'

interface Props { filters: FilterState; onChange: (f: FilterState) => void }

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 1959 }, (_, i) => currentYear - i)

type S3 = 'none' | 'include' | 'exclude'

function getS<T>(val: T, inc: T[], exc: T[]): S3 {
  return inc.includes(val) ? 'include' : exc.includes(val) ? 'exclude' : 'none'
}
function cycleArr<T>(val: T, inc: T[], exc: T[]): { inc: T[]; exc: T[] } {
  const s = getS(val, inc, exc)
  if (s === 'none')    return { inc: [...inc, val], exc }
  if (s === 'include') return { inc: inc.filter(x => x !== val), exc: [...exc, val] }
  return { inc, exc: exc.filter(x => x !== val) }
}

export default function FilterPanel({ filters, onChange }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    userList: true, genres: true, types: false, ratings: false, statuses: false, years: false,
  })
  const sec = (k: string) => setOpen(s => ({ ...s, [k]: !s[k] }))

  const cycleList = (v: 'watchlist' | 'finished') => {
    const r = cycleArr(v, filters.listInclude || [], filters.listExclude || [])
    onChange({ ...filters, listInclude: r.inc, listExclude: r.exc })
  }
  const cycleGenre  = (id: number) => { const r = cycleArr(id, filters.genres,   filters.excludeGenres   || []); onChange({ ...filters, genres:   r.inc, excludeGenres:   r.exc }) }
  const cycleType   = (t: string)  => { const r = cycleArr(t,  filters.types,    filters.excludeTypes    || []); onChange({ ...filters, types:    r.inc, excludeTypes:    r.exc }) }
  const cycleRating = (v: string)  => { const r = cycleArr(v,  filters.ratings,  filters.excludeRatings  || []); onChange({ ...filters, ratings:  r.inc, excludeRatings:  r.exc }) }
  const cycleStatus = (v: string)  => { const r = cycleArr(v,  filters.statuses, filters.excludeStatuses || []); onChange({ ...filters, statuses: r.inc, excludeStatuses: r.exc }) }
  const cycleYear   = (y: number)  => { const r = cycleArr(y,  filters.years,    filters.excludeYears    || []); onChange({ ...filters, years:    r.inc, excludeYears:    r.exc }) }

  const activeCount = [
    filters.genres, filters.excludeGenres || [],
    filters.types,  filters.excludeTypes  || [],
    filters.ratings, filters.excludeRatings || [],
    filters.statuses, filters.excludeStatuses || [],
    filters.years, filters.excludeYears || [],
    filters.listInclude || [], filters.listExclude || [],
  ].reduce((s, a) => s + a.length, 0)

  const clearAll = () => onChange({
    ...filters,
    genres: [], excludeGenres: [], types: [], excludeTypes: [],
    ratings: [], excludeRatings: [], statuses: [], excludeStatuses: [],
    years: [], excludeYears: [], listInclude: [], listExclude: [],
  })

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

      <Section label="My List" open={open.userList} onToggle={() => sec('userList')}>
        <Check3 state={getS<'watchlist'|'finished'>('watchlist', filters.listInclude||[], filters.listExclude||[])} label="Watchlist"        onChange={() => cycleList('watchlist')} />
        <Check3 state={getS<'watchlist'|'finished'>('finished',  filters.listInclude||[], filters.listExclude||[])} label="Finished Watching" onChange={() => cycleList('finished')} />
      </Section>

      <Section label="Genre" open={open.genres} onToggle={() => sec('genres')}>
        <div className="max-h-52 overflow-y-auto pr-0.5 flex flex-col gap-0.5">
          {GENRES.map((g, i) => (
            <Check3 key={`${g.id}-${i}`}
              state={getS(g.id, filters.genres, filters.excludeGenres || [])}
              label={g.name} onChange={() => cycleGenre(g.id)} />
          ))}
        </div>
      </Section>

      <Section label="Type" open={open.types} onToggle={() => sec('types')}>
        {ANIME_TYPES.map(t => <Check3 key={t} state={getS(t, filters.types, filters.excludeTypes||[])} label={t} onChange={() => cycleType(t)} />)}
      </Section>

      <Section label="Rating" open={open.ratings} onToggle={() => sec('ratings')}>
        {ANIME_RATINGS.map(r => <Check3 key={r.value} state={getS(r.value, filters.ratings, filters.excludeRatings||[])} label={r.label} onChange={() => cycleRating(r.value)} />)}
      </Section>

      <Section label="Status" open={open.statuses} onToggle={() => sec('statuses')}>
        {ANIME_STATUSES.map(s => <Check3 key={s.value} state={getS(s.value, filters.statuses, filters.excludeStatuses||[])} label={s.label} onChange={() => cycleStatus(s.value)} />)}
      </Section>

      <Section label="Year" open={open.years} onToggle={() => sec('years')}>
        <div className="max-h-40 overflow-y-auto pr-0.5 flex flex-col gap-0.5">
          {YEARS.map(y => <Check3 key={y} state={getS(y, filters.years, filters.excludeYears||[])} label={String(y)} onChange={() => cycleYear(y)} />)}
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

function Check3({ state, label, onChange }: { state: S3; label: string; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 py-0.5 cursor-pointer group select-none" onClick={e => { e.preventDefault(); onChange() }}>
      <div className={clsx('w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all',
        state === 'include' ? 'bg-accent border-accent' : state === 'exclude' ? 'bg-red-600 border-red-500' : 'border-white/20 group-hover:border-white/40')}>
        {state === 'include' && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        {state === 'exclude' && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
      </div>
      <span className={clsx('text-[11px] transition-colors leading-tight',
        state === 'include' ? 'text-accent font-600' : state === 'exclude' ? 'text-red-400 font-600 line-through' : 'text-text-muted group-hover:text-text-base')}>
        {label}
      </span>
    </label>
  )
}
