'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface Post {
  id: string
  slug: string
  title: string
  excerpt: string
  author: string
  status: 'draft' | 'published'
  publishedAt: Date | null
  updatedAt: Date
}

function fmtDate(iso: Date | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${yyyy}-${mm}-${dd}`
}

export function BlogsClient({ posts, isAdmin }: { posts: Post[]; isAdmin: boolean }) {
  const router = useRouter()
  const [list, setList] = useState(posts)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function remove(slug: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeleting(slug)
    const res = await fetch(`/api/platform/blogs/${slug}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    setDeleting(null)
    if (!json.ok) {
      toast.error(json.error || 'Failed to delete')
      return
    }
    setList((prev) => prev.filter((p) => p.slug !== slug))
    toast.success('Post deleted')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Blog</h1>
          <p className="text-muted-foreground">
            Manage marketing posts shown on the clinicai.pk blog.
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/dashboard/platform/blogs/new">
              <Plus className="w-4 h-4 mr-2" />New Post
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {list.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{p.title}</span>
                    {p.status === 'published' ? (
                      <Badge variant="default" className="text-xs gap-1">
                        <Eye className="w-3 h-3" />Live
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <EyeOff className="w-3 h-3" />Draft
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    /blog/{p.slug} · {p.author} · updated {fmtDate(p.updatedAt)}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/platform/blogs/${p.slug}/edit`}>
                        <Pencil className="w-3.5 h-3.5 mr-1" />Edit
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={deleting === p.slug}
                      onClick={() => remove(p.slug, p.title)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {list.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No posts yet. Create your first one.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
