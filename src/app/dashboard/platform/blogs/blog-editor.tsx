'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

interface Post {
  slug: string
  title: string
  excerpt: string
  contentMarkdown: string
  coverImage: string | null
  tags: string[]
  author: string
  status: 'draft' | 'published'
  seoTitle: string | null
  seoDescription: string | null
}

export function BlogEditor({ post }: { post?: Post }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: post?.title ?? '',
    slug: post?.slug ?? '',
    excerpt: post?.excerpt ?? '',
    contentMarkdown: post?.contentMarkdown ?? '',
    coverImage: post?.coverImage ?? '',
    tags: post?.tags.join(', ') ?? '',
    author: post?.author ?? 'ClinicAI Team',
    status: post?.status ?? 'draft',
    seoTitle: post?.seoTitle ?? '',
    seoDescription: post?.seoDescription ?? '',
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function save() {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!form.contentMarkdown.trim()) {
      toast.error('Content is required')
      return
    }
    setSubmitting(true)
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt.trim(),
      contentMarkdown: form.contentMarkdown,
      coverImage: form.coverImage.trim() || undefined,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      author: form.author.trim() || 'ClinicAI Team',
      status: form.status,
      seoTitle: form.seoTitle.trim() || undefined,
      seoDescription: form.seoDescription.trim() || undefined,
    }
    const url = post ? `/api/platform/blogs/${post.slug}` : '/api/platform/blogs'
    const method = post ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    setSubmitting(false)
    if (!json.ok) {
      toast.error(json.error || 'Failed to save')
      return
    }
    toast.success(post ? 'Post updated' : 'Post created')
    router.push('/dashboard/platform/blogs')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Why clinics need an AI receptionist"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Content (Markdown)</Label>
            <Textarea
              rows={18}
              className="font-mono text-sm"
              value={form.contentMarkdown}
              onChange={(e) => set('contentMarkdown', e.target.value)}
              placeholder={'## Heading\n\nWrite your post in **Markdown**…'}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v as 'draft' | 'published')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Slug (optional)</Label>
            <Input
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              placeholder="auto-from-title"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Author</Label>
            <Input value={form.author} onChange={(e) => set('author', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Tags (comma separated)</Label>
            <Input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="AI, WhatsApp, Clinics"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Excerpt</Label>
            <Textarea
              rows={3}
              value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cover image URL (optional)</Label>
            <Input
              value={form.coverImage}
              onChange={(e) => set('coverImage', e.target.value)}
              placeholder="https://cdn.clinicai.pk/…"
            />
          </div>

          <div className="space-y-1.5">
            <Label>SEO title</Label>
            <Input
              value={form.seoTitle}
              onChange={(e) => set('seoTitle', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>SEO description</Label>
            <Textarea
              rows={2}
              value={form.seoDescription}
              onChange={(e) => set('seoDescription', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button onClick={save} disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {post ? 'Update Post' : 'Create Post'}
        </Button>
        <Button variant="ghost" onClick={() => router.push('/dashboard/platform/blogs')}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
