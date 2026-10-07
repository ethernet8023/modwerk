import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import type { Plugin, ResolvedConfig } from 'vite'
import { threadPath } from '../src/community/forum-links.ts'
import { FORUM_CATEGORIES } from '../src/community/forum-contract.ts'
import { siteUrls } from './module-pages.ts'

/** One row of the Worker's `GET /api/forum/pages.json`: public threads only. */
export type ForumPageThread = { id: string; title: string; category: string; machine: string | null; username: string; created_at: string; updated_at: string; replies: number; excerpt: string; image: string | null }

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

/** Title lines for the card: words kept whole, at most `lines` lines of about `width` characters, the last one ending in an ellipsis when the title is longer. */
export function wrapTitle(title: string, width = 26, lines = 3): string[] {
  const out: string[] = []
  let line = ''
  const words = title.split(/\s+/).filter(Boolean).flatMap(word => word.length > width ? word.match(new RegExp(`.{1,${width}}`, 'g'))! : [word])
  for (const [index, word] of words.entries()) {
    if (line && (line + ' ' + word).length > width) {
      out.push(line)
      line = ''
      if (out.length === lines) { out[lines - 1] = out[lines - 1].slice(0, width - 1).trimEnd() + '…'; return out }
    }
    line = line ? line + ' ' + word : word
    if (index === words.length - 1) out.push(line)
  }
  return out
}

/** A 1200 × 630 card for a thread without a picture: topic, title, author and replies on the site's dark background, with the Modwerk mark. */
export async function threadCard(thread: ForumPageThread, root: string, siteName: string): Promise<Buffer> {
  const topic = (FORUM_CATEGORIES as Record<string, string>)[thread.category] ?? thread.category
  const mark = readFileSync(resolve(root, 'public/modwerk-mark.svg'), 'utf8').replace(/<svg\b[^>]*>/, '<svg x="1040" y="48" width="112" height="112" viewBox="1 1 58 58">')
  const lines = wrapTitle(thread.title)
  const size = 76, top = 300 - ((lines.length - 1) * size) / 2
  const replies = thread.replies === 1 ? '1 reply' : `${thread.replies} replies`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><radialGradient id="glow" cx="60%" cy="100%" r="75%"><stop stop-color="#8c9eff" stop-opacity=".12"/><stop offset="1" stop-color="#8c9eff" stop-opacity="0"/></radialGradient></defs>
    <rect width="1200" height="630" fill="#1c1c22"/><rect width="1200" height="630" fill="url(#glow)"/>
    ${mark}
    <text x="64" y="96" fill="#8c9eff" font-family="monospace" font-size="28" letter-spacing="2">${escapeHtml((siteName + ' forum · ' + topic).toUpperCase())}</text>
    ${lines.map((line, index) => `<text x="64" y="${top + index * size}" fill="#ececf1" font-family="sans-serif" font-weight="700" font-size="${size - 12}">${escapeHtml(line)}</text>`).join('')}
    <text x="64" y="570" fill="#ffb784" font-family="monospace" font-size="28">@${escapeHtml(thread.username)}</text>
    <text x="1136" y="570" text-anchor="end" fill="#ececf1" opacity=".7" font-family="monospace" font-size="28">${thread.replies > 0 ? replies : 'Join the discussion'}</text>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer()
}

