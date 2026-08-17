import { NextRequest } from 'next/server'
import { requireType, auditLog } from '@/lib/session'
import { ok, err, handle } from '@/lib/api'
import { updateBlogPost, deleteBlogPost } from '@/lib/blog'

// PATCH /api/platform/blogs/[slug] — update (platform admin only)
// DELETE /api/platform/blogs/[slug] — soft delete (platform admin only)
async function patch(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await requireType('platform_admin')
  const body = await req.json().catch(() => ({}))
  const {
    title, excerpt, contentMarkdown, coverImage, tags, author,
    status, seoTitle, seoDescription, publishedAt,
  } = body as Record<string, unknown>

  const post = await updateBlogPost(slug, {
    ...(title !== undefined ? { title: String(title) } : {}),
    ...(excerpt !== undefined ? { excerpt: String(excerpt) } : {}),
    ...(contentMarkdown !== undefined ? { contentMarkdown: String(contentMarkdown) } : {}),
    ...(coverImage !== undefined ? { coverImage: String(coverImage) } : {}),
    ...(tags !== undefined ? { tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [] } : {}),
    ...(author !== undefined ? { author: String(author) } : {}),
    ...(status !== undefined ? { status: status === 'published' ? 'published' : 'draft' } : {}),
    ...(seoTitle !== undefined ? { seoTitle: String(seoTitle) } : {}),
    ...(seoDescription !== undefined ? { seoDescription: String(seoDescription) } : {}),
    ...(publishedAt !== undefined ? { publishedAt: String(publishedAt) } : {}),
  })

  if (!post) return err('Post not found', 404)

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    action: 'blog_post_updated',
    target: post.id,
    metadata: { slug: post.slug, title: post.title },
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok(post)
}

async function remove(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await requireType('platform_admin')
  const deleted = await deleteBlogPost(slug)
  if (!deleted) return err('Post not found', 404)

  await auditLog({
    actorId: session.sub,
    actorType: session.type,
    action: 'blog_post_deleted',
    target: slug,
    ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
  })

  return ok({ deleted: true })
}

export const PATCH = handle(patch)
export const DELETE = handle(remove)
