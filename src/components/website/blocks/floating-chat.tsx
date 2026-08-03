'use client'
import { MessageCircle } from 'lucide-react'
import type { BlockProps } from './types'
import { registerBlock } from './registry'

function FloatingChat({ clinic }: BlockProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <a href={`https://wa.me/${(clinic.whatsappNumber || '').replace(/[^0-9]/g, '')}`}
        target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform"
        style={{ backgroundColor: 'var(--website-primary)', color: '#fff' }}>
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
  )
}

registerBlock({ id: 'floating-chat', label: 'Floating Chat Button', category: 'booking', component: FloatingChat, defaultContent: {}, description: 'Fixed bottom-right WhatsApp floating action button. Visible on all pages.', requiredData: [] })
export { FloatingChat }
