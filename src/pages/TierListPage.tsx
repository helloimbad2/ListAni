import { useState, useCallback, useRef } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, DragStartEvent, DragOverEvent, DragEndEvent, UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, Download, Search, AlertTriangle, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { AllTiers, TIER_LEVELS, TIER_COLORS, Anime } from '../types'
import { getImageUrl, searchAnime } from '../api/jikan'
import Modal from '../components/Modal'
import { Spinner } from '../components/Skeleton'
import clsx from 'clsx'
import html2canvas from 'html2canvas'

// ── Sortable wrapper ──────────────────────────────────────────────────
function SortableItem({ id, isActiveId, children }: { id: string; isActiveId: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition: transition || undefined, opacity: isActiveId ? 0 : 1, cursor: 'grab', touchAction: 'none' }}
      {...attributes} {...listeners}
    >
      {children}
    </div>
  )
}

// ── Anime tile ────────────────────────────────────────────────────────
function AnimeTile({ anime, onRemove }: { anime: Anime; onRemove?: () => void }) {
  const [imgErr, setImgErr] = useState(false)
  const url = getImageUrl(anime, 'large')
  const title = anime.title_english || anime.title

  return (
    <div className="relative w-16 h-[90px] rounded-lg overflow-visible bg-[#0a0b12] border border-white/[0.08] group shrink-0">
      {!imgErr ? (
        <img src={url} alt={title} onError={() => setImgErr(true)}
          className="w-full h-full object-contain rounded-lg" draggable={false} />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-1">
          <span className="text-[8px] text-text-dim text-center leading-tight">{title.slice(0, 20)}</span>
        </div>
      )}
      {/* Hover tooltip */}
      <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-bg border border-white/10 rounded-lg px-2 py-1.5 text-[9px] text-text-base whitespace-nowrap z-30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none max-w-[140px] truncate shadow-xl">
        {title}
      </div>
      {onRemove && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 shadow-lg"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  )
}

// ── Droppable tier row ────────────────────────────────────────────────
function TierRow({
  tier, items, animeCache, activeId, onRemove, hideEmpty = false,
}: {
  tier: AllTiers; items: number[]; animeCache: Record<number, Anime>
  activeId: string | null; onRemove: (malId: number) => void; hideEmpty?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `zone-${tier}` })
  const ids = items.map(String)
  const isUnranked = tier === 'unranked'
  const color = TIER_COLORS[tier]

  return (
    <div className={clsx(
      'flex rounded-xl overflow-hidden border transition-all duration-150',
      isOver && activeId ? 'tier-row-over border-[#4fbdff]/40' : 'border-white/[0.06]'
    )}>
      {/* Label */}
      {isUnranked ? (
        <div className="w-24 shrink-0 flex items-center justify-center bg-surface/60 py-3">
          <span className="text-xs font-display font-600 text-text-muted">Unranked</span>
        </div>
      ) : (
        <div className="w-12 shrink-0 flex items-center justify-center text-xl font-display font-700"
          style={{ color, background: `${color}14`, borderRight: `2px solid ${color}28` }}>
          {tier}
        </div>
      )}

      {/* Drop zone */}
      <div ref={setNodeRef} className="flex-1 bg-surface/40 min-h-[78px] flex items-center">
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-2 p-2.5 flex-wrap min-h-[78px] items-center">
            {items.map((malId) => {
              const anime = animeCache[malId]
              if (!anime) return null
              return (
                <SortableItem key={String(malId)} id={String(malId)} isActiveId={activeId === String(malId)}>
                  <AnimeTile anime={anime} onRemove={() => onRemove(malId)} />
                </SortableItem>
              )
            })}
            {/* Only show placeholder in unranked, never in ranked (so PNG is clean) */}
            {items.length === 0 && !hideEmpty && isUnranked && (
              <p className="text-text-dim text-xs font-display px-2 self-center">
                Add anime with + then drag into tiers
              </p>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function TierListPage() {
  const tierItems = useStore((s) => s.tierItems)
  const animeCache = useStore((s) => s.animeCache)
  const setTierItems = useStore((s) => s.setTierItems)
  const removeFromTier = useStore((s) => s.removeFromTier)
  const addToTierPool = useStore((s) => s.addToTierPool)
  const clearTierList = useStore((s) => s.clearTierList)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<Anime[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const rankedRef = useRef<HTMLDivElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  const findContainer = useCallback((id: UniqueIdentifier): AllTiers | null => {
    const s = String(id)
    if (s.startsWith('zone-')) return s.replace('zone-', '') as AllTiers
    const malId = Number(s)
    for (const tier of [...TIER_LEVELS, 'unranked' as const]) {
      if (tierItems[tier].includes(malId)) return tier
    }
    return null
  }, [tierItems])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id))

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return
    const aid = String(active.id), oid = String(over.id)
    const ac = findContainer(aid), oc = findContainer(oid)
    if (!ac || !oc || ac === oc) return

    setTierItems((() => {
      const ni = { ...tierItems }
      const fromArr = [...ni[ac]], toArr = [...ni[oc]]
      const malId = Number(aid)
      const fi = fromArr.indexOf(malId)
      if (fi === -1) return ni
      fromArr.splice(fi, 1)

      let ti: number
      if (oid.startsWith('zone-')) {
        ti = toArr.length
      } else {
        const om = Number(oid), oi = toArr.indexOf(om)
        ti = oi === -1 ? toArr.length : oi
        if (active.rect.current.translated && over.rect) {
          const ac2 = active.rect.current.translated.left + active.rect.current.translated.width / 2
          const oc2 = over.rect.left + over.rect.width / 2
          if (ac2 > oc2) ti += 1
        }
      }

      toArr.splice(ti, 0, malId)
      ni[ac] = fromArr; ni[oc] = toArr
      return ni
    })())
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) {
      const aid = String(active.id), oid = String(over.id)
      const ac = findContainer(aid), oc = findContainer(oid)
      if (ac && oc && ac === oc && !oid.startsWith('zone-')) {
        const arr = tierItems[ac]
        const oi = arr.indexOf(Number(oid)), ni = arr.indexOf(Number(aid))
        if (oi !== ni && oi !== -1 && ni !== -1)
          setTierItems({ ...tierItems, [ac]: arrayMove(arr, ni, oi) })
      }
    }
    setActiveId(null)
  }

  const handleSearch = async (q: string) => {
    setSearchQ(q)
    clearTimeout(searchTimeout.current)
    if (!q.trim()) { setSearchResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try { const r = await searchAnime(q, 12); setSearchResults(r.data || []) }
      catch {} finally { setSearching(false) }
    }, 350)
  }

  const handleAddAnime = (anime: Anime) => {
    addToTierPool(anime)
    setShowAdd(false); setSearchQ(''); setSearchResults([])
  }

  const handleSave = async () => {
    if (!rankedRef.current) return
    setSaving(true)
    try {
      const canvas = await html2canvas(rankedRef.current, {
        backgroundColor: '#0c0c15', scale: 2, useCORS: true, allowTaint: true, logging: false,
      })
      const link = document.createElement('a')
      link.download = 'listanime-tierlist.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const activeAnime = activeId ? animeCache[Number(activeId)] : null
  const totalAnime = Object.values(tierItems).flat().length

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-700 text-2xl text-text-base">My Tier List</h1>
            <p className="text-text-muted text-sm mt-0.5">
              {totalAnime > 0 ? `${totalAnime} anime ranked` : 'Drag anime between tiers to rank them'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl btn-ghost text-sm">
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl btn-ghost text-sm">
              {saving ? <Spinner size="sm" /> : <Download className="w-4 h-4" />} Save PNG
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-white font-display font-600 text-sm hover:bg-accent-light transition-colors shadow-lg shadow-accent/20">
              <Plus className="w-4 h-4" /> Add Anime
            </button>
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragStart={handleDragStart} onDragOver={handleDragOver}
          onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>

          {/* PNG-exported section: only ranked tiers, no "Drop here" text */}
          <div ref={rankedRef} className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[#0c0c15]">
            {/* Watermark — inline styles so html2canvas renders it correctly */}
            <div style={{
              textAlign: 'center',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              lineHeight: '20px',
            }}>
              <span style={{
                display: 'inline-block',
                width: '20px',
                height: '20px',
                borderRadius: '5px',
                background: '#e8630a',
                verticalAlign: 'middle',
                marginRight: '8px',
                textAlign: 'center',
                lineHeight: '20px',
              }}>
                <svg width="10" height="10" viewBox="0 0 32 32" fill="none" style={{ verticalAlign: 'middle', display: 'inline-block', marginTop: '-2px' }}>
                  <path d="M16 4L19.5 12H28L21.5 17.5L24 26L16 21L8 26L10.5 17.5L4 12H12.5L16 4Z" fill="white"/>
                </svg>
              </span>
              <span style={{
                fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif',
                fontWeight: 700,
                fontSize: '14px',
                lineHeight: '20px',
                verticalAlign: 'middle',
                color: '#7878a0',
                letterSpacing: '0.02em',
              }}>
                List<span style={{ color: '#e8630a' }}>Anime</span>
                <span style={{ color: '#3a3a52', margin: '0 6px' }}>·</span>
                Tier List
              </span>
            </div>

            {TIER_LEVELS.map((tier) => (
              <TierRow key={tier} tier={tier}
                items={tierItems[tier] || []} animeCache={animeCache}
                activeId={activeId} onRemove={removeFromTier}
                hideEmpty={true} /* no "Drop here" text in ranked — keeps PNG clean */
              />
            ))}
          </div>

          {/* Unranked pool — outside of PNG export */}
          <div className="mt-2">
            <TierRow tier="unranked"
              items={tierItems['unranked'] || []} animeCache={animeCache}
              activeId={activeId} onRemove={removeFromTier}
              hideEmpty={false}
            />
          </div>

          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
            {activeAnime && (
              <div className="drag-overlay-card rounded-lg overflow-hidden">
                <AnimeTile anime={activeAnime} />
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Instructions */}
        {totalAnime === 0 && (
          <div className="mt-6 text-center py-10 border border-dashed border-white/[0.08] rounded-2xl">
            <p className="font-display font-600 text-text-muted mb-1">Your tier list is empty</p>
            <p className="text-text-dim text-sm">Click <span className="text-accent">+ Add Anime</span> to start building your list</p>
          </div>
        )}
      </div>

      {/* Add Anime Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setSearchQ(''); setSearchResults([]) }}
        title="Add Anime to Tier List" maxWidth="max-w-lg">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input value={searchQ} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search for an anime..." autoFocus
              className="w-full bg-surface border border-white/[0.07] rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all" />
          </div>
          <div className="min-h-[200px] max-h-[360px] overflow-y-auto flex flex-col gap-1.5">
            {searching && <div className="flex justify-center py-8"><Spinner /></div>}
            {!searching && !searchQ && <p className="text-text-muted text-sm text-center py-8">Type to search for anime</p>}
            {!searching && searchQ && searchResults.length === 0 && <p className="text-text-muted text-sm text-center py-8">No results found</p>}
            {searchResults.map((anime) => {
              const inList = Object.values(tierItems).flat().includes(anime.mal_id)
              return (
                <button key={anime.mal_id} onClick={() => !inList && handleAddAnime(anime)} disabled={inList}
                  className={clsx('flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all',
                    inList ? 'border-white/[0.04] bg-white/[0.02] opacity-50 cursor-not-allowed'
                      : 'border-white/[0.06] bg-card hover:bg-card-hover hover:border-accent/30 cursor-pointer')}>
                  <img src={getImageUrl(anime, 'small')} alt={anime.title}
                    className="w-10 h-14 object-contain bg-[#0a0b12] rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-600 text-sm text-text-base truncate">{anime.title_english || anime.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">{anime.type}{anime.year ? ` · ${anime.year}` : ''}{anime.score ? ` · ★ ${anime.score}` : ''}</p>
                  </div>
                  {inList ? <span className="text-xs text-text-muted shrink-0">Added</span> : <Plus className="w-4 h-4 text-accent shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      </Modal>

      {/* Clear Confirm Modal */}
      <Modal open={showClearConfirm} onClose={() => setShowClearConfirm(false)} maxWidth="max-w-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="font-display font-700 text-base text-text-base">Clear Entire Tier List?</h3>
            <p className="text-text-muted text-sm mt-1.5">This will remove all {totalAnime} anime from your tier list. This cannot be undone.</p>
          </div>
          <div className="flex gap-2 w-full">
            <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2.5 rounded-xl btn-ghost text-sm">Cancel</button>
            <button onClick={() => { clearTierList(); setShowClearConfirm(false) }}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-display font-600 text-sm transition-colors">
              Clear All
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
