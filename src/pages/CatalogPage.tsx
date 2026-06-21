import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { Anime, FilterState, DEFAULT_FILTERS } from '../types'
import { fetchAnime, fetchTopAnime } from '../api/jikan'
import { useStore } from '../store/useStore'
import AnimeCard from '../components/AnimeCard'
import FilterPanel from '../components/FilterPanel'
import { GridSkeleton } from '../components/Skeleton'

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [anime, setAnime] = useState<Anime[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    query: searchParams.get('q') || '',
  })
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const cacheAnimes = useStore((s) => s.cacheAnimes)
  const watchlist = useStore((s) => s.watchlist)
  const finished = useStore((s) => s.finished)
  const animeCache = useStore((s) => s.animeCache)

  const load = useCallback(async (f: FilterState, p: number) => {
    setLoading(true)
    try {
      let res
      if (!f.query && !f.genres.length && !f.types.length && !f.ratings.length && !f.statuses.length && !f.years.length) {
        res = await fetchTopAnime(p, 24)
      } else {
        res = await fetchAnime({ ...f, page: p, limit: 24, order_by: 'popularity', sort: 'asc' })
      }
      const data = res.data || []
      cacheAnimes(data)
      setAnime(p === 1 ? data : (prev) => [...prev, ...data])
      setHasMore(res.pagination?.has_next_page ?? false)
      setTotalPages(res.pagination?.last_visible_page ?? 1)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [cacheAnimes])

  // Reset and reload when filters change
  useEffect(() => {
    clearTimeout(debounceRef.current)
    const delay = filters.query ? 500 : 0
    debounceRef.current = setTimeout(() => {
      setPage(1)
      setAnime([])
      load(filters, 1)
    }, delay)
    return () => clearTimeout(debounceRef.current)
  }, [filters, load])

  // Sync search param
  useEffect(() => {
    const q = searchParams.get('q') || ''
    if (q !== filters.query) {
      setFilters((f) => ({ ...f, query: q }))
    }
  }, [searchParams])

  const handleFilterChange = (f: FilterState) => {
    setFilters(f)
    if (f.query !== filters.query) {
      setSearchParams(f.query ? { q: f.query } : {})
    }
  }

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    load(filters, next)
  }

  // Apply userList filter client-side
  const displayAnime = anime.filter((a) => {
    if (filters.userList === 'watchlist') return watchlist.includes(a.mal_id)
    if (filters.userList === 'finished') return finished.includes(a.mal_id)
    return true
  })

  // If userList filter is active but no anime fetched yet, show from cache
  const listAnime = filters.userList !== 'all' && displayAnime.length === 0 && !loading
    ? Object.values(animeCache).filter((a) => {
        if (filters.userList === 'watchlist') return watchlist.includes(a.mal_id)
        if (filters.userList === 'finished') return finished.includes(a.mal_id)
        return false
      })
    : displayAnime

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="font-display font-700 text-2xl text-text-base">Catalog</h1>
          <span className="text-text-muted text-sm">Browse & filter all anime</span>
        </div>

        {/* Search bar */}
        <div className="relative mb-5 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            value={filters.query}
            onChange={(e) => handleFilterChange({ ...filters, query: e.target.value })}
            placeholder="Search by title, genre, studio..."
            className="w-full bg-surface border border-white/[0.07] rounded-xl pl-9 pr-9 py-2.5 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all"
          />
          {filters.query && (
            <button
              onClick={() => handleFilterChange({ ...filters, query: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toggle filters on mobile */}
        <button
          className="md:hidden flex items-center gap-2 btn-ghost px-3 py-2 rounded-xl text-sm mb-4"
          onClick={() => setShowFilters((s) => !s)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        <div className="flex gap-6">
          {/* Filter sidebar */}
          {showFilters && (
            <div className="hidden md:block">
              <FilterPanel filters={filters} onChange={handleFilterChange} />
            </div>
          )}
          {showFilters && (
            <div className="md:hidden">
              <FilterPanel filters={filters} onChange={handleFilterChange} />
            </div>
          )}

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Result count */}
            {!loading && (
              <p className="text-text-muted text-xs mb-4">
                {filters.userList !== 'all'
                  ? `${listAnime.length} anime in your ${filters.userList}`
                  : `Showing results${filters.query ? ` for "${filters.query}"` : ''}`}
              </p>
            )}

            {loading && anime.length === 0 ? (
              <GridSkeleton count={24} />
            ) : listAnime.length === 0 ? (
              <div className="flex flex-col items-center py-24 text-center">
                <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-text-dim" />
                </div>
                <p className="font-display font-600 text-text-base mb-1">No anime found</p>
                <p className="text-text-muted text-sm">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {listAnime.map((a) => (
                    <AnimeCard key={a.mal_id} anime={a} showStatus />
                  ))}
                </div>

                {/* Load more */}
                {filters.userList === 'all' && hasMore && !loading && (
                  <div className="mt-8 flex justify-center">
                    <button onClick={loadMore} className="btn-accent px-6 py-2.5 rounded-xl text-sm">
                      Load More
                    </button>
                  </div>
                )}
                {loading && anime.length > 0 && (
                  <div className="mt-8">
                    <GridSkeleton count={6} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
