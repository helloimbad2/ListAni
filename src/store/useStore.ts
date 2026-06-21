import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Anime, AllTiers, TIER_LEVELS } from '../types'

interface StoreState {
  watchlist: number[]
  finished: number[]
  recentlyViewed: number[]
  tierItems: Record<AllTiers, number[]>
  animeCache: Record<number, Anime>

  addToWatchlist: (malId: number) => void
  removeFromWatchlist: (malId: number) => void
  toggleWatchlist: (anime: Anime) => void
  markFinished: (malId: number) => void
  unmarkFinished: (malId: number) => void
  toggleFinished: (anime: Anime) => void
  addRecentlyViewed: (anime: Anime) => void

  addToTierPool: (anime: Anime) => void
  removeFromTier: (malId: number) => void
  setTierItems: (items: Record<AllTiers, number[]>) => void
  clearTierList: () => void
  cacheAnime: (anime: Anime) => void
  cacheAnimes: (animes: Anime[]) => void
}

const emptyTiers = (): Record<AllTiers, number[]> => ({ S:[], A:[], B:[], C:[], D:[], F:[], unranked:[] })

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      watchlist: [],
      finished: [],
      recentlyViewed: [],
      tierItems: emptyTiers(),
      animeCache: {},

      addToWatchlist: (malId) =>
        set((s) => ({ watchlist: s.watchlist.includes(malId) ? s.watchlist : [...s.watchlist, malId] })),
      removeFromWatchlist: (malId) =>
        set((s) => ({ watchlist: s.watchlist.filter((id) => id !== malId) })),
      toggleWatchlist: (anime) => {
        const { watchlist, cacheAnime } = get()
        cacheAnime(anime)
        set((s) => ({
          watchlist: s.watchlist.includes(anime.mal_id)
            ? s.watchlist.filter((id) => id !== anime.mal_id)
            : [...s.watchlist, anime.mal_id],
        }))
      },

      markFinished: (malId) =>
        set((s) => ({ finished: s.finished.includes(malId) ? s.finished : [...s.finished, malId] })),
      unmarkFinished: (malId) =>
        set((s) => ({ finished: s.finished.filter((id) => id !== malId) })),
      toggleFinished: (anime) => {
        const { cacheAnime } = get()
        cacheAnime(anime)
        set((s) => ({
          finished: s.finished.includes(anime.mal_id)
            ? s.finished.filter((id) => id !== anime.mal_id)
            : [...s.finished, anime.mal_id],
        }))
      },

      addRecentlyViewed: (anime) => {
        get().cacheAnime(anime)
        set((s) => ({
          recentlyViewed: [anime.mal_id, ...s.recentlyViewed.filter((id) => id !== anime.mal_id)].slice(0, 20),
        }))
      },

      addToTierPool: (anime) => {
        const { tierItems, cacheAnime } = get()
        cacheAnime(anime)
        const allIds = Object.values(tierItems).flat()
        if (allIds.includes(anime.mal_id)) return
        set((s) => ({ tierItems: { ...s.tierItems, unranked: [...s.tierItems.unranked, anime.mal_id] } }))
      },

      removeFromTier: (malId) =>
        set((s) => {
          const t = { ...s.tierItems }
          ;(Object.keys(t) as AllTiers[]).forEach((tier) => { t[tier] = t[tier].filter((id) => id !== malId) })
          return { tierItems: t }
        }),

      setTierItems: (items) => set({ tierItems: items }),
      clearTierList: () => set({ tierItems: emptyTiers() }),

      cacheAnime: (anime) =>
        set((s) => ({ animeCache: { ...s.animeCache, [anime.mal_id]: anime } })),
      cacheAnimes: (animes) =>
        set((s) => {
          const next = { ...s.animeCache }
          animes.forEach((a) => { next[a.mal_id] = a })
          return { animeCache: next }
        }),
    }),
    {
      name: 'listanime-store',
      partialize: (s) => ({
        watchlist: s.watchlist, finished: s.finished,
        recentlyViewed: s.recentlyViewed,
        tierItems: s.tierItems, animeCache: s.animeCache,
      }),
    }
  )
)

export const useIsWatchlisted = (malId: number) => useStore((s) => s.watchlist.includes(malId))
export const useIsFinished = (malId: number) => useStore((s) => s.finished.includes(malId))
