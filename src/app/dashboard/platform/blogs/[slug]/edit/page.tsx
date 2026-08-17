import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardShell, platformAdminNav } from '@/components/dashboard-shell'
import { getBlogPost } from '@/lib/blog'
import { BlogEditor } from '../../blog-editor'

export const metadata = { title: 'Edit Post — ClinicAI Platform' }

export default async function EditBlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin') redirect('/dashboard')

  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) notFound()

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={platformAdminNav}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Post</h1>
          <p className="text-muted-foreground">/blog/{post.slug}</p>
        </div>
        <BlogEditor post={post} />
      </div>
    </DashboardShell>
  )
}
