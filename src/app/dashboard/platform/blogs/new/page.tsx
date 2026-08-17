import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardShell, platformAdminNav } from '@/components/dashboard-shell'
import { BlogEditor } from '../blog-editor'

export const metadata = { title: 'New Post — ClinicAI Platform' }

export default async function NewBlogPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.type !== 'platform_admin') redirect('/dashboard')

  return (
    <DashboardShell userType="platform_admin" userName={session.name} navItems={platformAdminNav}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">New Post</h1>
          <p className="text-muted-foreground">Write in Markdown. Publish now or save as draft.</p>
        </div>
        <BlogEditor />
      </div>
    </DashboardShell>
  )
}
