export interface AnimeImage {
  jpg: { image_url: string; small_image_url: string; large_image_url: string }
  webp: { image_url: string; small_image_url: string; large_image_url: string }
}
export interface AnimeEntity { mal_id: number; name: string; url?: string }

export interface Anime {
  mal_id: number; url?: string; images: AnimeImage
  title: string; title_english?: string; title_japanese?: string
  type?: string; source?: string; episodes?: number; status?: string; airing?: boolean
  aired?: { from?: string; to?: string; prop?: { from?: { day?: number; month?: number; year?: number }; to?: { day?: number; month?: number; year?: number } }; string?: string }
  duration?: string; rating?: string; score?: number; scored_by?: number; rank?: number
  popularity?: number; members?: number; favorites?: number; synopsis?: string
  season?: string; year?: number
  genres?: AnimeEntity[]; themes?: AnimeEntity[]; demographics?: AnimeEntity[]
  studios?: AnimeEntity[]; producers?: AnimeEntity[]; licensors?: AnimeEntity[]
  explicit_genres?: AnimeEntity[]
  trailer?: { url?: string; embed_url?: string; images?: { maximum_image_url?: string } }
}

export function getAllGenreIds(anime: Anime): number[] {
  return [...(anime.genres || []), ...(anime.themes || []), ...(anime.demographics || [])].map((g) => g.mal_id)
}

export type TierLevel = 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
export const TIER_LEVELS: TierLevel[] = ['S', 'A', 'B', 'C', 'D', 'F']
export type AllTiers = TierLevel | 'unranked'
export const TIER_COLORS: Record<AllTiers, string> = {
  S: '#ff5757', A: '#ffbe4f', B: '#4fbdff', C: '#4fdb8e', D: '#c084fc', F: '#6b7280', unranked: '#3a3a52',
}

// Verified Jikan v4 genre IDs — cross-referenced with MAL's genre taxonomy
// Source: https://api.jikan.moe/v4/genres/anime
// Jikan v4 uses a unified ID space: genres (1-43), themes (50+), demographics (15,25,27,42,43)
// The /anime?genres= filter accepts IDs from ALL categories
export const GENRES: { id: number; name: string }[] = [
  { id: 1,  name: 'Action' },
  { id: 2,  name: 'Adventure' },
  { id: 4,  name: 'Comedy' },
  { id: 8,  name: 'Drama' },
  { id: 9,  name: 'Ecchi' },
  { id: 10, name: 'Fantasy' },
  { id: 11, name: 'Game' },
  { id: 35, name: 'Harem' },
  { id: 14, name: 'Horror' },
  { id: 62, name: 'Isekai' },
  { id: 43, name: 'Josei' },
  { id: 15, name: 'Kids' },
  { id: 7,  name: 'Mystery' },
  { id: 40, name: 'Psychological' },
  { id: 22, name: 'Romance' },
  { id: 23, name: 'School' },
  { id: 24, name: 'Sci-Fi' },
  { id: 42, name: 'Seinen' },
  { id: 25, name: 'Shoujo' },
  { id: 27, name: 'Shounen' },
  { id: 36, name: 'Slice of Life' },
  { id: 30, name: 'Sports' },
  { id: 37, name: 'Supernatural' },
  { id: 41, name: 'Suspense' },
  { id: 41, name: 'Thriller' },   // MAL maps Thriller → Suspense (ID 41); same tag in Jikan v4
]

export const ANIME_TYPES = ['TV', 'Movie', 'OVA', 'ONA', 'Special', 'Music']
export const ANIME_RATINGS = [
  { value: 'g',    label: 'G — All Ages' },
  { value: 'pg',   label: 'PG — Children' },
  { value: 'pg13', label: 'PG-13 — Teens 13+' },
  { value: 'r17',  label: 'R — 17+ Violence' },
  { value: 'r',    label: 'R+ — Mild Nudity' },
]
export const ANIME_STATUSES = [
  { value: 'airing',   label: 'Currently Airing' },
  { value: 'complete', label: 'Finished Airing' },
  { value: 'upcoming', label: 'Not Yet Aired' },
]

export interface FilterState {
  genres: number[]; types: string[]; ratings: string[]
  statuses: string[]; years: number[]
  userList: 'all' | 'watchlist' | 'finished'; query: string
}
export const DEFAULT_FILTERS: FilterState = {
  genres: [], types: [], ratings: [], statuses: [], years: [], userList: 'all', query: '',
}
export interface JikanResponse<T> {
  data: T
  pagination?: { last_visible_page: number; has_next_page: boolean; current_page: number; items: { count: number; total: number; per_page: number } }
}
