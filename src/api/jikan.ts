import { Anime, FilterState, JikanResponse, getAllGenreIds } from '../types'

const BASE = 'https://api.jikan.moe/v4'
let lastReq = 0
const DELAY = 450
const MAX_RETRIES = 3

async function req<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  })

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const wait = Math.max(0, DELAY - (Date.now() - lastReq))
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastReq = Date.now()

    try {
      const res = await fetch(url.toString())
      if (res.status === 429 || res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504) {
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
          continue
        }
        throw new Error(`API ${res.status}`)
      }
      if (!res.ok) throw new Error(`API ${res.status}`)
      return await res.json()
    } catch (err) {
      if (attempt < MAX_RETRIES && (err instanceof Error) && /API 429|API 5|fetch/i.test(err.message)) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
      throw err
    }
  }

  throw new Error('Request failed')
}

function dedupe(arr: Anime[]): Anime[] {
  const seen = new Set<number>()
  return arr.filter((a) => { if (seen.has(a.mal_id)) return false; seen.add(a.mal_id); return true })
}

function matchesFilters(anime: Anime, filters: Partial<FilterState>): boolean {
  const query = filters.query?.trim().toLowerCase() || ''
  if (query) {
    const haystack = [
      anime.title,
      anime.title_english,
      anime.title_japanese,
      ...(anime.genres || []).map((g) => g.name),
      ...(anime.themes || []).map((g) => g.name),
      ...(anime.demographics || []).map((g) => g.name),
      anime.type,
      anime.status,
      anime.rating,
    ].filter(Boolean).join(' ').toLowerCase()
    if (!haystack.includes(query)) return false
  }

  const genreIds = getAllGenreIds(anime)
  if (filters.genres?.length && !filters.genres.every((id) => genreIds.includes(id))) return false
  if (filters.excludedGenres?.length && filters.excludedGenres.some((id) => genreIds.includes(id))) return false
  if (filters.types?.length && !filters.types.includes(anime.type || '')) return false

  const normalizedRating = anime.rating?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
  const ratingMatches = filters.ratings?.length
    ? filters.ratings.some((r) => {
        const exact = r.toLowerCase()
        return normalizedRating.includes(exact) || exact === normalizedRating || exact === anime.rating?.toLowerCase()
      })
    : true
  if (filters.ratings?.length && !ratingMatches) return false

  const statusValue = (anime.status || '').toLowerCase()
  const statusMatches = filters.statuses?.length
    ? filters.statuses.some((s) => {
        if (s === 'airing') return statusValue.includes('airing')
        if (s === 'complete') return statusValue.includes('finished') || statusValue.includes('complete')
        if (s === 'upcoming') return statusValue.includes('not yet aired') || statusValue.includes('upcoming')
        return false
      })
    : true
  if (filters.statuses?.length && !statusMatches) return false

  if (filters.years?.length && anime.year && !filters.years.includes(anime.year)) return false
  return true
}

const SFW = { sfw: 'true' }

export async function fetchTopAnime(page = 1, limit = 25): Promise<JikanResponse<Anime[]>> {
  const res: JikanResponse<Anime[]> = await req('/top/anime', { page, limit, ...SFW })
  return { ...res, data: dedupe(res.data || []) }
}

// Fetch top anime for specific genres — used by the home page genre filter
// Uses /anime endpoint with genre filter + score ordering to get the TRUE top-rated
// for that genre (not just client-side filter from global top 10)
export async function fetchTopByGenres(genreIds: number[], limit = 10): Promise<Anime[]> {
  const res: JikanResponse<Anime[]> = await req('/anime', {
    genres: genreIds.join(','),
    order_by: 'score',
    sort: 'desc',
    limit,
    min_score: 6,
    ...SFW,
  })
  return dedupe(res.data || [])
}

