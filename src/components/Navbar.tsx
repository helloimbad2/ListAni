import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, X, LayoutGrid, Trophy, List, Menu, Command } from 'lucide-react'
import { searchAnime, getImageUrl } from '../api/jikan'
import { Anime } from '../types'
import { useStore } from '../store/useStore'

export default function Navbar() {
  const [q, setQ] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [results, setResults] = useState<Anime[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()
  const nav = useNavigate()
  const loc = useLocation()
  const recentlyViewed = useStore((s) => s.recentlyViewed)
  const animeCache = useStore((s) => s.animeCache)

  const isActive = (path: string) => loc.pathname === path

  useEffect(() => { setMobileOpen(false) }, [loc.pathname])

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') { setCmdOpen(false); setQ(''); setResults([]) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const res = await searchAnime(query, 6)
      setResults(res.data || [])
      setSelected(0)
    } catch {}
    finally { setSearching(false) }
  }, [])

  const handleInput = (value: string) => {
    setQ(value)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => doSearch(value), 300)
  }

  const goTo = (id: number) => {
    nav(`/anime/${id}`)
    setCmdOpen(false); setQ(''); setResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const list = results.length ? results : recentlyViewed.slice(0, 6).map((id) => animeCache[id]).filter(Boolean)
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, list.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && list[selected]) goTo(list[selected].mal_id)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) { nav(`/catalog?q=${encodeURIComponent(q.trim())}`); setCmdOpen(false); setQ(''); setResults([]) }
  }

  const displayList: Anime[] = q ? results : recentlyViewed.slice(0, 6).map((id) => animeCache[id]).filter(Boolean) as Anime[]

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-bg/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-lg shadow-accent/30 group-hover:shadow-accent/50 transition-shadow">
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                <path d="M16 4L19.5 12H28L21.5 17.5L24 26L16 21L8 26L10.5 17.5L4 12H12.5L16 4Z" fill="white"/>
              </svg>
            </div>
            <span className="font-display font-700 text-lg tracking-tight text-text-base hidden sm:block">
              List<span className="text-accent">Anime</span>
            </span>
          </Link>

          {/* Search trigger */}
          <button
            onClick={() => { setCmdOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
            className="flex-1 max-w-md flex items-center gap-2 bg-surface border border-white/[0.07] rounded-xl px-3 py-2 text-sm text-text-muted hover:border-white/[0.14] hover:bg-card transition-all"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Search anime...</span>
            <span className="hidden sm:flex items-center gap-0.5 text-[10px] font-display font-600 text-text-dim bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded">
              <Command className="w-2.5 h-2.5" />K
            </span>
          </button>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/catalog" label="Catalog" active={isActive('/catalog')}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </NavLink>
            <NavLink to="/mylist" label="My List" active={isActive('/mylist')}>
              <List className="w-3.5 h-3.5" />
            </NavLink>
            <NavLink to="/tierlist" label="Tier List" active={isActive('/tierlist')}>
              <Trophy className="w-3.5 h-3.5" />
            </NavLink>
          </nav>

          <button className="md:hidden ml-auto text-text-muted hover:text-text-base" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-surface px-4 py-3 flex flex-col gap-1">
            {[['/', 'Home'], ['/catalog', 'Catalog'], ['/mylist', 'My List'], ['/tierlist', 'Tier List']].map(([path, label]) => (
              <Link key={path} to={path} className="px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text-base hover:bg-card transition-colors">
                {label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Command Palette */}
      {cmdOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setCmdOpen(false); setQ(''); setResults([]) }} />
          <div className="relative w-full max-w-lg bg-card border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-scale-in">
            {/* Input */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07]">
              <Search className="w-4 h-4 text-text-muted shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => handleInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search anime..."
                className="flex-1 bg-transparent text-sm text-text-base placeholder:text-text-muted outline-none"
              />
              {q && <button type="button" onClick={() => { setQ(''); setResults([]) }}><X className="w-3.5 h-3.5 text-text-muted" /></button>}
              <span className="text-[10px] text-text-dim font-display shrink-0">ESC to close</span>
            </form>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {!q && recentlyViewed.length > 0 && (
                <p className="px-4 pt-3 pb-1 text-[10px] font-display font-600 text-text-dim uppercase tracking-wider">Recently Viewed</p>
              )}
              {searching && (
                <div className="px-4 py-6 text-center text-text-muted text-sm">Searching...</div>
              )}
              {displayList.map((anime, i) => (
                <button
                  key={anime.mal_id}
                  onClick={() => goTo(anime.mal_id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <img src={getImageUrl(anime, 'small')} alt={anime.title}
                    className="w-8 h-11 object-contain bg-[#0a0b12] rounded shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-600 text-sm text-text-base truncate">{anime.title_english || anime.title}</p>
                    <p className="text-xs text-text-muted">{anime.type} {anime.year ? `· ${anime.year}` : ''} {anime.score ? `· ★ ${anime.score}` : ''}</p>
                  </div>
                </button>
              ))}
              {q && !searching && displayList.length === 0 && (
                <p className="px-4 py-8 text-center text-text-muted text-sm">No results for "{q}"</p>
              )}
              {q && displayList.length > 0 && (
                <button
                  onClick={() => { nav(`/catalog?q=${encodeURIComponent(q)}`); setCmdOpen(false); setQ(''); setResults([]) }}
                  className="w-full px-4 py-3 text-sm text-text-muted hover:text-accent border-t border-white/[0.06] text-left transition-colors"
                >
                  See all results for "<span className="text-text-base">{q}</span>" →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function NavLink({ to, label, active, children }: { to: string; label: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium font-display transition-all ${
        active ? 'bg-accent/15 text-accent border border-accent/25' : 'text-text-muted hover:text-text-base hover:bg-white/[0.04]'
      }`}
    >
      {children} {label}
    </Link>
  )
}
