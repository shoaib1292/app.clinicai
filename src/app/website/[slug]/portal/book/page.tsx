import { redirect } from 'next/navigation'

export default async function PortalBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/p/${slug}/book`)
}
