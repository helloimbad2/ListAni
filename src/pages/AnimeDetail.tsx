import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Star, Calendar, Tv, Clock, Users, Heart, Bookmark, Check, ChevronLeft, ExternalLink, Award, Layers } from 'lucide-react'
import { Anime } from '../types'
import { fetchAnimeById, fetchSimilarAnime, getImageUrl, formatAired } from '../api/jikan'
import { useStore } from '../store/useStore'
import AnimeCard from '../components/AnimeCard'
import { Spinner } from '../components/Skeleton'
import clsx from 'clsx'

export default function AnimeDetail() {
  const { id } = useParams<{ id: string }>()
  const [anime, setAnime] = useState<Anime | null>(null)
  const [similar, setSimilar] = useState<Anime[]>([])
  const [loading, setLoading] = useState(true)
  const [imgErr, setImgErr] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const watchlist = useStore((s) => s.watchlist)
  const finished = useStore((s) => s.finished)
  const toggleWatchlist = useStore((s) => s.toggleWatchlist)
  const toggleFinished = useStore((s) => s.toggleFinished)
  const addRecentlyViewed = useStore((s) => s.addRecentlyViewed)
  const animeCache = useStore((s) => s.animeCache)
  const cacheAnimes = useStore((s) => s.cacheAnimes)

  const malId = Number(id)
  const inWatchlist = watchlist.includes(malId)
  const isFinished = finished.includes(malId)
  const isUpcoming = anime?.status === 'Not yet aired'

  useEffect(() => {
    setLoading(true); setAnime(null); setImgErr(false); setExpanded(false); setSimilar([])
    if (animeCache[malId]) setAnime(animeCache[malId])

    fetchAnimeById(malId).then((res) => {
      setAnime(res.data)
      addRecentlyViewed(res.data)
      const genreIds = [...(res.data.genres || []), ...(res.data.themes || [])].map((g) => g.mal_id)
      fetchSimilarAnime(genreIds, malId, 6).then((data) => { setSimilar(data); cacheAnimes(data) }).catch(() => {})
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading && !anime) return (
    <div className="min-h-screen bg-bg flex items-center justify-center"><Spinner size="lg" /></div>
  )
  if (!anime) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-3">
      <p className="text-text-muted">Anime not found.</p>
      <Link to="/catalog" className="btn-accent px-4 py-2 rounded-xl text-sm">Back to Catalog</Link>
    </div>
  )

  const displayTitle = anime.title_english || anime.title
  const imgUrl = getImageUrl(anime, 'large')
  const synopsis = anime.synopsis?.replace(/\[Written by MAL Rewrite\]/gi, '').trim()
  const synopsisShort = synopsis && synopsis.length > 500 ? synopsis.slice(0, 500) + '...' : synopsis
  const scoreColor = anime.score ? (anime.score >= 8 ? 'text-green-400' : anime.score >= 7 ? 'text-yellow-400' : 'text-text-muted') : 'text-text-muted'

  // Score ring: 0-10 → 0-100%
  const scorePercent = anime.score ? (anime.score / 10) * 100 : 0
  const circumference = 2 * Math.PI * 20 // r=20
  const dash = (scorePercent / 100) * circumference

  return (
    <div className="min-h-screen bg-bg">
      {/* Banner blur */}
      <div className="relative h-48 overflow-hidden">
        <img src={imgUrl} alt="" className="w-full h-full object-cover opacity-25 blur-2xl scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-20 pb-16">
        <div className="mb-4">
          <Link to="/catalog" className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-base text-sm transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Catalog
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="shrink-0 flex flex-col gap-3">
            <div className="w-44 md:w-52 rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0a0b12] shadow-2xl shadow-black/60">
              {!imgErr ? (
                <img src={imgUrl} alt={displayTitle} onError={() => setImgErr(true)}
                  className="w-full object-contain block" />
              ) : (
                <div className="w-full h-72 flex items-center justify-center p-4">
                  <span className="font-display text-text-dim text-sm text-center">{displayTitle}</span>
                </div>
              )}
            </div>

            <button onClick={() => toggleWatchlist(anime)}
              className={clsx('w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-display font-600 transition-all',
                inWatchlist ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'btn-ghost')}>
              <Bookmark className={clsx('w-4 h-4', inWatchlist && 'fill-current')} />
              {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
            </button>

            {!isUpcoming && (
              <button onClick={() => toggleFinished(anime)}
                className={clsx('w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-display font-600 transition-all',
                  isFinished ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'btn-ghost')}>
                <Check className="w-4 h-4" />
                {isFinished ? 'Finished Watching' : 'Mark as Finished'}
              </button>
            )}

            {anime.url && (
              <a href={anime.url} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-display font-600 btn-ghost">
                <ExternalLink className="w-4 h-4" /> MAL Page
              </a>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {anime.status && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-display font-600 border mb-3"
                style={{
                  background: anime.airing ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                  borderColor: anime.airing ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)',
                  color: anime.airing ? '#4ade80' : '#7878a0',
                }}>
                {anime.airing && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                {anime.status}
              </div>
            )}

            <h1 className="font-display font-700 text-3xl text-text-base leading-tight mb-1">{displayTitle}</h1>
            {anime.title_japanese && <p className="text-text-muted text-sm mb-4">{anime.title_japanese}</p>}

            {/* Score row with ring */}
            <div className="flex items-center gap-5 mb-6 flex-wrap">
              {anime.score && (
                <div className="flex items-center gap-3">
                  {/* Animated score ring */}
                  <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90">
                    <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                    <circle cx="26" cy="26" r="20" fill="none"
                      stroke={anime.score >= 8 ? '#4ade80' : anime.score >= 7 ? '#facc15' : '#f97316'}
                      strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={`${dash} ${circumference}`}
                      style={{ transition: 'stroke-dasharray 1s ease' }} />
                  </svg>
                  <div>
                    <p className={`font-display font-700 text-2xl leading-none ${scoreColor}`}>{anime.score.toFixed(2)}</p>
                    {anime.scored_by && <p className="text-text-muted text-xs mt-0.5">{anime.scored_by.toLocaleString()} users</p>}
                  </div>
                </div>
              )}
              {anime.rank && (
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-accent" />
                  <span className="text-text-muted text-sm">Rank <span className="text-text-base font-600">#{anime.rank}</span></span>
                </div>
              )}
              {anime.popularity && (
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-text-muted" />
                  <span className="text-text-muted text-sm">Popularity <span className="text-text-base font-600">#{anime.popularity}</span></span>
                </div>
              )}
              {anime.favorites && (
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-text-muted" />
                  <span className="text-text-muted text-sm">{anime.favorites.toLocaleString()} favorites</span>
                </div>
              )}
            </div>

            {/* Genres */}
            {(anime.genres?.length || anime.themes?.length || anime.demographics?.length) ? (
              <div className="flex flex-wrap gap-1.5 mb-6">
                {[...(anime.genres || []), ...(anime.themes || []), ...(anime.demographics || [])].map((g) => (
                  <Link key={g.mal_id} to={`/catalog?genres=${g.mal_id}`}
                    className="genre-pill px-3 py-1 rounded-full text-xs font-600 font-display">
                    {g.name}
                  </Link>
                ))}
              </div>
            ) : null}

            {/* Metadata grid — FIXED ALIGNMENT */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
              <MetaItem icon={<Tv className="w-3.5 h-3.5" />} label="Type" value={anime.type || '—'} />
              <MetaItem icon={<Layers className="w-3.5 h-3.5" />} label="Episodes" value={anime.episodes ? String(anime.episodes) : 'Unknown'} />
              <MetaItem icon={<Calendar className="w-3.5 h-3.5" />} label="Aired" value={formatAired(anime)} />
              <MetaItem icon={<Clock className="w-3.5 h-3.5" />} label="Duration" value={anime.duration || '—'} />
              <MetaItem icon={<Star className="w-3.5 h-3.5" />} label="Rating" value={anime.rating ? anime.rating.split(' - ')[0] : '—'} />
              <MetaItem icon={<Users className="w-3.5 h-3.5" />} label="Members" value={anime.members?.toLocaleString() || '—'} />
            </div>

            {/* Studios & Producers */}
            {(anime.studios?.length || anime.producers?.length) && (
              <div className="flex flex-col gap-3 mb-6">
                {anime.studios && anime.studios.length > 0 && (
                  <div>
                    <p className="text-[10px] font-display font-600 text-text-dim uppercase tracking-wider mb-1.5">Studios</p>
                    <div className="flex flex-wrap gap-1.5">
                      {anime.studios.map((s) => (
                        <span key={s.mal_id} className="px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs text-text-base font-display font-600">{s.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {anime.producers && anime.producers.length > 0 && (
                  <div>
                    <p className="text-[10px] font-display font-600 text-text-dim uppercase tracking-wider mb-1.5">Producers</p>
                    <div className="flex flex-wrap gap-1.5">
                      {anime.producers.map((p) => (
                        <span key={p.mal_id} className="px-2.5 py-1 rounded-lg border border-white/[0.06] bg-white/[0.02] text-xs text-text-muted">{p.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Synopsis */}
            {synopsis && (
              <div>
                <p className="text-[10px] font-display font-600 text-text-dim uppercase tracking-wider mb-2">Synopsis</p>
                <p className="text-text-muted text-sm leading-relaxed">{expanded ? synopsis : synopsisShort}</p>
                {synopsis.length > 500 && (
                  <button onClick={() => setExpanded((e) => !e)} className="text-accent text-xs font-600 mt-2 hover:text-accent-light transition-colors">
                    {expanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Similar Anime */}
        {similar.length > 0 && (
          <div className="mt-12 border-t border-white/[0.06] pt-10">
            <h2 className="font-display font-700 text-lg text-text-base mb-4">You Might Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {similar.map((a) => <AnimeCard key={a.mal_id} anime={a} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-surface border border-white/[0.06]">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-text-muted shrink-0">{icon}</span>
        <p className="text-[10px] font-display font-600 text-text-dim uppercase tracking-wider leading-none">{label}</p>
      </div>
      <p className="text-sm font-display font-600 text-text-base leading-snug">{value}</p>
    </div>
  )
}
