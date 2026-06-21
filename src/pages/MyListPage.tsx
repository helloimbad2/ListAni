import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Check, Clock, Star, BarChart2, Trophy, Zap, Search } from 'lucide-react'
import { useStore } from '../store/useStore'
import { getImageUrl } from '../api/jikan'
import AnimeCard from '../components/AnimeCard'
import clsx from 'clsx'

type Tab = 'all' | 'watchlist' | 'finished'

export default function MyListPage() {
  const [tab, setTab] = useState<Tab>('all')
  const [searchQ, setSearchQ] = useState('')

  const watchlist = useStore((s) => s.watchlist)
  const finished = useStore((s) => s.finished)
  const animeCache = useStore((s) => s.animeCache)
  const tierItems = useStore((s) => s.tierItems)

  // Compute stats
  const stats = useMemo(() => {
    const finishedAnime = finished.map((id) => animeCache[id]).filter(Boolean)
    const totalEpisodes = finishedAnime.reduce((sum, a) => sum + (a.episodes || 0), 0)
    const totalMinutes = totalEpisodes * 24
    const totalHours = Math.floor(totalMinutes / 60)
    const totalDays = Math.floor(totalHours / 24)

    const genreCount: Record<string, number> = {}
    finishedAnime.forEach((a) => {
      ;[...(a.genres || []), ...(a.themes || [])].forEach((g) => {
        genreCount[g.name] = (genreCount[g.name] || 0) + 1
      })
    })
    const topGenre = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

    const avgScore = finishedAnime.filter((a) => a.score).length
      ? finishedAnime.filter((a) => a.score).reduce((s, a) => s + (a.score || 0), 0) / finishedAnime.filter((a) => a.score).length
      : 0

    const tieredCount = Object.values(tierItems).flat().length

    return { totalHours, totalDays, totalEpisodes, topGenre, avgScore: avgScore.toFixed(1), tieredCount }
  }, [finished, animeCache, tierItems])

  // List to display
  const sourceIds = useMemo(() => {
    if (tab === 'watchlist') return watchlist
    if (tab === 'finished') return finished
    // "all" = union, finished first then watchlist-only
    const finishedSet = new Set(finished)
    const watchlistOnly = watchlist.filter((id) => !finishedSet.has(id))
    return [...finished, ...watchlistOnly]
  }, [tab, watchlist, finished])

  const displayAnime = useMemo(() => {
    const q = searchQ.toLowerCase()
    return sourceIds
      .map((id) => animeCache[id])
      .filter(Boolean)
      .filter((a) => !q || (a.title_english || a.title).toLowerCase().includes(q))
  }, [sourceIds, animeCache, searchQ])

  const isEmpty = watchlist.length === 0 && finished.length === 0

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-700 text-2xl text-text-base">My List</h1>
          <p className="text-text-muted text-sm mt-0.5">Your personal anime collection</p>
        </div>

        {/* Stats row */}
        {!isEmpty && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <StatCard icon={<Check className="w-4 h-4" />} label="Completed" value={String(finished.length)} color="emerald" />
            <StatCard icon={<Bookmark className="w-4 h-4" />} label="Watchlist" value={String(watchlist.length)} color="accent" />
            <StatCard icon={<Clock className="w-4 h-4" />} label="Time Spent"
              value={stats.totalDays > 0 ? `${stats.totalDays}d ${stats.totalHours % 24}h` : `${stats.totalHours}h`}
              color="blue" />
            <StatCard icon={<Zap className="w-4 h-4" />} label="Episodes" value={stats.totalEpisodes.toLocaleString()} color="yellow" />
            <StatCard icon={<Star className="w-4 h-4" />} label="Avg Score" value={stats.avgScore !== '0.0' ? stats.avgScore : '—'} color="orange" />
            <StatCard icon={<Trophy className="w-4 h-4" />} label="In Tier List" value={String(stats.tieredCount)} color="purple" />
          </div>
        )}

        {/* Top genre badge */}
        {!isEmpty && stats.topGenre !== '—' && (
          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/25 bg-accent/8 text-xs font-display font-600 text-accent">
            <BarChart2 className="w-3.5 h-3.5" />
            Your most-watched genre: <span className="text-text-base">{stats.topGenre}</span>
          </div>
        )}

        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {/* Tabs + search */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <div className="flex gap-1 bg-surface border border-white/[0.06] p-1 rounded-xl">
                {([['all', 'All'], ['watchlist', 'Watchlist'], ['finished', 'Finished']] as [Tab, string][]).map(([v, label]) => (
                  <button key={v} onClick={() => setTab(v)}
                    className={clsx('px-4 py-1.5 rounded-lg text-sm font-display font-600 transition-all',
                      tab === v ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-base')}>
                    {label}
                    <span className={clsx('ml-1.5 text-[10px]', tab === v ? 'text-white/70' : 'text-text-dim')}>
                      {v === 'all' ? watchlist.length + finished.length : v === 'watchlist' ? watchlist.length : finished.length}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Filter by title..."
                  className="w-full bg-surface border border-white/[0.07] rounded-xl pl-9 pr-4 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all" />
              </div>
            </div>

            {displayAnime.length === 0 ? (
              <div className="text-center py-16 text-text-muted text-sm">
                {searchQ ? `No anime match "${searchQ}"` : `Nothing in ${tab} yet.`}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {displayAnime.map((anime) => (
                  <AnimeCard key={anime.mal_id} anime={anime} showStatus />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    accent: 'text-[#f97316] bg-orange-500/10 border-orange-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  }
  return (
    <div className={clsx('flex flex-col gap-2 p-3.5 rounded-xl border', colors[color])}>
      <span>{icon}</span>
      <p className="font-display font-700 text-lg leading-none">{value}</p>
      <p className="text-[10px] font-display font-600 uppercase tracking-wider opacity-70">{label}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-2xl bg-surface border border-white/[0.06] flex items-center justify-center mb-5">
        <Bookmark className="w-8 h-8 text-text-dim" />
      </div>
      <h2 className="font-display font-700 text-lg text-text-base mb-2">Your list is empty</h2>
      <p className="text-text-muted text-sm mb-6 max-w-xs">
        Start adding anime to your watchlist or mark ones you've finished watching.
      </p>
      <Link to="/catalog" className="btn-accent px-5 py-2.5 rounded-xl text-sm inline-flex items-center gap-1.5">
        Browse Catalog
      </Link>
    </div>
  )
}
