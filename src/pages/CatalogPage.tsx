import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { Anime, FilterState, DEFAULT_FILTERS, SORT_OPTIONS, SortOption } from '../types'
import { fetchAnime, fetchTopAnime } from '../api/jikan'
import { useStore } from '../store/useStore'
import AnimeCard from '../components/AnimeCard'
import FilterPanel from '../components/FilterPanel'
import { GridSkeleton } from '../components/Skeleton'

// Translate sortBy → Jikan order_by / sort params
function sortParams(s: SortOption): { order_by?: string; sort?: string } {
  if (s === 'popularity') return { order_by: 'members',    sort: 'desc' }
  if (s === 'rating')     return { order_by: 'score',      sort: 'desc' }
  if (s === 'newest')     return { order_by: 'start_date', sort: 'desc' }
  if (s === 'oldest')     return { order_by: 'start_date', sort: 'asc'  }
  return {} // relevance — let Jikan decide (best for text search)
}

// Client-side exclusion filter for non-genre fields (Jikan has no exclude params for these)
function applyExclusions(anime: Anime[], f: FilterState): Anime[] {
  return anime.filter(a => {
    if (f.excludeTypes?.length   && f.excludeTypes.includes(a.type || ''))                           return false
    if (f.excludeRatings?.length && f.excludeRatings.some(r => (a.rating || '').toLowerCase().startsWith(r))) return false
    if (f.excludeStatuses?.length) {
      const st = a.airing ? 'airing' : a.status === 'Not yet aired' ? 'upcoming' : 'complete'
      if (f.excludeStatuses.includes(st)) return false
    }
    if (f.excludeYears?.length   && a.year && f.excludeYears.includes(a.year))                       return false
    return true
  })
}

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [anime, setAnime]       = useState<Anime[]>([])
  const [loading, setLoading]   = useState(false)
  const [page, setPage]         = useState(1)
  const [hasMore, setHasMore]   = useState(true)
  const [showFilters, setShowFilters] = useState(true)
  const [sortOpen, setSortOpen] = useState(false)
  const [filters, setFilters]   = useState<FilterState>({
    ...DEFAULT_FILTERS,
    query: searchParams.get('q') || '',
  })
  const debounceRef  = useRef<ReturnType<typeof setTimeout>>()
  const cacheAnimes  = useStore(s => s.cacheAnimes)
  const watchlist    = useStore(s => s.watchlist)
  const finished     = useStore(s => s.finished)
  const animeCache   = useStore(s => s.animeCache)

  const hasAPIFilter = (f: FilterState) =>
    !!(f.query || f.genres.length || (f.excludeGenres?.length || 0) ||
       f.types.length || f.ratings.length || f.statuses.length || f.years.length)

  const load = useCallback(async (f: FilterState, p: number) => {
    setLoading(true)
    try {
      let res
      if (!hasAPIFilter(f)) {
        // No filter at all — show top anime ordered by chosen sort
        const sp = sortParams(f.sortBy)
        res = await fetchTopAnime(p, 25)
        // Re-sort client-side for options that top anime doesn't support
        if (f.sortBy === 'newest') res = { ...res, data: [...res.data].sort((a, b) => (b.year || 0) - (a.year || 0)) }
        if (f.sortBy === 'oldest') res = { ...res, data: [...res.data].sort((a, b) => (a.year || 0) - (b.year || 0)) }
      } else {
        const sp = sortParams(f.sortBy)
        res = await fetchAnime({ ...f, page: p, limit: 25, ...sp })
      }
      const raw  = res.data || []
      const data = applyExclusions(raw, f)
      cacheAnimes(raw)
      setAnime(prev => p === 1 ? data : [...prev, ...data])
      setHasMore(res.pagination?.has_next_page ?? false)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [cacheAnimes])

  useEffect(() => {
    const q = searchParams.get('q') || ''
    setFilters(prev => ({ ...prev, query: q }))
  }, [searchParams])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setPage(1); setAnime([]); load(filters, 1) }, filters.query ? 500 : 0)
    return () => clearTimeout(debounceRef.current)
  }, [filters, load])

  const handleFilterChange = (f: FilterState) => {
    setFilters(f)
    if (f.query !== filters.query) setSearchParams(f.query ? { q: f.query } : {})
  }

  const handleSort = (s: SortOption) => { setSortOpen(false); handleFilterChange({ ...filters, sortBy: s }) }

  const loadMore = () => { const next = page + 1; setPage(next); load(filters, next) }

  // userList client-side filter
  const displayAnime = anime.filter(a => {
    if (filters.userList === 'watchlist') return watchlist.includes(a.mal_id)
    if (filters.userList === 'finished')  return finished.includes(a.mal_id)
    return true
  })
  const listAnime = filters.userList !== 'all' && displayAnime.length === 0 && !loading
    ? applyExclusions(
        Object.values(animeCache).filter(a =>
          filters.userList === 'watchlist' ? watchlist.includes(a.mal_id) : finished.includes(a.mal_id)
        ),
        filters
      )
    : displayAnime

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === filters.sortBy)?.label ?? 'Sort'

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <h1 className="font-display font-700 text-2xl text-text-base">Catalog</h1>
          <span className="text-text-muted text-sm">Browse & filter all anime</span>
        </div>

        {/* Search + Sort row */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              value={filters.query}
              onChange={e => handleFilterChange({ ...filters, query: e.target.value })}
              placeholder="Search by title, genre, studio..."
              className="w-full bg-surface border border-white/[0.07] rounded-xl pl-9 pr-9 py-2.5 text-sm text-text-base placeholder:text-text-muted focus:border-accent/50 transition-all"
              style={{ outline: 'none' }}
            />
            {filters.query && (
              <button onClick={() => handleFilterChange({ ...filters, query: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setSortOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-surface border border-white/[0.07] rounded-xl text-sm text-text-muted hover:border-white/[0.15] hover:text-text-base transition-all font-display font-600"
              style={{ outline: 'none' }}
            >
              {currentSortLabel} <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {sortOpen && (
              <div className="absolute top-full right-0 mt-1 bg-card border border-white/[0.1] rounded-xl shadow-xl z-20 py-1 min-w-[140px] animate-fade-in">
                {SORT_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => handleSort(o.value)}
                    className={`w-full text-left px-3 py-2 text-xs font-display font-600 transition-colors ${
                      filters.sortBy === o.value ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-base hover:bg-white/[0.04]'
                    }`}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button className="md:hidden flex items-center gap-2 btn-ghost px-3 py-2 rounded-xl text-sm mb-4"
          onClick={() => setShowFilters(s => !s)} style={{ outline: 'none' }}>
          <SlidersHorizontal className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        <div className="flex gap-6">
          {showFilters && (
            <div className="shrink-0">
              <FilterPanel filters={filters} onChange={handleFilterChange} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {!loading && (
              <p className="text-text-muted text-xs mb-4">
                {filters.userList !== 'all'
                  ? `${listAnime.length} anime in your ${filters.userList}`
                  : `Showing results${filters.query ? ` for "${filters.query}"` : ''}`}
              </p>
            )}

            {loading && anime.length === 0 ? (
              <GridSkeleton count={25} />
            ) : listAnime.length === 0 ? (
              <div className="flex flex-col items-center py-24 text-center">
                <p className="font-display font-600 text-text-base mb-1">No anime found</p>
                <p className="text-text-muted text-sm">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {listAnime.map(a => <AnimeCard key={a.mal_id} anime={a} showStatus />)}
                </div>
                {filters.userList === 'all' && hasMore && !loading && (
                  <div className="mt-8 flex justify-center">
                    <button onClick={loadMore} className="btn-accent px-6 py-2.5 rounded-xl text-sm" style={{ outline: 'none' }}>Load More</button>
                  </div>
                )}
                {loading && anime.length > 0 && <div className="mt-8"><GridSkeleton count={6} /></div>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
