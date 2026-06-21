import { Anime, FilterState, JikanResponse } from '../types'

const BASE = 'https://api.jikan.moe/v4'
let lastReq = 0
const DELAY = 450

async function req<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const wait = Math.max(0, DELAY - (Date.now() - lastReq))
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastReq = Date.now()

  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  })

  const res = await fetch(url.toString())
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1600))
    const res2 = await fetch(url.toString())
    if (!res2.ok) throw new Error(`API ${res2.status}`)
    return res2.json()
  }
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

function dedupe(arr: Anime[]): Anime[] {
  const seen = new Set<number>()
  return arr.filter((a) => { if (seen.has(a.mal_id)) return false; seen.add(a.mal_id); return true })
}

// sfw=true removes Rx (hentai) but keeps R+ (ecchi) — exactly what we want
const SFW = { sfw: 'true' }

export async function fetchTopAnime(page = 1, limit = 25): Promise<JikanResponse<Anime[]>> {
  const res: JikanResponse<Anime[]> = await req('/top/anime', { page, limit, ...SFW })
  return { ...res, data: dedupe(res.data || []) }
}

export async function fetchAnime(
  filters: Partial<FilterState> & { page?: number; limit?: number; order_by?: string; sort?: string }
): Promise<JikanResponse<Anime[]>> {
  const params: Record<string, string | number | undefined> = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 24,
    ...SFW,
  }
  if (filters.query?.trim()) params.q = filters.query.trim()
  if (filters.types?.length === 1) params.type = filters.types[0].toLowerCase()
  if (filters.ratings?.length === 1) params.rating = filters.ratings[0]
  if (filters.statuses?.length === 1) params.status = filters.statuses[0]
  // genres + themes in one param (Jikan v4 supports comma-separated for both)
  if (filters.genres?.length) params.genres = filters.genres.join(',')
  if (filters.years?.length) {
    const sorted = [...filters.years].sort()
    params.start_date = `${sorted[0]}-01-01`
    params.end_date = `${sorted[sorted.length - 1]}-12-31`
  }
  if (!filters.query && filters.order_by) { params.order_by = filters.order_by; params.sort = filters.sort }
  const res: JikanResponse<Anime[]> = await req('/anime', params)
  return { ...res, data: dedupe(res.data || []) }
}

export async function fetchBrowseAnime(page = 1, limit = 12): Promise<JikanResponse<Anime[]>> {
  const res: JikanResponse<Anime[]> = await req('/anime', { status: 'airing', order_by: 'members', sort: 'desc', limit, page, ...SFW })
  return { ...res, data: dedupe(res.data || []) }
}

export async function fetchUpcomingAnime(page = 1, limit = 12): Promise<JikanResponse<Anime[]>> {
  const res: JikanResponse<Anime[]> = await req('/seasons/upcoming', { page, limit, ...SFW })
  return { ...res, data: dedupe(res.data || []) }
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

export async function searchAnime(q: string, limit = 12): Promise<JikanResponse<Anime[]>> {
  const res: JikanResponse<Anime[]> = await req('/anime', { q: q.trim(), limit, order_by: 'members', sort: 'desc', ...SFW })
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
