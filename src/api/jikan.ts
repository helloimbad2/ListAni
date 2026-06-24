import { Anime, FilterState, JikanResponse } from '../types'

const BASE = 'https://api.jikan.moe/v4'

// ── Proper FIFO request queue ─────────────────────────────────────────
// Jikan free tier: 3 req/sec, 60/min. We space requests 400ms apart.
type QItem = { fn: () => Promise<unknown>; ok: (v: unknown) => void; err: (e: unknown) => void }
const Q: QItem[] = []
let qRunning = false

async function drain() {
  if (qRunning) return
  qRunning = true
  while (Q.length > 0) {
    const item = Q.shift()!
    try { item.ok(await item.fn()) } catch (e) { item.err(e) }
    if (Q.length > 0) await new Promise(r => setTimeout(r, 420))
  }
  qRunning = false
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((ok, err) => { Q.push({ fn: fn as () => Promise<unknown>, ok: ok as (v: unknown) => void, err }); drain() })
}

async function apiFetch(path: string, params: Record<string, string | number | undefined> = {}) {
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  })
  const res = await fetch(url.toString())
  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 2000))
    const r2 = await fetch(url.toString())
    if (!r2.ok) throw new Error(`API ${r2.status}`)
    return r2.json()
  }
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

function req<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  return enqueue(() => apiFetch(path, params))
}

function dedupe(arr: Anime[]): Anime[] {
  const seen = new Set<number>()
  return arr.filter(a => { if (seen.has(a.mal_id)) return false; seen.add(a.mal_id); return true })
}

const SFW = { sfw: 'true' }

// ── Public API ────────────────────────────────────────────────────────

export async function fetchTopAnime(page = 1, limit = 25): Promise<JikanResponse<Anime[]>> {
  const res: JikanResponse<Anime[]> = await req('/top/anime', { page, limit, ...SFW })
  return { ...res, data: dedupe(res.data || []) }
}

export async function fetchTopByGenres(genreIds: number[], limit = 10): Promise<Anime[]> {
  const res: JikanResponse<Anime[]> = await req('/anime', {
    genres: genreIds.join(','), order_by: 'score', sort: 'desc', limit, min_score: 5, ...SFW,
  })
  return dedupe(res.data || [])
}

export async function fetchAnime(
  filters: Partial<FilterState> & { page?: number; limit?: number; order_by?: string; sort?: string }
): Promise<JikanResponse<Anime[]>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page ?? 1, limit: filters.limit ?? 25, ...SFW,
  }
  if (filters.query?.trim()) params.q = filters.query.trim()
  if (filters.types?.length === 1) params.type = filters.types[0].toLowerCase()
  if (filters.ratings?.length === 1) params.rating = filters.ratings[0]
  if (filters.statuses?.length === 1) params.status = filters.statuses[0]
  if (filters.genres?.length) params.genres = filters.genres.join(',')
  if (filters.excludeGenres?.length) params.genres_exclude = filters.excludeGenres.join(',')
  if (filters.years?.length) {
    const sorted = [...filters.years].sort()
    params.start_date = `${sorted[0]}-01-01`
    params.end_date = `${sorted[sorted.length - 1]}-12-31`
  }
  // Apply ordering — always honour explicit order_by; omit only when caller didn't pass one
  if (filters.order_by) { params.order_by = filters.order_by; if (filters.sort) params.sort = filters.sort }
  const res: JikanResponse<Anime[]> = await req('/anime', params)
  return { ...res, data: dedupe(res.data || []) }
}

export async function fetchBrowseAnime(page = 1, limit = 14): Promise<JikanResponse<Anime[]>> {
  const res: JikanResponse<Anime[]> = await req('/anime', {
    status: 'airing', order_by: 'members', sort: 'desc', limit, page, ...SFW,
  })
  return { ...res, data: dedupe(res.data || []) }
}

export async function fetchUpcomingAnime(page = 1, limit = 14): Promise<JikanResponse<Anime[]>> {
  const res: JikanResponse<Anime[]> = await req('/seasons/upcoming', { page, limit, ...SFW })
  return { ...res, data: dedupe(res.data || []) }
}

export async function fetchAnimeById(id: number): Promise<{ data: Anime }> {
  return req(`/anime/${id}`)
}

export async function fetchRandomAnime(): Promise<{ data: Anime }> {
  return req('/random/anime')
}

export async function fetchSimilarAnime(genres: number[], excludeId: number, limit = 6): Promise<Anime[]> {
  if (!genres.length) return []
  try {
    const res: JikanResponse<Anime[]> = await req('/anime', {
      genres: genres.slice(0, 2).join(','), order_by: 'score', sort: 'desc', limit: limit + 1, ...SFW,
    })
    return dedupe(res.data || []).filter(a => a.mal_id !== excludeId).slice(0, limit)
  } catch { return [] }
}

export async function searchAnime(q: string, limit = 8): Promise<JikanResponse<Anime[]>> {
  const res: JikanResponse<Anime[]> = await req('/anime', {
    q: q.trim(), limit, order_by: 'members', sort: 'desc', ...SFW,
  })
  return { ...res, data: dedupe(res.data || []) }
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

// ── AniList banner (separate API, not subject to Jikan rate limit) ────
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
  } catch {
    return null
  }
}
