import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star, TrendingUp, Calendar, Info } from 'lucide-react'
import { Anime } from '../types'
import { fetchTopAnime, fetchBrowseAnime, fetchUpcomingAnime, fetchTopByGenres, getImageUrl } from '../api/jikan'
import { useStore } from '../store/useStore'
import AnimeCard from '../components/AnimeCard'
import GenreFilter from '../components/GenreFilter'
import { CardSkeleton, GridSkeleton } from '../components/Skeleton'

export default function Home() {
  const [top10, setTop10]           = useState<Anime[]>([])
  const [genreAnime, setGenreAnime] = useState<Anime[]>([])
  const [browseAnime, setBrowseAnime] = useState<Anime[]>([])
  const [upcoming, setUpcoming]     = useState<Anime[]>([])
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [heroIdx, setHeroIdx]       = useState(0)
  const [loadingTop, setLoadingTop] = useState(true)
  const [loadingGenre, setLoadingGenre] = useState(false)
  const [loadingBrowse, setLoadingBrowse] = useState(true)
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)
  const genreReqRef = useRef(0)
  const heroTimer   = useRef<ReturnType<typeof setInterval>>()
  const cacheAnimes = useStore(s => s.cacheAnimes)

  useEffect(() => {
    fetchTopAnime(1, 10)
      .then(r => { const d = r.data || []; setTop10(d); cacheAnimes(d) })
      .catch(() => {}).finally(() => setLoadingTop(false))
    fetchBrowseAnime(1, 14)
      .then(r => { const d = (r.data || []).slice(0, 12); setBrowseAnime(d); cacheAnimes(d) })
      .catch(() => {}).finally(() => setLoadingBrowse(false))
    fetchUpcomingAnime(1, 14)
      .then(r => { const d = (r.data || []).slice(0, 12); setUpcoming(d); cacheAnimes(d) })
      .catch(() => {}).finally(() => setLoadingUpcoming(false))
  }, [])

  // Hero rotates through browse anime every 10s
  const heroAnime   = browseAnime.slice(0, 8)
  const currentHero = heroAnime[heroIdx] ?? null

  useEffect(() => {
    if (heroAnime.length < 2) return
    heroTimer.current = setInterval(() => setHeroIdx(i => (i + 1) % heroAnime.length), 10000)
    return () => clearInterval(heroTimer.current)
  }, [heroAnime.length])

  const jumpHero = (i: number) => { clearInterval(heroTimer.current); setHeroIdx(i) }

  // Genre filter via API
  useEffect(() => {
    if (!selectedGenres.length) { setGenreAnime([]); return }
    const rid = ++genreReqRef.current
    setLoadingGenre(true)
    fetchTopByGenres(selectedGenres, 10)
      .then(d => { if (rid !== genreReqRef.current) return; setGenreAnime(d); cacheAnimes(d) })
      .catch(() => {}).finally(() => { if (rid === genreReqRef.current) setLoadingGenre(false) })
  }, [selectedGenres])

  const displayAnime   = selectedGenres.length > 0 ? genreAnime : top10
  const displayLoading = selectedGenres.length > 0 ? loadingGenre : loadingTop

  return (
    <main className="min-h-screen bg-bg">

      {/* ── Hero — Image-1 style cinematic banner ────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/[0.06]" style={{ minHeight: 420 }}>

        {/* Anime artwork fills right portion of the banner */}
        {currentHero && (
          <div key={currentHero.mal_id} className="absolute right-0 top-0 bottom-0 hero-fade" style={{ width: '62%' }}>
            <img
              src={getImageUrl(currentHero, 'large')}
              alt=""
              className="w-full h-full object-cover object-top"
            />
            {/* Gradient from left so text is always readable */}
            <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/75 to-transparent" />
            {/* Vignette at top */}
            <div className="absolute inset-0 bg-gradient-to-b from-bg/50 via-transparent to-bg/30" />
          </div>
        )}

        {/* Overall dark gradient background — keeps left side always dark */}
        <div className="absolute inset-0 bg-gradient-to-br from-bg via-[#0c0d18] to-bg/80 pointer-events-none" />

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 flex items-center" style={{ minHeight: 420 }}>
          <div className="max-w-xl py-14">

            {/* "Your Anime Universe" badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/35 bg-accent/12 text-accent text-xs font-display font-600 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Your Anime Universe
            </div>

            {/* App tagline */}
            <h1 className="font-display font-700 text-4xl sm:text-5xl text-text-base leading-tight mb-4">
              Discover Anime.<br />
              <span className="text-accent">Rank Your Favorites.</span>
            </h1>

            {/* Current anime info */}
            {currentHero && !loadingBrowse ? (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                  <span className="text-[10px] font-display font-600 text-text-muted uppercase tracking-widest">Airing Now</span>
                </div>
                <p className="font-display font-600 text-lg text-text-base leading-snug mb-2">
                  {currentHero.title_english || currentHero.title}
                </p>
                {currentHero.synopsis && (
                  <p className="text-text-muted text-sm leading-relaxed line-clamp-2">
                    {currentHero.synopsis.replace(/\[Written by MAL Rewrite\]/gi, '').trim()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-text-muted text-sm leading-relaxed mb-6 max-w-md">
                Browse thousands of titles, curate your watchlist, and build the definitive tier list.
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {currentHero ? (
                <Link
                  to={`/anime/${currentHero.mal_id}`}
                  className="btn-accent px-5 py-2.5 rounded-xl text-sm inline-flex items-center gap-1.5"
                >
                  <Info className="w-4 h-4" /> See Information
                </Link>
              ) : null}
              <Link to="/catalog" className="btn-ghost px-5 py-2.5 rounded-xl text-sm inline-flex items-center gap-1.5">
                Browse Catalog <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Dot indicators */}
            {heroAnime.length > 1 && (
              <div className="flex gap-1.5 mt-6">
                {heroAnime.map((_, i) => (
                  <button key={i} onClick={() => jumpHero(i)}
                    className={`rounded-full transition-all duration-300 ${i === heroIdx ? 'w-5 h-1.5 bg-accent' : 'w-1.5 h-1.5 bg-white/25 hover:bg-white/50'}`}
                    style={{ outline: 'none' }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Top 10 / Top by genre ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-1">
          <Star className="w-5 h-5 text-accent fill-accent" />
          <h2 className="font-display font-700 text-xl text-text-base">
            {selectedGenres.length === 0 ? 'Top 10 Anime of All Time' : 'Top Anime · Filtered by Genre'}
          </h2>
        </div>
        <p className="text-text-muted text-sm mb-4">
          {selectedGenres.length === 0 ? 'Ranked by MAL score' : 'Highest-rated for selected genre(s)'}
        </p>

        <div className="mb-6">
          <GenreFilter selected={selectedGenres} onChange={setSelectedGenres} />
        </div>

        {displayLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : displayAnime.length === 0 ? (
          <p className="text-center py-12 text-text-muted text-sm">No results for the selected genre(s).</p>
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

      {/* ── Browse Anime ─────────────────────────────────────────────── */}
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
            {browseAnime.map(a => <AnimeCard key={a.mal_id} anime={a} showStatus />)}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link to="/browse" className="btn-accent px-6 py-2.5 rounded-xl text-sm inline-flex items-center gap-1.5">
            View More <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Upcoming Anime ───────────────────────────────────────────── */}
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
            {upcoming.map(a => <AnimeCard key={a.mal_id} anime={a} isUpcoming />)}
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
