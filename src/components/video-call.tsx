'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { PhoneOff, Maximize2, Minimize2, Loader2 } from 'lucide-react'

interface VideoCallProps {
  roomUrl: string
  roomName: string
  participantName: string
  showEndButton?: boolean
  onEnd?: () => void
}

export function VideoCall({ roomUrl, roomName, participantName, showEndButton, onEnd }: VideoCallProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [callActive, setCallActive] = useState(true)

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch {
      // Fullscreen not supported
    }
  }, [])

  useEffect(() => {
    const handleFsChange = () => { setIsFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const handleEnd = async () => {
    setIsEnding(true)
    try {
      const res = await fetch('/api/dailyco/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName }),
      })
      if (res.ok) {
        setCallActive(false)
        onEnd?.()
      }
    } catch {
      // Best effort
    } finally {
      setIsEnding(false)
    }
  }

  const iframeUrl = `${roomUrl}?name=${encodeURIComponent(participantName)}`

  if (!callActive) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-4">
        <PhoneOff className="size-10" />
        <p>Call ended</p>
        {onEnd && (
          <Button variant="outline" onClick={onEnd}>Close</Button>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ aspectRatio: '16/9', maxHeight: '80vh' }}>
      <iframe
        ref={iframeRef}
        src={iframeUrl}
        allow="camera; microphone; fullscreen; display-capture"
        className="w-full h-full rounded-lg border bg-black"
        style={{ border: 0 }}
      />

      {/* Controls overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/70 backdrop-blur-sm rounded-full px-4 py-2.5">
        <button
          onClick={toggleFullscreen}
          className="text-white/80 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
        </button>

        {showEndButton && (
          <button
            onClick={handleEnd}
            disabled={isEnding}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-full p-2.5 transition-colors disabled:opacity-50"
            title="End call"
          >
            {isEnding ? <Loader2 className="size-5 animate-spin" /> : <PhoneOff className="size-5" />}
          </button>
        )}
      </div>
    </div>
  )
}

/** Wrapper that opens VideoCall inside a Dialog */
export function VideoCallDialog({
  open, onClose, roomUrl, roomName, participantName, showEndButton,
}: {
  open: boolean
  onClose: () => void
  roomUrl: string
  roomName: string
  participantName: string
  showEndButton?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-4xl p-2 bg-black/95 border-white/10">
        <DialogTitle className="sr-only">Video Call</DialogTitle>
        <VideoCall
          roomUrl={roomUrl}
          roomName={roomName}
          participantName={participantName}
          showEndButton={showEndButton}
          onEnd={() => { setTimeout(onClose, 2000) }}
        />
      </DialogContent>
    </Dialog>
  )
}
