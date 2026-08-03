'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { PhoneOff, Maximize2, Minimize2, Loader2, Mic, MicOff, Video, VideoOff } from 'lucide-react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useTracks,
  TrackReference,
  TrackToggle,
  useLocalParticipant,
  useDisconnectButton,
} from '@livekit/components-react'
import { Track } from 'livekit-client'

interface LiveKitCallProps {
  roomName: string
  identity: string
  displayName: string
  showEndButton?: boolean
  onEnd?: () => void
  onConnected?: () => void
}

function ElapsedTimer({ startTime }: { startTime: Date }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return <span className="text-white/70 text-sm tabular-nums">{mins}:{secs.toString().padStart(2, '0')}</span>
}

function EndCallButton({ roomName, onEnd, isEnding, setIsEnding }: {
  roomName: string
  onEnd?: () => void
  isEnding: boolean
  setIsEnding: (v: boolean) => void
}) {
  const handleEnd = async () => {
    setIsEnding(true)
    try {
      await fetch('/api/livekit/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName }),
      })
    } catch {
      // Best effort
    } finally {
      setIsEnding(false)
      onEnd?.()
    }
  }

  return (
    <button
      onClick={handleEnd}
      disabled={isEnding}
      className="bg-rose-500 hover:bg-rose-600 text-white rounded-full p-2.5 transition-colors disabled:opacity-50"
      title="End call"
    >
      {isEnding ? <Loader2 className="size-5 animate-spin" /> : <PhoneOff className="size-5" />}
    </button>
  )
}

function CustomControlBar({ roomName, onEnd, callStartTime }: {
  roomName: string
  onEnd?: () => void
  callStartTime: Date
}) {
  const [isEnding, setIsEnding] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFs)
    return () => document.removeEventListener('fullscreenchange', handleFs)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.body.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      // Not supported
    }
  }, [])

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
      <div className="flex items-center justify-between max-w-sm mx-auto">
        <ElapsedTimer startTime={callStartTime} />
        <div className="flex items-center gap-3">
          <TrackToggle source={Track.Source.Microphone} className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <MicOff className="size-5" />
            <Mic className="size-5" />
          </TrackToggle>
          <TrackToggle source={Track.Source.Camera} className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <VideoOff className="size-5" />
            <Video className="size-5" />
          </TrackToggle>
          <button
            onClick={toggleFullscreen}
            className="text-white/80 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
          >
            {isFullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </button>
          <EndCallButton roomName={roomName} onEnd={onEnd} isEnding={isEnding} setIsEnding={setIsEnding} />
        </div>
      </div>
    </div>
  )
}

export function LiveKitCall({ roomName, identity, displayName, showEndButton = true, onEnd, onConnected }: LiveKitCallProps) {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [callStarted, setCallStarted] = useState(false)
  const [startTime, setStartTime] = useState<Date>(new Date())
  const [callEnded, setCallEnded] = useState(false)

  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName, identity, name: displayName }),
        })
        const data = await res.json()
        if (data.ok) {
          setToken(data.data.token)
        } else {
          setError(data.error || 'Failed to get room token')
        }
      } catch (e) {
        setError('Unable to connect to video service. Please try again.')
      }
    }
    fetchToken()
  }, [roomName, identity, displayName])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-4">
        <PhoneOff className="size-10" />
        <p className="text-sm text-white/70">{error}</p>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-4">
        <Loader2 className="size-10 animate-spin text-white/60" />
        <p className="text-sm text-white/60">Connecting to room...</p>
      </div>
    )
  }

  if (callEnded) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-4">
        <PhoneOff className="size-10" />
        <p className="text-white">Call ended</p>
        {onEnd && (
          <Button variant="outline" onClick={onEnd}>Close</Button>
        )}
      </div>
    )
  }

  const handleEndCall = () => {
    setCallEnded(true)
    onEnd?.()
  }

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '80vh' }}>
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880'}
        connect={true}
        audio={true}
        video={true}
        onConnected={() => {
          setCallStarted(true)
          setStartTime(new Date())
          onConnected?.()
        }}
        data-lk-theme="default"
      >
        <VideoConference />
        <RoomAudioRenderer />
        {callStarted && (
          <CustomControlBar
            roomName={roomName}
            onEnd={handleEndCall}
            callStartTime={startTime}
          />
        )}
      </LiveKitRoom>
    </div>
  )
}

/** Wrapper that opens LiveKitCall inside a Dialog */
export function LiveKitCallDialog({
  open, onClose, roomName, identity, displayName, showEndButton,
}: {
  open: boolean
  onClose: () => void
  roomName: string
  identity: string
  displayName: string
  showEndButton?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-4xl p-2 bg-black/95 border-white/10">
        <DialogTitle className="sr-only">Video Call</DialogTitle>
        <LiveKitCall
          roomName={roomName}
          identity={identity}
          displayName={displayName}
          showEndButton={showEndButton}
          onEnd={() => { setTimeout(onClose, 2000) }}
        />
      </DialogContent>
    </Dialog>
  )
}
