import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star, TrendingUp, Calendar } from 'lucide-react'
import { Anime } from '../types'
import { fetchTopAnime, fetchBrowseAnime, fetchUpcomingAnime, fetchTopByGenres, getImageUrl } from '../api/jikan'
import { useStore } from '../store/useStore'
import AnimeCard from '../components/AnimeCard'
import GenreFilter from '../components/GenreFilter'
import { CardSkeleton, GridSkeleton } from '../components/Skeleton'

export default function Home() {
  const [top10, setTop10] = useState<Anime[]>([])
  const [genreAnime, setGenreAnime] = useState<Anime[]>([])
  const [browseAnime, setBrowseAnime] = useState<Anime[]>([])
  const [upcoming, setUpcoming] = useState<Anime[]>([])
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [spotlight, setSpotlight] = useState<Anime | null>(null)
  const [loadingTop, setLoadingTop] = useState(true)
  const [loadingGenre, setLoadingGenre] = useState(false)
  const [loadingBrowse, setLoadingBrowse] = useState(true)
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const genreReqRef = useRef(0)
  const cacheAnimes = useStore((s) => s.cacheAnimes)

  // Load global top 10 + browse + upcoming on mount
  useEffect(() => {
    fetchTopAnime(1, 10).then((res) => {
      const data = res.data || []
      setTop10(data); cacheAnimes(data)
      if (data.length) setSpotlight(data[0])
    }).catch(() => {}).finally(() => setLoadingTop(false))

    fetchBrowseAnime(1, 12).then((res) => {
      setBrowseAnime(res.data || []); cacheAnimes(res.data || [])
    }).catch(() => {}).finally(() => setLoadingBrowse(false))

    fetchUpcomingAnime(1, 12).then((res) => {
      setUpcoming(res.data || []); cacheAnimes(res.data || [])
    }).catch(() => {}).finally(() => setLoadingUpcoming(false))
  }, [])

  // When a genre is selected → fetch top anime FOR that genre from the API
  // This is the correct approach — client-side filtering from global top 10
  // misses anime that are #1 in a genre but not in the global top 10
  useEffect(() => {
    if (selectedGenres.length === 0) { setGenreAnime([]); return }

    const reqId = ++genreReqRef.current
    setLoadingGenre(true)
    fetchTopByGenres(selectedGenres, 10).then((data) => {
      if (reqId !== genreReqRef.current) return // stale
      setGenreAnime(data); cacheAnimes(data)
    }).catch(() => {}).finally(() => {
      if (reqId === genreReqRef.current) setLoadingGenre(false)
    })
  }, [selectedGenres])

  // What to show in the top section
  const displayAnime = selectedGenres.length > 0 ? genreAnime : top10
  const displayLoading = selectedGenres.length > 0 ? loadingGenre : loadingTop

  return (
    <main className="min-h-screen bg-bg">
      {/* Spotlight hero */}
      <section className="relative overflow-hidden min-h-[340px] flex items-end border-b border-white/[0.06]">
        {spotlight && (
          <div className="absolute inset-0 pointer-events-none">
            <img src={getImageUrl(spotlight, 'large')} alt=""
              className="w-full h-full object-cover opacity-15 blur-2xl scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/75 to-bg/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-bg/70 to-transparent" />
          </div>
        )}
        <div className="relative max-w-7xl mx-auto px-4 py-12 w-full flex items-end gap-8">
          {spotlight && (
            <Link to={`/anime/${spotlight.mal_id}`} className="hidden md:block shrink-0 group">
              <div className="w-28 rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 group-hover:scale-105 transition-transform">
                <img src={getImageUrl(spotlight, 'large')} alt={spotlight.title_english || spotlight.title}
                  className="w-full object-contain bg-[#0a0b12]" />
              </div>
            </Link>
          )}
          <div className="flex-1">
            {spotlight && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-display font-600 mb-3">
                <Star className="w-3 h-3 fill-accent" /> #1 Rated · {spotlight.title_english || spotlight.title}
              </div>
            )}
            <h1 className="font-display font-700 text-4xl sm:text-5xl text-text-base leading-tight mb-3">
              Discover Anime.<br />
              <span className="text-accent">Rank Your Favorites.</span>
            </h1>
            <p className="text-text-muted text-base leading-relaxed max-w-md">
              Browse thousands of titles, curate your watchlist, and build the definitive tier list.
            </p>
            <div className="flex gap-2 mt-5 flex-wrap">
              <Link to="/catalog" className="btn-accent px-5 py-2.5 rounded-xl text-sm inline-flex items-center gap-1.5">
                Browse Catalog <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/tierlist" className="btn-ghost px-5 py-2.5 rounded-xl text-sm">Build Tier List</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Top 10 / Top by genre */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-1">
          <Star className="w-5 h-5 text-accent fill-accent" />
          <h2 className="font-display font-700 text-xl text-text-base">
            {selectedGenres.length === 0 ? 'Top 10 Anime of All Time' : `Top Anime · Filtered by Genre`}
          </h2>
        </div>
        <p className="text-text-muted text-sm mb-5">
          {selectedGenres.length === 0
            ? 'Ranked by MAL score · Select a genre to filter'
            : 'Highest-rated anime matching your selected genre(s)'}
        </p>

        <div className="mb-6">
          <GenreFilter selected={selectedGenres} onChange={setSelectedGenres} />
        </div>

        {displayLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : displayAnime.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-sm">
            No results found for the selected genre(s).
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {displayAnime.map((anime, i) => (
              <div key={anime.mal_id} className="relative">
                <span className="rank-number">{String(i + 1).padStart(2, '0')}</span>
                <AnimeCard anime={anime} rank={i + 1} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Browse Anime */}
      <section className="max-w-7xl mx-auto px-4 py-10 border-t border-white/[0.06]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-accent" />
            <div>
              <h2 className="font-display font-700 text-xl text-text-base">Browse Anime</h2>
              <p className="text-text-muted text-sm">Currently airing · Sorted by popularity</p>
            </div>
          </div>
          <Link to="/browse" className="btn-ghost px-4 py-2 rounded-xl text-sm inline-flex items-center gap-1.5">
            View More <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {loadingBrowse ? <GridSkeleton count={12} /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {browseAnime.map((a) => <AnimeCard key={a.mal_id} anime={a} showStatus />)}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link to="/browse" className="btn-accent px-6 py-2.5 rounded-xl text-sm inline-flex items-center gap-1.5">
            View More <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Upcoming */}
      <section className="max-w-7xl mx-auto px-4 py-10 border-t border-white/[0.06] pb-16">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-accent" />
            <div>
              <h2 className="font-display font-700 text-xl text-text-base">Upcoming Anime</h2>
              <p className="text-text-muted text-sm">Coming soon this season</p>
            </div>
          </div>
          <Link to="/upcoming" className="btn-ghost px-4 py-2 rounded-xl text-sm inline-flex items-center gap-1.5">
            View More <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {loadingUpcoming ? <GridSkeleton count={12} /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {upcoming.map((a) => <AnimeCard key={a.mal_id} anime={a} isUpcoming />)}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link to="/upcoming" className="btn-accent px-6 py-2.5 rounded-xl text-sm inline-flex items-center gap-1.5">
            View More Upcoming <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </main>
  )
}
