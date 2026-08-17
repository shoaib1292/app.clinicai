import { NextRequest } from 'next/server'
import { ok, err, handle } from '@/lib/api'
import { listBlogPosts, getBlogPost } from '@/lib/blog'

// Public read-only endpoints consumed by the landing page (clinicai.pk).
// GET /api/public/blogs?slug=... — single published post, or list when no slug.
async function list(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get('slug')
  if (slug) {
    const post = await getBlogPost(slug)
    if (!post || post.status !== 'published') return err('Post not found', 404)
    return ok({ post })
  }
  const posts = await listBlogPosts(false)
  return ok({ posts })
}

export const GET = handle(list)
