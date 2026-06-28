import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Check, Star } from 'lucide-react'
import { Anime } from '../types'
import { useStore } from '../store/useStore'
import { getImageUrl } from '../api/jikan'
import clsx from 'clsx'

interface Props {
  anime: Anime
  rank?: number
  showStatus?: boolean
  isUpcoming?: boolean
}

function AnimeCard({ anime, rank, showStatus = false, isUpcoming = false }: Props) {
  // Per-card selectors — only this card re-renders when ITS status changes
  const inWatchlist = useStore(s => s.watchlist.includes(anime.mal_id))
  const isFinished  = useStore(s => s.finished.includes(anime.mal_id))
  const toggleWatchlist = useStore(s => s.toggleWatchlist)
  const toggleFinished  = useStore(s => s.toggleFinished)

  const imgUrl      = getImageUrl(anime, 'large')
  const displayTitle = anime.title_english || anime.title
  const score       = anime.score

  const handleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    toggleWatchlist(anime)
  }
  const handleFinished = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!isUpcoming) toggleFinished(anime)
  }

  return (
    <Link
      to={`/anime/${anime.mal_id}`}
      className="group relative flex flex-col bg-card border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.14] hover:bg-card-hover transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40"
    >
      {/* Rank badge */}
      {rank && (
        <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-lg bg-bg/90 border border-white/[0.1] flex items-center justify-center">
          <span className="font-display font-700 text-xs text-accent">#{rank}</span>
        </div>
      )}

      {/* Score badge */}
      {score && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md score-badge">
          <Star className="w-3 h-3 text-accent fill-accent" />
          <span className="font-display font-700 text-xs text-accent">{score.toFixed(1)}</span>
        </div>
      )}

      {/* Image */}
      <div className="relative w-full aspect-[2/3] bg-[#0a0b12] overflow-hidden">
        <img
          src={imgUrl}
          alt={displayTitle}
          loading="lazy"
          decoding="async"
          className="anime-img-contain transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080811]/90 via-transparent to-transparent pointer-events-none" />

        {/* Action buttons on hover */}
        <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
          <button
            onClick={handleWatchlist}
            title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-600 font-display transition-all',
              inWatchlist
                ? 'bg-accent text-white'
                : 'bg-bg/90 border border-white/20 text-text-base hover:bg-accent/20 hover:border-accent/40'
            )}
          >
            <Bookmark className={clsx('w-3 h-3', inWatchlist && 'fill-current')} />
            {inWatchlist ? 'Watchlist' : '+ Watch'}
          </button>

          {!isUpcoming && (
            <button
              onClick={handleFinished}
              title={isFinished ? 'Remove from Finished' : 'Mark as Finished'}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-600 font-display transition-all',
                isFinished
                  ? 'bg-emerald-600/80 text-white'
                  : 'bg-bg/90 border border-white/20 text-text-base hover:bg-emerald-600/20 hover:border-emerald-500/40'
              )}
            >
              <Check className="w-3 h-3" />
              {isFinished ? 'Finished' : 'Finished'}
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col gap-1">
        <h3 className="font-display font-600 text-sm text-text-base line-clamp-2 leading-snug">{displayTitle}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {anime.type && (
            <span className="text-[10px] font-600 font-display uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.05] text-text-muted">
              {anime.type}
            </span>
          )}
          {anime.genres?.slice(0, 2).map(g => (
            <span key={g.mal_id} className="text-[10px] text-text-muted">{g.name}</span>
          ))}
        </div>

        <div className="flex gap-1 mt-0.5 flex-wrap">
          {isFinished && (
            <span className="text-[10px] font-600 px-1.5 py-0.5 rounded bg-emerald-600/15 text-emerald-400 border border-emerald-600/20">✓ Finished</span>
          )}
          {inWatchlist && !isFinished && (
            <span className="text-[10px] font-600 px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/20">⊕ Watchlist</span>
          )}
          {showStatus && anime.airing && (
            <span className="text-[10px] font-600 px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">● Airing</span>
          )}
        </div>
      </div>
    </Link>
  )
}

// React.memo: prevents re-render unless this card's props actually changed
export default memo(AnimeCard)
