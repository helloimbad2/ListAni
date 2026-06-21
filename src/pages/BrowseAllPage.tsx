import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, TrendingUp } from 'lucide-react'
import { Anime } from '../types'
import { fetchBrowseAnime } from '../api/jikan'
import { useStore } from '../store/useStore'
import AnimeCard from '../components/AnimeCard'
import { GridSkeleton } from '../components/Skeleton'

export default function BrowseAllPage() {
  const [anime, setAnime] = useState<Anime[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const cacheAnimes = useStore((s) => s.cacheAnimes)

  const load = async (p: number) => {
    setLoading(true)
    try {
      const res = await fetchBrowseAnime(p, 24)
      const data = res.data || []
      cacheAnimes(data)
      setAnime((prev) => {
        const combined = p === 1 ? data : [...prev, ...data];
        // FIXED: State deduplication so React keys don't duplicate when loading more
        return Array.from(new Map(combined.map(item => [item.mal_id, item])).values());
      })
      setHasMore(res.pagination?.has_next_page ?? false)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    load(next)
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="text-text-muted hover:text-text-base transition-colors focus:outline-none">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <TrendingUp className="w-5 h-5 text-accent" />
          <div>
            <h1 className="font-display font-700 text-2xl text-text-base">Browse Anime</h1>
            <p className="text-text-muted text-sm">Currently airing · Sorted by popularity</p>
          </div>
        </div>

        {loading && anime.length === 0 ? (
          <GridSkeleton count={24} />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {anime.map((a) => (
                <AnimeCard key={a.mal_id} anime={a} showStatus />
              ))}
            </div>
            {loading && <div className="mt-6"><GridSkeleton count={12} /></div>}
            {!loading && hasMore && (
              <div className="mt-8 text-center">
                <button onClick={loadMore} className="btn-accent px-6 py-2.5 rounded-xl text-sm focus:outline-none">
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}