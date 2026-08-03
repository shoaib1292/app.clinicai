import { db } from '@/lib/db'
import { JoinCallClient } from './join-call-client'

export const metadata = { title: 'Join Video Call — ClinicAI' }

export default async function JoinCallPage({ params }: { params: Promise<{ roomName: string }> }) {
  const { roomName } = await params

  const room = await db.dailyRoom.findUnique({
    where: { roomName },
    select: { id: true, roomName: true, roomUrl: true, status: true },
  })

  if (!room || room.status === 'ended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-3">
          <div className="text-4xl">📹</div>
          <h1 className="text-xl font-semibold text-white">Call Not Available</h1>
          <p className="text-sm text-zinc-400">
            {!room ? 'This call link is invalid or has expired.' : 'This call has already ended.'}
          </p>
        </div>
      </div>
    )
  }

  return <JoinCallClient roomName={room.roomName} />
}
