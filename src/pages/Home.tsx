import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star, TrendingUp, Calendar, Zap } from 'lucide-react'
import { Anime, getAllGenreIds } from '../types'
import { fetchTopAnime, fetchBrowseAnime, fetchUpcomingAnime, getImageUrl } from '../api/jikan'
import { useStore } from '../store/useStore'
import AnimeCard from '../components/AnimeCard'
import GenreFilter from '../components/GenreFilter'
import { CardSkeleton, GridSkeleton } from '../components/Skeleton'

export default function Home() {
  const [top10, setTop10] = useState<Anime[]>([])
  const [browseAnime, setBrowseAnime] = useState<Anime[]>([])
  const [upcoming, setUpcoming] = useState<Anime[]>([])
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [loadingTop, setLoadingTop] = useState(true)
  const [loadingBrowse, setLoadingBrowse] = useState(true)
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const [spotlight, setSpotlight] = useState<Anime | null>(null)

  const cacheAnimes = useStore((s) => s.cacheAnimes)

  useEffect(() => {
    fetchTopAnime(1, 10).then((res) => {
      const data = res.data || []
      setTop10(data)
      cacheAnimes(data)
      if (data.length) setSpotlight(data[0])
    }).catch(() => {}).finally(() => setLoadingTop(false))

    fetchBrowseAnime(1, 12).then((res) => {
      setBrowseAnime(res.data || [])
      cacheAnimes(res.data || [])
    }).catch(() => {}).finally(() => setLoadingBrowse(false))

    fetchUpcomingAnime(1, 12).then((res) => {
      setUpcoming(res.data || [])
      cacheAnimes(res.data || [])
    }).catch(() => {}).finally(() => setLoadingUpcoming(false))
  }, [])

  // FIX: check genres + themes + demographics
  const filteredTop10 = selectedGenres.length === 0
    ? top10
    : top10.filter((a) => getAllGenreIds(a).some((id) => selectedGenres.includes(id)))

  return (
    <main className="min-h-screen bg-bg">
      {/* Spotlight Hero */}
      <section className="relative overflow-hidden min-h-[380px] flex items-end">
        {/* Background image blur */}
        {spotlight && (
          <div className="absolute inset-0">
            <img
              src={getImageUrl(spotlight, 'large')}
              alt=""
              className="w-full h-full object-cover opacity-20 blur-xl scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-bg/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-bg/80 to-transparent" />
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-4 py-14 w-full flex items-end gap-8">
          {/* Poster thumbnail */}
          {spotlight && (
            <Link to={`/anime/${spotlight.mal_id}`} className="hidden md:block shrink-0 group">
              <div className="w-32 rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 group-hover:scale-105 transition-transform">
                <img src={getImageUrl(spotlight, 'large')} alt={spotlight.title_english || spotlight.title}
                  className="w-full object-contain bg-[#0a0b12]" />
              </div>
            </Link>
          )}

          <div className="flex-1">
            {spotlight && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-display font-600 mb-3">
                <Star className="w-3 h-3 fill-accent" /> #1 Rated Anime
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
              <Link to="/tierlist" className="btn-ghost px-5 py-2.5 rounded-xl text-sm inline-flex items-center gap-1.5">
                Build Tier List <Trophy className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Top 10 */}
      <section className="max-w-7xl mx-auto px-4 py-10 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 mb-1">
          <Star className="w-5 h-5 text-accent fill-accent" />
          <h2 className="font-display font-700 text-xl text-text-base">Top 10 Anime of All Time</h2>
        </div>
        <p className="text-text-muted text-sm mb-5">Ranked by MAL score · Filter by genre</p>

        <div className="mb-6">
          <GenreFilter selected={selectedGenres} onChange={setSelectedGenres} />
        </div>

        {loadingTop ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredTop10.map((anime, i) => (
              <div key={anime.mal_id} className="relative">
                <span className="rank-number">{String(i + 1).padStart(2, '0')}</span>
                <AnimeCard anime={anime} rank={i + 1} />
              </div>
            ))}
            {filteredTop10.length === 0 && (
              <div className="col-span-full text-center py-16 text-text-muted text-sm">
                No anime in the top 10 match the selected genre filter.
              </div>
            )}
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
            {browseAnime.map((anime) => <AnimeCard key={anime.mal_id} anime={anime} showStatus />)}
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
            {upcoming.map((anime) => <AnimeCard key={anime.mal_id} anime={anime} isUpcoming />)}
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

function Trophy({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
}
