import { db } from '@/lib/db'

export type BlogStatus = 'draft' | 'published'

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function serializeTags(tags: string[]): string {
  return JSON.stringify(tags ?? [])
}

function deserializeTags(tags: string): string[] {
  try {
    const parsed = JSON.parse(tags)
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}

export interface BlogPostShape {
  id: string
  slug: string
  title: string
  excerpt: string
  contentMarkdown: string
  coverImage: string | null
  tags: string[]
  author: string
  status: BlogStatus
  seoTitle: string | null
  seoDescription: string | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

type BlogRow = {
  id: string
  slug: string
  title: string
  excerpt: string
  contentMarkdown: string
  coverImage: string | null
  tags: string
  author: string
  status: string
  seoTitle: string | null
  seoDescription: string | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

function toShape(row: BlogRow): BlogPostShape {
  return {
    ...row,
    tags: deserializeTags(row.tags),
    status: row.status === 'published' ? 'published' : 'draft',
  }
}

export async function listBlogPosts(includeDrafts = false): Promise<BlogPostShape[]> {
  const rows = await db.blogPost.findMany({
    where: { deletedAt: null, ...(includeDrafts ? {} : { status: 'published' }) },
    orderBy: { publishedAt: 'desc' },
  })
  return rows.map(toShape)
}

export async function getBlogPost(slug: string): Promise<BlogPostShape | null> {
  const row = await db.blogPost.findFirst({ where: { slug, deletedAt: null } })
  return row ? toShape(row) : null
}

export async function createBlogPost(input: {
  slug?: string
  title: string
  excerpt?: string
  contentMarkdown: string
  coverImage?: string
  tags?: string[]
  author?: string
  status?: BlogStatus
  seoTitle?: string
  seoDescription?: string
  publishedAt?: string
}): Promise<BlogPostShape> {
  const slug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title)
  if (!slug) throw new Error('Slug could not be generated from title')

  const existing = await db.blogPost.findFirst({ where: { slug, deletedAt: null } })
  if (existing) throw new Error(`A post with slug "${slug}" already exists.`)

  const isPublished = input.status === 'published'
  const now = new Date()
  const publishedAt = input.publishedAt
    ? new Date(input.publishedAt)
    : isPublished
      ? now
      : null

  const row = await db.blogPost.create({
    data: {
      slug,
      title: input.title,
      excerpt: input.excerpt ?? '',
      contentMarkdown: input.contentMarkdown,
      coverImage: input.coverImage ?? null,
      tags: serializeTags(input.tags ?? []),
      author: input.author || 'ClinicAI Team',
      status: input.status ?? 'draft',
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      publishedAt,
    },
  })
  return toShape(row)
}

export async function updateBlogPost(
  slug: string,
  input: {
    title?: string
    excerpt?: string
    contentMarkdown?: string
    coverImage?: string
    tags?: string[]
    author?: string
    status?: BlogStatus
    seoTitle?: string
    seoDescription?: string
    publishedAt?: string
  },
): Promise<BlogPostShape | null> {
  const existing = await db.blogPost.findFirst({ where: { slug, deletedAt: null } })
  if (!existing) return null

  const isPublishing = input.status === 'published' && existing.status !== 'published'
  const now = new Date()

  const row = await db.blogPost.update({
    where: { id: existing.id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
      ...(input.contentMarkdown !== undefined ? { contentMarkdown: input.contentMarkdown } : {}),
      ...(input.coverImage !== undefined ? { coverImage: input.coverImage || null } : {}),
      ...(input.tags !== undefined ? { tags: serializeTags(input.tags) } : {}),
      ...(input.author !== undefined ? { author: input.author } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle || null } : {}),
      ...(input.seoDescription !== undefined ? { seoDescription: input.seoDescription || null } : {}),
      ...(input.publishedAt !== undefined ? { publishedAt: input.publishedAt ? new Date(input.publishedAt) : null } : {}),
      ...(isPublishing && !existing.publishedAt ? { publishedAt: now } : {}),
    },
  })
  return toShape(row)
}

export async function deleteBlogPost(slug: string): Promise<boolean> {
  const existing = await db.blogPost.findFirst({ where: { slug, deletedAt: null } })
  if (!existing) return false
  await db.blogPost.update({ where: { id: existing.id }, data: { deletedAt: new Date() } })
  return true
}
