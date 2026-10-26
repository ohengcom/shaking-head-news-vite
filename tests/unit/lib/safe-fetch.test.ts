import { describe, it, expect } from 'vitest'
import { assertSafeExternalUrl, UnsafeUrlError } from '@/lib/utils/safe-fetch'

describe('safe-fetch SSRF protection', () => {
  it('allows valid public HTTP and HTTPS URLs', () => {
    expect(() => assertSafeExternalUrl('https://example.com/feed.xml')).not.toThrow()
    expect(() => assertSafeExternalUrl('http://news.ycombinator.com/rss')).not.toThrow()
    expect(() => assertSafeExternalUrl('https://feeds.bbci.co.uk/news/rss.xml')).not.toThrow()
  })

  it('allows explicit port 80 and 443', () => {
    expect(() => assertSafeExternalUrl('http://example.com:80/rss')).not.toThrow()
    expect(() => assertSafeExternalUrl('https://example.com:443/rss')).not.toThrow()
  })

  it('rejects non-HTTP protocols', () => {
    expect(() => assertSafeExternalUrl('ftp://example.com/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('file:///etc/passwd')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('javascript:alert(1)')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('data:text/xml,<rss></rss>')).toThrow(UnsafeUrlError)
  })

  it('rejects non-standard ports', () => {
    expect(() => assertSafeExternalUrl('http://example.com:8080/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://example.com:22/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://example.com:3000/rss')).toThrow(UnsafeUrlError)
  })

  it('rejects URLs with embedded credentials', () => {
    expect(() => assertSafeExternalUrl('https://user:pass@example.com/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('https://admin@example.com/rss')).toThrow(UnsafeUrlError)
  })

  it('blocks IPv4 loopback and private networks', () => {
    expect(() => assertSafeExternalUrl('http://127.0.0.1/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://127.0.0.2:80/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://10.0.0.1/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://172.16.0.1/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://172.31.255.255/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://192.168.1.1/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://169.254.169.254/metadata')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://0.0.0.0/rss')).toThrow(UnsafeUrlError)
  })

  it('blocks localhost and internal hostnames', () => {
    expect(() => assertSafeExternalUrl('http://localhost/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://sub.localhost/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://service.local/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://cluster.internal/rss')).toThrow(UnsafeUrlError)
  })

  it('blocks IPv6 loopback, link-local, and unique-local networks', () => {
    expect(() => assertSafeExternalUrl('http://[::1]/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://[::]/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://[fc00::1]/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://[fe80::1]/rss')).toThrow(UnsafeUrlError)
  })

  it('blocks IPv4-mapped IPv6 private addresses', () => {
    expect(() => assertSafeExternalUrl('http://[::ffff:127.0.0.1]/rss')).toThrow(UnsafeUrlError)
    expect(() => assertSafeExternalUrl('http://[::ffff:192.168.0.1]/rss')).toThrow(UnsafeUrlError)
  })
})
