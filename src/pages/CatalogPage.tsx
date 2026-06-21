import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { Anime, FilterState, DEFAULT_FILTERS } from '../types'
import { fetchAnime } from '../api/jikan'
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
  const [showFilters, setShowFilters] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    query: searchParams.get('q') || '',
  })
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const cacheAnimes = useStore((s) => s.cacheAnimes)
  const watchlist = useStore((s) => s.watchlist)
  const finished = useStore((s) => s.finished)

  const load = useCallback(async (f: FilterState, p: number) => {
    setLoading(true)
    try {
      const res = await fetchAnime({ ...f, page: p, limit: 25 })
      const data = res.data || []
      cacheAnimes(data)
      setAnime((prev) => {
        const combined = p === 1 ? data : [...prev, ...data];
        // FIXED: Deduplicate Array based on mal_id so React doesn't crash on overlaps
        return Array.from(new Map(combined.map(item => [item.mal_id, item])).values());
      })
      setHasMore(res.pagination?.has_next_page ?? false)
    } catch (e) {
      console.error(e)
      if (p === 1) setAnime([])
    } finally {
      setLoading(false)
    }
  }, [cacheAnimes])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      load(filters, 1)
    }, 400)
  }, [filters, load])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    load(filters, next)
  }

  const listAnime = anime.filter((a) => {
    if (filters.userList === 'watchlist') return watchlist.includes(a.mal_id) && !finished.includes(a.mal_id)
    if (filters.userList === 'finished') return finished.includes(a.mal_id)
    return true
  })

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      {/* Mobile Toggle */}
      <div className="md:hidden p-4 border-b border-white/[0.06] flex items-center justify-between">
        <h1 className="font-display font-700 text-lg">Catalog</h1>
        <button onClick={() => setShowFilters(!showFilters)} className="btn-ghost px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 focus:outline-none">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
        </button>
      </div>

      <div className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-64 shrink-0 border-r border-white/[0.06] p-4 overflow-y-auto max-h-screen sticky top-0 custom-scrollbar bg-bg/50 backdrop-blur-xl z-10`}>
        <FilterPanel filters={filters} onChange={setFilters} />
      </div>

      <div className="flex-1 p-4 md:p-6 lg:p-8 min-w-0">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-xl group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              placeholder="Search by title..."
              className="w-full bg-[#11121b] border border-white/[0.06] rounded-xl pl-10 pr-10 py-2.5 text-sm text-text-base placeholder:text-text-muted/70 focus:outline-none focus:border-accent/80 focus:bg-[#161720] focus:ring-1 focus:ring-accent/50 transition-all shadow-inner"
            />
            {filters.query && (
              <button onClick={() => setFilters({ ...filters, query: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base focus:outline-none">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {loading && page === 1 ? (
          <GridSkeleton count={25} />
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {listAnime.map((a) => (
                <AnimeCard key={a.mal_id} anime={a} showStatus />
              ))}
            </div>
            {filters.userList === 'all' && hasMore && !loading && (
              <div className="mt-8 flex justify-center">
                <button onClick={loadMore} className="btn-accent px-6 py-2.5 rounded-xl text-sm focus:outline-none">
                  Load More
                </button>
              </div>
            )}
            {loading && anime.length > 0 && (
              <div className="mt-8">
                <GridSkeleton count={12} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}