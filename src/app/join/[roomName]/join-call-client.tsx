'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { VideoCall } from '@/components/video-call'
import { Video, ArrowRight } from 'lucide-react'

export function JoinCallClient({ roomUrl, roomName }: { roomUrl: string; roomName: string }) {
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const activatedRef = useRef(false)

  useEffect(() => {
    if (joined && !activatedRef.current) {
      activatedRef.current = true
      fetch('/api/dailyco/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName }),
      }).catch(() => {})
    }
  }, [joined, roomName])

  if (joined) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <VideoCall roomUrl={roomUrl} roomName={roomName} participantName={name} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20">
            <Video className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Join Video Call</h1>
            <p className="text-sm text-zinc-400 mt-1">Enter your name to join</p>
          </div>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-11 rounded-lg"
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) setJoined(true) }}
          />
          <Button
            onClick={() => setJoined(true)}
            disabled={!name.trim()}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
          >
            Join Call
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
