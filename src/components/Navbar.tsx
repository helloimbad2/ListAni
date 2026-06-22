import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, X, LayoutGrid, Trophy, List, Menu } from 'lucide-react'
import { searchAnime, getImageUrl } from '../api/jikan'
import { Anime } from '../types'
import { useStore } from '../store/useStore'

export default function Navbar() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<Anime[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(-1)
  const [mobileOpen, setMobileOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()
  const nav = useNavigate()
  const loc = useLocation()
  const recentlyViewed = useStore((s) => s.recentlyViewed)
  const animeCache = useStore((s) => s.animeCache)

  const isActive = (path: string) => loc.pathname === path

  useEffect(() => { setMobileOpen(false) }, [loc.pathname])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cmd+K focuses the search input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
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
      setSelected(-1)
    } catch {}
    finally { setSearching(false) }
  }, [])

  const handleChange = (value: string) => {
    setQ(value)
    setOpen(true)
    setSelected(-1)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => doSearch(value), 300)
  }

  const goTo = (id: number) => {
    nav(`/anime/${id}`)
    setOpen(false); setQ('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const list = q ? results : recentAnime
    if (selected >= 0 && list[selected]) { goTo(list[selected].mal_id); return }
    if (q.trim()) { nav(`/catalog?q=${encodeURIComponent(q.trim())}`); setOpen(false); setQ('') }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const list = q ? results : recentAnime
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, list.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, -1)) }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
  }

  const recentAnime = recentlyViewed.slice(0, 6).map((id) => animeCache[id]).filter(Boolean) as Anime[]
  const displayList = q ? results : recentAnime
  const showDropdown = open && (displayList.length > 0 || searching || (q && !searching))

  return (
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

        {/* Inline search with dropdown */}
        <div ref={wrapRef} className="relative flex-1 max-w-md">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search anime... (⌘K)"
                className="w-full bg-surface border border-white/[0.07] rounded-xl pl-9 pr-8 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:bg-card transition-all"
              />
              {q && (
                <button type="button" onClick={() => { setQ(''); setResults([]); inputRef.current?.focus() }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-white/[0.1] rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-fade-in">
              {!q && recentAnime.length > 0 && (
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-display font-600 text-text-dim uppercase tracking-wider">Recently Viewed</p>
              )}
              {searching && <p className="px-3 py-3 text-xs text-text-muted">Searching...</p>}
              {!searching && q && results.length === 0 && (
                <p className="px-3 py-3 text-xs text-text-muted">No results for "{q}"</p>
              )}
              {displayList.map((anime, i) => (
                <button key={anime.mal_id} onMouseDown={() => goTo(anime.mal_id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${i === selected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}>
                  <img src={getImageUrl(anime, 'small')} alt={anime.title}
                    className="w-7 h-10 object-contain bg-[#0a0b12] rounded shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-600 text-xs text-text-base truncate">{anime.title_english || anime.title}</p>
                    <p className="text-[10px] text-text-muted">{anime.type}{anime.year ? ` · ${anime.year}` : ''}{anime.score ? ` · ★${anime.score}` : ''}</p>
                  </div>
                </button>
              ))}
              {q && results.length > 0 && (
                <button onMouseDown={() => { nav(`/catalog?q=${encodeURIComponent(q)}`); setOpen(false); setQ('') }}
                  className="w-full px-3 py-2.5 text-xs text-text-muted hover:text-accent border-t border-white/[0.06] text-left transition-colors">
                  See all results for "<span className="text-text-base">{q}</span>" →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/catalog" active={isActive('/catalog')}><LayoutGrid className="w-3.5 h-3.5" /> Catalog</NavLink>
          <NavLink to="/mylist" active={isActive('/mylist')}><List className="w-3.5 h-3.5" /> My List</NavLink>
          <NavLink to="/tierlist" active={isActive('/tierlist')}><Trophy className="w-3.5 h-3.5" /> Tier List</NavLink>
        </nav>

        <button className="md:hidden ml-auto text-text-muted hover:text-text-base" onClick={() => setMobileOpen(!mobileOpen)}>
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-surface px-4 py-3 flex flex-col gap-1">
          {([['/', 'Home'], ['/catalog', 'Catalog'], ['/mylist', 'My List'], ['/tierlist', 'Tier List']] as [string,string][]).map(([p, l]) => (
            <Link key={p} to={p} className="px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text-base hover:bg-card transition-colors">{l}</Link>
          ))}
        </div>
      )}
    </header>
  )
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link to={to} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium font-display transition-all ${
      active ? 'bg-accent/15 text-accent border border-accent/25' : 'text-text-muted hover:text-text-base hover:bg-white/[0.04]'
    }`}>
      {children}
    </Link>
  )
}