/** The built app page with the thread's title, description and preview card, loading its assets relative to its own depth like the module pages. `cardPath` is a generated card used when the thread has no picture. */
export function forumThreadPageHtml(html: string, thread: ForumPageThread, base: string, cardPath?: string): string {
  const { appUrl, siteName } = siteUrls(html, base)
  const path = threadPath(thread.id, thread.title), pageUrl = new URL(path, appUrl).href
  const topic = (FORUM_CATEGORIES as Record<string, string>)[thread.category] ?? thread.category
  const title = thread.title + ' — ' + siteName + ' forum'
  const description = thread.excerpt || `A ${topic} discussion started by @${thread.username} on the ${siteName} forum.`
  const values: Record<string, string> = {
    description, 'og:type': 'article', 'og:title': title, 'og:description': description, 'og:url': pageUrl,
    'twitter:title': title, 'twitter:description': description,
    ...(thread.image ? { 'og:image': thread.image, 'og:image:alt': 'Image from the discussion', 'twitter:image': thread.image, 'twitter:image:alt': 'Image from the discussion' }
      : cardPath ? { 'og:image': new URL(cardPath, appUrl).href, 'og:image:alt': 'Forum thread: ' + thread.title, 'twitter:image': new URL(cardPath, appUrl).href, 'twitter:image:alt': 'Forum thread: ' + thread.title } : {}),
  }
  const page = html
    .replace(/<base href="[^"]*"\s*\/>/, `<base href="${escapeHtml(base.startsWith('/') ? base : '../'.repeat(path.split('/').length - 1))}" />`)
    .replace(/(<meta (?:property|name)="([^"]+)" content=")[^"]*("\s*\/>)/g, (tag, start, key: string, end) => key in values ? start + escapeHtml(values[key]) + end : tag)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>\n    <link rel="canonical" href="${escapeHtml(pageUrl)}" />`)
  // The site card's size and type do not describe a member's picture.
  return thread.image ? page.replace(/\s*<meta property="og:image:(?:type|width|height)" content="[^"]*"\s*\/>/g, '') : page
}

function isThread(value: unknown): value is ForumPageThread {
  const thread = value as ForumPageThread | null
  return !!thread && typeof thread === 'object' && typeof thread.id === 'string' && /^[a-zA-Z0-9-]+$/.test(thread.id) && typeof thread.title === 'string' && typeof thread.category === 'string' && typeof thread.username === 'string' && typeof thread.excerpt === 'string'
    && (thread.image === null || (typeof thread.image === 'string' && /^https:\/\//.test(thread.image)))
}

/** The public thread list, or nothing when the API is unreachable: the site must still build without its community service. */
export async function fetchForumThreads(api: string, warn: (message: string) => void): Promise<ForumPageThread[]> {
  try {
    const response = await fetch(new URL('forum/pages.json', api.replace(/\/?$/, '/')), { signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    const body = (await response.json()) as { threads?: unknown }
    if (!Array.isArray(body.threads)) throw new Error('no thread list')
    return body.threads.filter(isThread)
  } catch (error) {
    warn(`Forum thread pages were skipped: ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

/** Static pages for every public thread, plus robots.txt pointing crawlers at the Worker's sitemap. */
export function forumPages(api: string | undefined): Plugin {
  let config: ResolvedConfig
  return {
    name: 'modwerk-forum-pages',
    apply: 'build',
    enforce: 'post',
    configResolved(resolved) { config = resolved },
    async generateBundle(_options, bundle) {
      const index = bundle['index.html']
      if (!index || index.type !== 'asset') throw new Error('Missing built app HTML for forum pages.')
      const html = String(index.source)
      const sitemap = api ? new URL('forum/sitemap.xml', api.replace(/\/?$/, '/')).href : ''
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: 'User-agent: *\nAllow: /\n' + (sitemap ? 'Sitemap: ' + sitemap + '\n' : '') })
      if (!api) return
      const { siteName } = siteUrls(html, config.base)
      for (const thread of await fetchForumThreads(api, message => this.warn(message))) {
        let cardPath: string | undefined
        if (!thread.image) {
          const card = await threadCard(thread, config.root, siteName)
          cardPath = `forum-thumbnails/${thread.id}-${createHash('sha256').update(card).digest('hex').slice(0, 12)}.jpg`
          this.emitFile({ type: 'asset', fileName: cardPath, source: card })
        }
        const page = forumThreadPageHtml(html, thread, config.base, cardPath), canonical = threadPath(thread.id, thread.title), plain = threadPath(thread.id)
        this.emitFile({ type: 'asset', fileName: canonical + 'index.html', source: page })
        if (plain !== canonical) this.emitFile({ type: 'asset', fileName: plain + 'index.html', source: page })
      }
    },
  }
}