export async function fetchAnime(
  filters: Partial<FilterState> & { page?: number; limit?: number; order_by?: string; sort?: string }
): Promise<JikanResponse<Anime[]>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 25,
    ...SFW,
  }
  if (filters.query?.trim()) params.q = filters.query.trim()
  if (filters.types?.length === 1) params.type = filters.types[0].toLowerCase()
  if (filters.ratings?.length === 1) params.rating = filters.ratings[0]
  if (filters.statuses?.length === 1) params.status = filters.statuses[0]
  if (filters.genres?.length) params.genres = filters.genres.join(',')
  if (filters.excludedGenres?.length) params.genres_exclude = filters.excludedGenres.join(',')
  if (filters.years?.length) {
    const sorted = [...filters.years].sort()
    params.start_date = `${sorted[0]}-01-01`
    params.end_date = `${sorted[sorted.length - 1]}-12-31`
  }
  if (!filters.query && filters.order_by) { params.order_by = filters.order_by; params.sort = filters.sort }

  try {
    const res: JikanResponse<Anime[]> = await req('/anime', params)
    const data = dedupe(res.data || [])
    if (data.length === 0 && (filters.query || filters.genres?.length || filters.excludedGenres?.length || filters.types?.length || filters.ratings?.length || filters.statuses?.length || filters.years?.length)) {
      const fallback = await fetchTopAnime(1, 100)
      const filtered = (fallback.data || []).filter((anime) => matchesFilters(anime, filters))
      return {
        data: filtered.slice(0, filters.limit ?? 25),
        pagination: { last_visible_page: 1, has_next_page: false, current_page: 1, items: { count: filtered.length, total: filtered.length, per_page: filters.limit ?? 25 } },
      }
    }
    return { ...res, data }
  } catch {
    const fallback = await fetchTopAnime(1, 100)
    const filtered = (fallback.data || []).filter((anime) => matchesFilters(anime, filters))
    return {
      data: filtered.slice(0, filters.limit ?? 25),
      pagination: { last_visible_page: 1, has_next_page: false, current_page: 1, items: { count: filtered.length, total: filtered.length, per_page: filters.limit ?? 25 } },
    }
  }
}

export async function fetchBrowseAnime(page = 1, limit = 12): Promise<JikanResponse<Anime[]>> {
  const res: JikanResponse<Anime[]> = await req('/anime', { status: 'airing', order_by: 'members', sort: 'desc', limit: limit + 4, page, ...SFW })
  const data = dedupe(res.data || []).slice(0, limit)
  return { ...res, data }
}

export async function fetchUpcomingAnime(page = 1, limit = 12): Promise<JikanResponse<Anime[]>> {
  const res: JikanResponse<Anime[]> = await req('/seasons/upcoming', { page, limit: limit + 4, ...SFW })
  const data = dedupe(res.data || []).slice(0, limit)
  return { ...res, data }
}

export async function fetchAnimeById(id: number): Promise<{ data: Anime }> {
  return req(`/anime/${id}`)
}

export async function fetchSimilarAnime(genres: number[], excludeId: number, limit = 6): Promise<Anime[]> {
  if (!genres.length) return []
  try {
    const res: JikanResponse<Anime[]> = await req('/anime', {
      genres: genres.slice(0, 2).join(','), order_by: 'score', sort: 'desc', limit: limit + 1, ...SFW,
    })
    return (res.data || []).filter((a) => a.mal_id !== excludeId).slice(0, limit)
  } catch { return [] }
}

export async function searchAnime(q: string, limit = 8): Promise<JikanResponse<Anime[]>> {
  try {
    const res: JikanResponse<Anime[]> = await req('/anime', { q: q.trim(), limit: Math.max(limit, 12), order_by: 'members', sort: 'desc', ...SFW })
    return { ...res, data: dedupe(res.data || []).slice(0, limit) }
  } catch {
    const fallback = await fetchTopAnime(1, 50)
    const query = q.trim().toLowerCase()
    const data = (fallback.data || []).filter((anime) => {
      const haystack = [anime.title, anime.title_english, anime.title_japanese].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    }).slice(0, limit)
    return { data, pagination: { last_visible_page: 1, has_next_page: false, current_page: 1, items: { count: data.length, total: data.length, per_page: limit } } }
  }
}

export function getImageUrl(anime: Anime, size: 'small' | 'medium' | 'large' = 'medium'): string {
  if (size === 'large') return anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url || ''
  if (size === 'small') return anime.images?.webp?.small_image_url || anime.images?.jpg?.small_image_url || ''
  return anime.images?.webp?.image_url || anime.images?.jpg?.image_url || ''
}

export function formatAired(anime: Anime): string {
  const from = anime.aired?.prop?.from?.year
  const to = anime.aired?.prop?.to?.year
  if (!from) return 'Unknown'
  if (!to || from === to) return String(from)
  return `${from} – ${to}`
}
