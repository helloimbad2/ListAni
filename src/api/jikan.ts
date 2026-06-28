import { Anime, FilterState, JikanResponse } from '../types'

const BASE = 'https://api.jikan.moe/v4'
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ── Promise-chain rate limiter ────────────────────────────────────────
// Each request starts only after the previous completes + 300 ms cooldown.
// 300 ms is safe (Jikan allows 3 req/sec burst; 300 ms ≈ 3.3/sec at worst).
// Using promise chaining instead of a queue avoids race conditions entirely.
let chain: Promise<unknown> = Promise.resolve()

async function apiFetch<T>(url: string): Promise<T> {
  let res = await fetch(url)
  if (res.status === 429) { await sleep(2000); res = await fetch(url) }
  if (!res.ok) throw new Error(`Jikan ${res.status}`)
  return res.json() as Promise<T>
}

function req<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  })
  const str = url.toString()
  const task = chain.then(() => apiFetch<T>(str))
  chain = task.then(() => sleep(300), () => sleep(300))
  return task
}

// ── Helpers ──────────────────────────────────────────────────────────
function dedupe(arr: Anime[]): Anime[] {
  const seen = new Set<number>()
  return arr.filter(a => { if (seen.has(a.mal_id)) return false; seen.add(a.mal_id); return true })
}

// Client-side adult filter: only strip genuine hentai (Rx), allow R+
function isSFW(a: Anime): boolean {
  const r = (a.rating || '').toLowerCase()
  return !r.startsWith('rx')
}

function clean(arr: Anime[]): Anime[] {
  return dedupe(arr).filter(isSFW)
}

// ── Public API ────────────────────────────────────────────────────────

export async function fetchTopAnime(page = 1, limit = 25): Promise<JikanResponse<Anime[]>> {
  const res = await req<JikanResponse<Anime[]>>('/top/anime', { page, limit })
  return { ...res, data: clean(res.data || []) }
}

export async function fetchTopByGenres(genreIds: number[], limit = 10): Promise<Anime[]> {
  const res = await req<JikanResponse<Anime[]>>('/anime', {
    genres: genreIds.join(','), order_by: 'score', sort: 'desc', limit: limit + 3,
  })
  return clean(res.data || []).slice(0, limit)
}

export async function fetchAnime(
  filters: Partial<FilterState> & { page?: number; limit?: number; order_by?: string; sort?: string }
): Promise<JikanResponse<Anime[]>> {
  const p: Record<string, string | number | undefined> = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 25,
  }
  if (filters.query?.trim()) p.q = filters.query.trim()
  if (filters.types?.length === 1)   p.type   = filters.types[0].toLowerCase()
  if (filters.ratings?.length === 1) p.rating  = filters.ratings[0]
  if (filters.statuses?.length === 1) p.status = filters.statuses[0]
  if (filters.genres?.length)        p.genres  = filters.genres.join(',')
  if (filters.excludeGenres?.length) p.genres_exclude = filters.excludeGenres.join(',')
  if (filters.years?.length) {
    const s = [...filters.years].sort()
    p.start_date = `${s[0]}-01-01`
    p.end_date   = `${s[s.length - 1]}-12-31`
  }
  // Always honour explicit ordering (even during text search)
  if (filters.order_by) { p.order_by = filters.order_by; if (filters.sort) p.sort = filters.sort }
  const res = await req<JikanResponse<Anime[]>>('/anime', p)
  return { ...res, data: clean(res.data || []) }
}

export async function fetchBrowseAnime(page = 1, limit = 14): Promise<JikanResponse<Anime[]>> {
  const res = await req<JikanResponse<Anime[]>>('/anime', {
    status: 'airing', order_by: 'members', sort: 'desc', limit, page,
  })
  return { ...res, data: clean(res.data || []) }
}

export async function fetchUpcomingAnime(page = 1, limit = 14): Promise<JikanResponse<Anime[]>> {
  const res = await req<JikanResponse<Anime[]>>('/seasons/upcoming', { page, limit })
  return { ...res, data: clean(res.data || []) }
}

export async function fetchAnimeById(id: number): Promise<{ data: Anime }> {
  return req<{ data: Anime }>(`/anime/${id}`)
}

export async function fetchRandomAnime(): Promise<{ data: Anime }> {
  return req<{ data: Anime }>('/random/anime')
}

export async function fetchSimilarAnime(genres: number[], excludeId: number, limit = 6): Promise<Anime[]> {
  if (!genres.length) return []
  try {
    const res = await req<JikanResponse<Anime[]>>('/anime', {
      genres: genres.slice(0, 2).join(','), order_by: 'score', sort: 'desc', limit: limit + 2,
    })
    return clean(res.data || []).filter(a => a.mal_id !== excludeId).slice(0, limit)
  } catch { return [] }
}

// No rate limit needed — different API (AniList allows 90 req/min)
export async function searchAnime(q: string, limit = 8): Promise<JikanResponse<Anime[]>> {
  const res = await req<JikanResponse<Anime[]>>('/anime', { q: q.trim(), limit })
  return { ...res, data: clean(res.data || []) }
}

export async function fetchAnilistBanner(malId: number): Promise<string | null> {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        query: 'query($id:Int){Media(idMal:$id,type:ANIME){bannerImage}}',
        variables: { id: malId },
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return (json?.data?.Media?.bannerImage as string) || null
  } catch { return null }
}

export function getImageUrl(anime: Anime, size: 'small' | 'medium' | 'large' = 'medium'): string {
  if (size === 'large') return anime.images?.webp?.large_image_url || anime.images?.jpg?.large_image_url || ''
  if (size === 'small') return anime.images?.webp?.small_image_url || anime.images?.jpg?.small_image_url || ''
  return anime.images?.webp?.image_url || anime.images?.jpg?.image_url || ''
}

export function formatAired(anime: Anime): string {
  const from = anime.aired?.prop?.from?.year
  const to   = anime.aired?.prop?.to?.year
  if (!from) return 'Unknown'
  if (!to || from === to) return String(from)
  return `${from} – ${to}`
}
