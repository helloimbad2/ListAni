import { Anime, FilterState, JikanResponse } from '../types'

const BASE = 'https://api.jikan.moe/v4'
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ── Promise-chain rate limiter ────────────────────────────────────────
// Works by chaining each request onto the previous one + 350 ms gap.
// Critically: the chain always resolves (never rejects) so a failed
// request can never "freeze" the queue for subsequent callers.
//
// Old FIFO queue bug: if item.fn() threw AND drain() was mid-loop,
// qRunning stayed true and ALL future requests were silently dropped.
let chain: Promise<void> = Promise.resolve()

async function apiFetch<T>(url: string, attempt = 0): Promise<T> {
  const res = await fetch(url)
  if (res.status === 429) {
    if (attempt >= 2) throw new Error('Rate limited after retries')
    await sleep(2500)
    return apiFetch<T>(url, attempt + 1)
  }
  if (!res.ok) throw new Error(`Jikan ${res.status}: ${url}`)
  return res.json() as Promise<T>
}

function req<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  })
  const urlStr = url.toString()

  return new Promise<T>((resolve, reject) => {
    // Append this request to the chain. The chain itself never rejects
    // (errors are caught and forwarded to the individual promise).
    chain = chain.then(async () => {
      try {
        resolve(await apiFetch<T>(urlStr))
      } catch (e) {
        reject(e)
      }
      // Always wait before the next request, even on error
      await sleep(350)
    })
  })
}

// ── Helpers ───────────────────────────────────────────────────────────
function dedupe(arr: Anime[]): Anime[] {
  const seen = new Set<number>()
  return arr.filter(a => {
    if (seen.has(a.mal_id)) return false
    seen.add(a.mal_id)
    return true
  })
}

// Only filter genuine hentai (Rx rating). Do NOT use sfw=true API param
// because it also strips many legitimate R+ (ecchi) and even some R17 shows,
// causing "anime not found" reports like the one that prompted this fix.
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
    genres: genreIds.join(','),
    order_by: 'score',
    sort: 'desc',
    limit: Math.min(limit + 4, 25),
  })
  return clean(res.data || []).slice(0, limit)
}

export async function fetchAnime(
  filters: Partial<FilterState> & {
    page?: number; limit?: number; order_by?: string; sort?: string
  }
): Promise<JikanResponse<Anime[]>> {
  const p: Record<string, string | number | undefined> = {
    page:  filters.page  ?? 1,
    limit: filters.limit ?? 25,
  }
  if (filters.query?.trim())          p.q             = filters.query.trim()
  if (filters.types?.length === 1)    p.type          = filters.types[0].toLowerCase()
  if (filters.ratings?.length === 1)  p.rating        = filters.ratings[0]
  if (filters.statuses?.length === 1) p.status        = filters.statuses[0]
  if (filters.genres?.length)         p.genres        = filters.genres.join(',')
  if (filters.excludeGenres?.length)  p.genres_exclude = filters.excludeGenres.join(',')
  if (filters.years?.length) {
    const s = [...filters.years].sort()
    p.start_date = `${s[0]}-01-01`
    p.end_date   = `${s[s.length - 1]}-12-31`
  }
  // Always apply ordering when provided (not just when no query)
  if (filters.order_by) {
    p.order_by = filters.order_by
    if (filters.sort) p.sort = filters.sort
  }
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

// Search: no order_by override — Jikan relevance ranking is best for text queries
export async function searchAnime(q: string, limit = 8): Promise<JikanResponse<Anime[]>> {
  const res = await req<JikanResponse<Anime[]>>('/anime', { q: q.trim(), limit })
  return { ...res, data: clean(res.data || []) }
}

// AniList banner fetch — completely independent from Jikan, no rate limit shared
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
