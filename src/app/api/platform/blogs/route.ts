import { NextRequest } from 'next/server'
import { requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { listBlogPosts, createBlogPost } from '@/lib/blog'

// GET /api/platform/blogs — list all posts (drafts included) for admin
// POST /api/platform/blogs — create post (platform admin only)
async function list() {
  await requireType('platform_admin', 'platform_staff')
  const posts = await listBlogPosts(true)
  return ok(posts)
}

async function create(req: NextRequest) {
  const session = await requireType('platform_admin')
  const body = await req.json().catch(() => ({}))
  const {
    slug, title, excerpt, contentMarkdown, coverImage, tags, author,
    status, seoTitle, seoDescription, publishedAt,
  } = body as Record<string, unknown>

  if (!title || typeof title !== 'string' || !title.trim()) {
    return err('Title is required', 400)
  }
  if (!contentMarkdown || typeof contentMarkdown !== 'string' || !contentMarkdown.trim()) {
    return err('Content is required', 400)
  }

  const post = await createBlogPost({
    slug: typeof slug === 'string' ? slug : undefined,
    title: title.trim(),
    excerpt: typeof excerpt === 'string' ? excerpt : undefined,
    contentMarkdown,
    coverImage: typeof coverImage === 'string' ? coverImage : undefined,
    tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : undefined,
    author: typeof author === 'string' ? author : undefined,
    status: status === 'published' ? 'published' : 'draft',
    seoTitle: typeof seoTitle === 'string' ? seoTitle : undefined,
    seoDescription: typeof seoDescription === 'string' ? seoDescription : undefined,
    publishedAt: typeof publishedAt === 'string' ? publishedAt : undefined,
  })

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    action: 'blog_post_created',
    target: post.id,
    metadata: { slug: post.slug, title: post.title },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok(post)
}

export const GET = handle(list)
export const POST = handle(create)
