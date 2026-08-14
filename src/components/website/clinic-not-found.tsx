'use client'

import Link from 'next/link'
import { Stethoscope, ArrowLeft, Home } from 'lucide-react'

interface ClinicNotFoundProps {
  clinic: {
    name: string
    slug: string
    city: string | null
    brandColor: string | null
    logoUrl: string | null
    logoKey: string | null
    websiteEnabled: boolean
    id: string
  } | null
  host: string
}

export function ClinicNotFound({ clinic, host }: ClinicNotFoundProps) {
  // Determine context from host and clinic data
  const isClinicDomain = clinic && clinic.websiteEnabled
  const isAppDashboard = host.startsWith('app.')

  const homeHref = isClinicDomain
    ? `/`
    : isAppDashboard
    ? '/login'
    : 'https://clinicai.pk'
  const homeLabel = isClinicDomain
    ? `Back to ${clinic.name}`
    : 'Go to ClinicAI'
  const subtitle = isClinicDomain
    ? `You're on ${clinic.name}'s website but this page doesn't exist.`
    : isAppDashboard
    ? `The page you're looking for doesn't exist in the dashboard.`
    : `This page doesn't exist.`

  const brandColor = clinic?.brandColor || '#111111'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8f9fa' }}>
      {/* Simple branded header */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md h-14 flex items-center px-4"
        style={{
          background: 'color-mix(in srgb, #ffffff 85%, transparent)',
          borderColor: '#e5e7eb',
        }}
      >
        {isClinicDomain ? (
          <Link href="/" className="flex items-center gap-2 font-semibold text-sm text-gray-900 hover:opacity-80">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: brandColor }}
            >
              {clinic.name.charAt(0)}
            </div>
            {clinic.name}
          </Link>
        ) : (
          <Link href="https://clinicai.pk" className="flex items-center gap-2 font-semibold text-sm text-gray-900 hover:opacity-80">
            <Stethoscope className="w-5 h-5" style={{ color: brandColor }} />
            ClinicAI
          </Link>
        )}
      </header>

      {/* 404 content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6" style={{ background: `color-mix(in srgb, ${brandColor} 10%, transparent)` }}>
            <Stethoscope className="w-10 h-10" style={{ color: brandColor }} />
          </div>

          <h1 className="text-5xl font-bold mb-2 text-gray-900">404</h1>
          <p className="text-xl text-gray-500 mb-2">Page not found</p>
          <p className="text-sm text-gray-400 mb-8">{subtitle}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={homeHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ background: brandColor }}
            >
              <Home className="w-4 h-4" />
              {homeLabel}
            </Link>
            {isClinicDomain && (
              <Link
                href="https://clinicai.pk"
                className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors"
                style={{
                  background: 'transparent',
                  color: brandColor,
                  border: `1.5px solid ${brandColor}`,
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                ClinicAI Home
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-400">
        Powered by ClinicAI
      </footer>
    </div>
  )
}
