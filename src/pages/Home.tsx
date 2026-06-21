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

  useEffect(() => {
    fetchTopAnime(1, 10).then((res) => {
      const data = res.data || []
      cacheAnimes(data)
      setTop10(data)
      setGenreAnime(data)
    }).finally(() => setLoadingTop(false))

    // FIXED: Limits accurately set to 12
    fetchBrowseAnime(1, 12).then((res) => {
      const data = res.data || []
      cacheAnimes(data)
      setBrowseAnime(data)
    }).finally(() => setLoadingBrowse(false))

    fetchUpcomingAnime(1, 12).then((res) => {
      const data = res.data || []
      cacheAnimes(data)
      setUpcoming(data)
    }).finally(() => setLoadingUpcoming(false))
  }, [])

  // FIXED: Rotates top airing anime every 6 seconds!
  useEffect(() => {
    if (browseAnime.length > 0) {
      setSpotlight(browseAnime[0])
      let idx = 0
      const interval = setInterval(() => {
        idx = (idx + 1) % Math.min(browseAnime.length, 5)
        setSpotlight(browseAnime[idx])
      }, 6000)
      return () => clearInterval(interval)
    }
  }, [browseAnime])

  useEffect(() => {
    if (selectedGenres.length === 0) {
      setGenreAnime(top10)
      return
    }
    const reqId = ++genreReqRef.current
    setLoadingGenre(true)
    fetchTopByGenres(selectedGenres, 10).then((data) => {
      if (reqId === genreReqRef.current) {
        cacheAnimes(data)
        setGenreAnime(data)
        setLoadingGenre(false)
      }
    }).catch(() => {
      if (reqId === genreReqRef.current) setLoadingGenre(false)
    })
  }, [selectedGenres, top10])

  const heroImg = spotlight ? getImageUrl(spotlight, 'large') : ''

  return (
    <div className="min-h-screen bg-bg">
      {/* Spotlight Header */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32 min-h-[400px]">
        {spotlight && (
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center opacity-30 blur-3xl scale-110 transition-all duration-1000"
            style={{ backgroundImage: `url(${heroImg})` }}
          />
        )}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-bg/40 via-bg/80 to-bg" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 flex flex-col items-center text-center">
          <h1 className="font-display font-700 text-4xl sm:text-5xl text-text-base leading-tight mb-3">
            Discover Anime.<br />
            <span className="text-accent">Rank Your Favorites.</span>
          </h1>
          <p className="max-w-xl text-text-muted text-base sm:text-lg mb-8">
            Explore the top-rated catalog, save your watchlist, and organize your ultimate tier list.
          </p>
          <Link to="/catalog" className="btn-accent px-8 py-3 rounded-xl text-sm shadow-[0_0_40px_rgba(232,99,10,0.4)]">
            Browse Catalog
          </Link>

          {spotlight && (
            <div className="mt-8 animate-fade-in flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-2xl p-2 pr-5 cursor-pointer hover:bg-white/[0.06] transition-colors" onClick={() => window.location.href = `/anime/${spotlight.mal_id}`}>
              <img src={getImageUrl(spotlight, 'small')} alt="" className="w-10 h-10 object-cover rounded-xl" />
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-wider text-accent font-700 font-display">Top Airing Right Now</div>
                <div className="text-sm font-600 text-text-base line-clamp-1">{spotlight.title_english || spotlight.title}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Top 10 Section */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 shrink-0">
            <Star className="w-5 h-5 text-accent fill-accent" />
            <div>
              <h2 className="font-display font-700 text-xl text-text-base">Top 10 Anime</h2>
              <p className="text-text-muted text-sm">Highest rated of all time</p>
            </div>
          </div>
          <div className="w-full md:w-auto overflow-hidden">
            <GenreFilter selected={selectedGenres} onChange={setSelectedGenres} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {(loadingTop || loadingGenre)
            ? Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)
            : genreAnime.map((a, i) => <AnimeCard key={a.mal_id} anime={a} rank={i + 1} />)
          }
        </div>
      </section>

      {/* Browse Airing */}
      <section className="max-w-7xl mx-auto px-4 py-10 border-t border-white/[0.06]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-accent" />
            <div>
              <h2 className="font-display font-700 text-xl text-text-base">Browse Anime</h2>
              <p className="text-text-muted text-sm">Currently airing favorites</p>
            </div>
          </div>
          <Link to="/browse" className="btn-ghost px-4 py-2 rounded-xl text-sm inline-flex items-center gap-1.5 focus:outline-none">
            View More <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {loadingBrowse ? <GridSkeleton count={12} /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {browseAnime.map((a) => <AnimeCard key={a.mal_id} anime={a} showStatus />)}
          </div>
        )}
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
          <Link to="/upcoming" className="btn-ghost px-4 py-2 rounded-xl text-sm inline-flex items-center gap-1.5 focus:outline-none">
            View More <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {loadingUpcoming ? <GridSkeleton count={12} /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {upcoming.map((a) => <AnimeCard key={a.mal_id} anime={a} isUpcoming />)}
          </div>
        )}
      </section>
    </div>
  )
}