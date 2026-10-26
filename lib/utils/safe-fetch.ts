/**
 * SSRF-safe fetching for user-supplied URLs.
 *
 * Blocks requests to loopback, private, and reserved networks before any
 * connection is opened, and follows redirects manually so every hop is
 * validated against the same policy. Only http/https on standard ports is
 * allowed. Hostnames that resolve to private addresses via public DNS cannot
 * be detected here; this fetch-time guard is the last line of defense.
 */

const MAX_REDIRECT_HOPS = 2
const ALLOWED_PORTS = new Set(['', '80', '443'])

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeUrlError'
  }
}

function parseIPv4(hostname: string): number[] | null {
  const parts = hostname.split('.')
  if (parts.length !== 4) {
    return null
  }

  const octets: number[] = []
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return null
    }

    const value = Number.parseInt(part, 10)
    if (value > 255) {
      return null
    }

    octets.push(value)
  }

  return octets
}

function isPrivateIPv4(octets: number[]): boolean {
  const [a = 0, b = 0] = octets

  return (
    a === 0 || // 0.0.0.0/8 "this network"
    a === 10 || // 10.0.0.0/8 private
    a === 127 || // 127.0.0.0/8 loopback
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 CGNAT
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local (cloud metadata)
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
    (a === 192 && b === 168) || // 192.168.0.0/16 private
    (a === 192 && b === 0 && octets[2] === 0) || // 192.0.0.0/24 + 192.0.2.0/24
    (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15 benchmarking
    a >= 224 // multicast + reserved
  )
}

function expandIPv6(hostname: string): number[] | null {
  const raw = hostname.toLowerCase()
  if (!raw.includes(':')) {
    return null
  }

  const halves = raw.split('::')
  if (halves.length > 2) {
    return null
  }

  const parseGroups = (segment: string): number[] | null => {
    if (segment === '') {
      return []
    }

    const groups: number[] = []
    for (const piece of segment.split(':')) {
      if (!/^[0-9a-f]{1,4}$/.test(piece)) {
        return null
      }
      groups.push(Number.parseInt(piece, 16))
    }
    return groups
  }

  const left = parseGroups(halves[0] ?? '')
  const right = halves.length === 2 ? parseGroups(halves[1]) : []
  if (left === null || right === null) {
    return null
  }

  if (halves.length === 1 && left.length !== 8) {
    return null
  }

  const missing = 8 - left.length - right.length
  if (missing < 0) {
    return null
  }

  const groups = [...left]
  if (halves.length === 2) {
    groups.push(...Array.from({ length: missing }, () => 0), ...right)
  }

  return groups.length === 8 ? groups : null
}

function isPrivateIPv6(groups: number[]): boolean {
  const first = groups[0] ?? 0
  const second = groups[1] ?? 0

  // Unspecified address (::)
  if (groups.every((group) => group === 0)) {
    return true
  }

  // Loopback (::1)
  if (groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1) {
    return true
  }

  // Unique local (fc00::/7)
  if ((first & 0xfe00) === 0xfc00) {
    return true
  }

  // Link local (fe80::/10)
  if ((first & 0xffc0) === 0xfe80) {
    return true
  }

  // Multicast (ff00::/8)
  if ((first & 0xff00) === 0xff00) {
    return true
  }

  // IPv4-mapped (::ffff:0:0/96) — validate the embedded IPv4 address.
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    return isPrivateIPv4([
      (groups[6] ?? 0) >> 8,
      (groups[6] ?? 0) & 0xff,
      (groups[7] ?? 0) >> 8,
      (groups[7] ?? 0) & 0xff,
    ])
  }

  // NAT64 (64:ff9b::/96) — the payload is an IPv4 address; validate it.
  if (first === 0x64 && second === 0xff9b && groups.slice(2, 6).every((group) => group === 0)) {
    return isPrivateIPv4([
      (groups[6] ?? 0) >> 8,
      (groups[6] ?? 0) & 0xff,
      (groups[7] ?? 0) >> 8,
      (groups[7] ?? 0) & 0xff,
    ])
  }

  return false
}

function isUnsafeHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, '')

  if (normalized === 'localhost' || normalized.endsWith('.localhost')) {
    return true
  }

  if (normalized.endsWith('.local') || normalized.endsWith('.internal')) {
    return true
  }

  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    const groups = expandIPv6(normalized.slice(1, -1))
    return groups === null ? true : isPrivateIPv6(groups)
  }

  const octets = parseIPv4(normalized)
  if (octets) {
    return isPrivateIPv4(octets)
  }

  if (normalized.includes(':')) {
    const groups = expandIPv6(normalized)
    return groups === null ? true : isPrivateIPv6(groups)
  }

  return false
}

export function assertSafeExternalUrl(rawUrl: string): URL {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new UnsafeUrlError(`Invalid URL: ${rawUrl}`)
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError(`Blocked non-HTTP(S) URL: ${rawUrl}`)
  }

  if (url.username || url.password) {
    throw new UnsafeUrlError(`Blocked URL with embedded credentials: ${rawUrl}`)
  }

  if (!ALLOWED_PORTS.has(url.port)) {
    throw new UnsafeUrlError(`Blocked non-standard port: ${rawUrl}`)
  }

  if (isUnsafeHostname(url.hostname)) {
    throw new UnsafeUrlError(`Blocked private or reserved host: ${rawUrl}`)
  }

  return url
}

/**
 * Fetch a user-supplied URL with SSRF protection. Redirects are followed
 * manually (up to MAX_REDIRECT_HOPS hops) so every intermediate target is
 * validated before a connection is opened.
 */
export async function safeFetch(rawUrl: string, init?: RequestInit): Promise<Response> {
  let currentUrl = assertSafeExternalUrl(rawUrl).toString()

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    const response = await fetch(currentUrl, { ...init, redirect: 'manual' })

    const location = response.headers.get('location')
    const isRedirect = response.status >= 300 && response.status < 400 && location !== null
    if (!isRedirect || hop === MAX_REDIRECT_HOPS) {
      return response
    }

    currentUrl = assertSafeExternalUrl(new URL(location, currentUrl).toString()).toString()
  }

  throw new UnsafeUrlError(`Too many redirects: ${rawUrl}`)
}
