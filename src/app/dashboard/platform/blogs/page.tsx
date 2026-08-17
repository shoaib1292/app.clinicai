import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardShell, platformAdminNav } from '@/components/dashboard-shell'
import { listBlogPosts } from '@/lib/blog'
import { BlogsClient } from './blogs-client'

export const metadata = { title: 'Blog — ClinicAI Platform' }

export default async function BlogsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin' && session.type !== 'platform_staff') redirect('/dashboard')

  const posts = await listBlogPosts(true)
  const isAdmin = session.type === 'platform_admin'

  return (
    <DashboardShell userType={session.type as any} userName={session.name} navItems={platformAdminNav}>
      <BlogsClient posts={posts} isAdmin={isAdmin} />
    </DashboardShell>
  )
}
