/**
 * ClinicAI — In-memory cache & queue (sandbox replacement for Redis).
 * In production, swap with Redis/ioredis. Same surface area: get/set/del,
 * lock, pub/sub, queue enqueue/worker.
 */

type LockEntry = { value: string; expiresAt: number }
type QueueItem = { id: string; data: unknown; enqueuedAt: number }

class MemoryStore {
  private kv = new Map<string, { value: unknown; expiresAt: number | null }>()
  private locks = new Map<string, LockEntry>()
  private channels = new Map<string, Set<(msg: unknown) => void>>()
  private queues = new Map<string, QueueItem[]>()
  private queueSeq = 0

  // ----- KV -----
  set(key: string, value: unknown, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
    this.kv.set(key, { value, expiresAt })
  }

  get<T = unknown>(key: string): T | null {
    const entry = this.kv.get(key)
    if (!entry) return null
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.kv.delete(key)
      return null
    }
    return entry.value as T
  }

  del(key: string): void {
    this.kv.delete(key)
  }

  // SET NX (only if not exists) — for dedup & locks
  setNx(key: string, value: unknown, ttlSeconds?: number): boolean {
    const existing = this.get(key)
    if (existing !== null) return false
    this.set(key, value, ttlSeconds)
    return true
  }

  // ----- Distributed lock (Redis NX pattern) -----
  async acquireLock(key: string, ttlSeconds = 300): Promise<string | null> {
    const token = Math.random().toString(36).slice(2)
    const ok = this.setNx(key, token, ttlSeconds)
    return ok ? token : null
  }

  releaseLock(key: string, token: string): boolean {
    const entry = this.kv.get(key)
    if (entry && entry.value === token) {
      this.kv.delete(key)
      return true
    }
    return false
  }

  // ----- Pub/Sub -----
  subscribe(channel: string, cb: (msg: unknown) => void): () => void {
    if (!this.channels.has(channel)) this.channels.set(channel, new Set())
    this.channels.get(channel)!.add(cb)
    return () => {
      this.channels.get(channel)?.delete(cb)
    }
  }

  publish(channel: string, msg: unknown): void {
    const subs = this.channels.get(channel)
    if (subs) subs.forEach((cb) => cb(msg))
    // Also broadcast to wildcard listeners
    const wildSubs = this.channels.get('*')
    if (wildSubs) wildSubs.forEach((cb) => cb({ channel, msg }))
  }

  // ----- Queue (BullMQ-lite) -----
  enqueue(queue: string, data: unknown): string {
    if (!this.queues.has(queue)) this.queues.set(queue, [])
    const id = `q${++this.queueSeq}`
    this.queues.get(queue)!.push({ id, data, enqueuedAt: Date.now() })
    return id
  }

  dequeue(queue: string): QueueItem | null {
    const q = this.queues.get(queue)
    if (!q || q.length === 0) return null
    return q.shift()!
  }

  queueLength(queue: string): number {
    return this.queues.get(queue)?.length ?? 0
  }

  // ----- Live clinic state (current token, queue depth) -----
  setCurrentToken(clinicId: string, doctorId: string, token: number): void {
    this.set(`clinic:${clinicId}:doctor:${doctorId}:current_token`, token)
  }

  getCurrentToken(clinicId: string, doctorId: string): number {
    return this.get<number>(`clinic:${clinicId}:doctor:${doctorId}:current_token`) ?? 0
  }

  // Snapshot for debugging
  stats() {
    return {
      kvSize: this.kv.size,
      channels: this.channels.size,
      queues: Array.from(this.queues.entries()).map(([k, v]) => ({ name: k, length: v.length })),
    }
  }
}

// Singleton
declare global {
  var __clinicsaiStore: MemoryStore | undefined
}

export const store = globalThis.__clinicsaiStore ?? new MemoryStore()
if (process.env.NODE_ENV !== 'production') globalThis.__clinicsaiStore = store
