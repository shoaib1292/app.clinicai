/**
 * ClinicAI — Unified store (in-memory for sandbox, Redis for production).
 *
 * STORE_TYPE=redis switches to a Redis-backed implementation (drop-in same
 * surface area). All operations are async so callers await uniformly.
 */

import RedisStore from './redis-store'

export interface Store {
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>
  get<T = unknown>(key: string): Promise<T | null>
  del(key: string): Promise<void>
  setNx(key: string, value: unknown, ttlSeconds?: number): Promise<boolean>
  acquireLock(key: string, ttlSeconds?: number): Promise<string | null>
  releaseLock(key: string, token: string): Promise<boolean>
  subscribe(channel: string, cb: (msg: unknown) => void): Promise<() => Promise<void>>
  publish(channel: string, msg: unknown): Promise<void>
  enqueue(queue: string, data: unknown): Promise<string>
  dequeue(queue: string): Promise<{ id: string; data: unknown; enqueuedAt: number } | null>
  queueLength(queue: string): Promise<number>
  setCurrentToken(clinicId: string, doctorId: string, token: number): Promise<void>
  getCurrentToken(clinicId: string, doctorId: string): Promise<number>
  stats(): Promise<Record<string, unknown>> | Record<string, unknown>
}

class MemoryStore implements Store {
  private kv = new Map<string, { value: unknown; expiresAt: number | null }>()
  private channels = new Map<string, Set<(msg: unknown) => void>>()
  private queues = new Map<string, { id: string; data: unknown; enqueuedAt: number }[]>()
  private queueSeq = 0

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
    this.kv.set(key, { value, expiresAt })
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.kv.get(key)
    if (!entry) return null
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.kv.delete(key)
      return null
    }
    return entry.value as T
  }

  async del(key: string): Promise<void> {
    this.kv.delete(key)
  }

  async setNx(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    const existing = await this.get(key)
    if (existing !== null) return false
    await this.set(key, value, ttlSeconds)
    return true
  }

  async acquireLock(key: string, ttlSeconds = 300): Promise<string | null> {
    const token = Math.random().toString(36).slice(2)
    const ok = await this.setNx(key, token, ttlSeconds)
    return ok ? token : null
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    const val = await this.get(key)
    if (val === token) {
      await this.del(key)
      return true
    }
    return false
  }

  async subscribe(channel: string, cb: (msg: unknown) => void): Promise<() => Promise<void>> {
    if (!this.channels.has(channel)) this.channels.set(channel, new Set())
    this.channels.get(channel)!.add(cb)
    return async () => {
      this.channels.get(channel)?.delete(cb)
    }
  }

  async publish(channel: string, msg: unknown): Promise<void> {
    const subs = this.channels.get(channel)
    if (subs) subs.forEach((cb) => cb(msg))
    const wildSubs = this.channels.get('*')
    if (wildSubs) wildSubs.forEach((cb) => cb({ channel, msg }))
  }

  async enqueue(queue: string, data: unknown): Promise<string> {
    if (!this.queues.has(queue)) this.queues.set(queue, [])
    const id = `q${++this.queueSeq}`
    this.queues.get(queue)!.push({ id, data, enqueuedAt: Date.now() })
    return id
  }

  async dequeue(queue: string): Promise<{ id: string; data: unknown; enqueuedAt: number } | null> {
    const q = this.queues.get(queue)
    if (!q || q.length === 0) return null
    return q.shift()!
  }

  async queueLength(queue: string): Promise<number> {
    return this.queues.get(queue)?.length ?? 0
  }

  async setCurrentToken(clinicId: string, doctorId: string, token: number): Promise<void> {
    await this.set(`clinic:${clinicId}:doctor:${doctorId}:current_token`, token)
  }

  async getCurrentToken(clinicId: string, doctorId: string): Promise<number> {
    return (await this.get<number>(`clinic:${clinicId}:doctor:${doctorId}:current_token`)) ?? 0
  }

  stats() {
    return {
      type: 'memory',
      kvSize: this.kv.size,
      channels: this.channels.size,
      queues: Array.from(this.queues.entries()).map(([k, v]) => ({ name: k, length: v.length })),
    }
  }
}

const memoryStore = new MemoryStore()

// Lazily instantiate the Redis store only when STORE_TYPE=redis. RedisStore uses
// lazyConnect, so construction never opens a socket — safe even during build.
let redisStore: Store | null = null

function getStore(): Store {
  if (process.env.STORE_TYPE === 'redis') {
    if (!redisStore) redisStore = new RedisStore()
    return redisStore
  }
  return memoryStore
}

// Proxy — all methods delegate to the active backend. Preserves the exact same
// import/usage shape as the original `store` singleton.
export const store: Store = new Proxy({} as Store, {
  get(_target, prop: keyof Store) {
    const active = getStore()
    const value = active[prop]
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(active)
    }
    return value
  },
})
