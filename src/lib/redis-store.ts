/**
 * Redis-backed implementation of the MemoryStore interface.
 * Drop-in replacement when STORE_TYPE=redis is set in .env.
 *
 * Same surface area: get/set/del, lock, pub/sub, queue enqueue/dequeue.
 * Uses ioredis with automatic reconnection, TTL, and connection pooling.
 */
import Redis from 'ioredis'

type QueueItem = { id: string; data: unknown; enqueuedAt: number }

const QUEUE_PREFIX = 'bullmq:clinicai:'
const KV_PREFIX = 'kv:'
const LOCK_PREFIX = 'lock:'
const TOKEN_PREFIX = 'token:' // current clinic/doctor token

class RedisStore {
  private pub: Redis
  private sub: Redis
  private client: Redis
  private listeners = new Map<string, Set<(msg: unknown) => void>>()
  private queueCounterKey = 'redisstore:queue:seq'

  constructor(url?: string) {
    const redisUrl = url || process.env.REDIS_URL || 'redis://localhost:6379'

    // Use separate connections for pub/sub to comply with Redis protocol
    this.pub = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    })
    this.sub = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    })
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    })

    // Auto-connect and wire pub/sub message handling
    this.initPubSub()
  }

  private async initPubSub(): Promise<void> {
    try {
      await Promise.all([this.pub.connect(), this.sub.connect(), this.client.connect()])

      this.sub.on('message', (channel: string, message: string) => {
        try {
          const parsed = JSON.parse(message)
          const subs = this.listeners.get(channel)
          if (subs) subs.forEach((cb) => cb(parsed))
          // Wildcard listeners
          const wildSubs = this.listeners.get('*')
          if (wildSubs) wildSubs.forEach((cb) => cb({ channel, msg: parsed }))
        } catch {
          // If JSON parse fails, pass raw message
          const subs = this.listeners.get(channel)
          if (subs) subs.forEach((cb) => cb(message))
        }
      })
    } catch (err) {
      console.warn('[RedisStore] Connection failed, operations will fail:', err)
    }
  }

  // ===== KV =====

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const k = KV_PREFIX + key
    const v = typeof value === 'string' ? value : JSON.stringify(value)
    if (ttlSeconds) {
      await this.client.setex(k, ttlSeconds, v)
    } else {
      await this.client.set(k, v)
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const k = KV_PREFIX + key
    const val = await this.client.get(k)
    if (val === null) return null
    try {
      return JSON.parse(val) as T
    } catch {
      return val as unknown as T
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(KV_PREFIX + key)
  }

  async setNx(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    const k = KV_PREFIX + key
    const v = typeof value === 'string' ? value : JSON.stringify(value)
    if (ttlSeconds) {
      const result = await this.client.set(k, v, 'PX', ttlSeconds * 1000, 'NX')
      return result === 'OK'
    }
    const result = await this.client.setnx(k, v)
    return result === 1
  }

  // ===== Distributed Lock (Redis NX pattern) =====

  async acquireLock(key: string, ttlSeconds = 300): Promise<string | null> {
    const k = LOCK_PREFIX + key
    const token = Math.random().toString(36).slice(2)
    const result = await this.client.set(k, token, 'PX', ttlSeconds * 1000, 'NX')
    return result === 'OK' ? token : null
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    const k = LOCK_PREFIX + key
    // Use Lua script for atomic check-and-delete
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `
    const result = await this.client.eval(script, 1, k, token)
    return result === 1
  }

  // ===== Pub/Sub =====

  async subscribe(channel: string, cb: (msg: unknown) => void): Promise<() => Promise<void>> {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set())
      await this.sub.subscribe(channel)
    }
    this.listeners.get(channel)!.add(cb)
    return async () => {
      this.listeners.get(channel)?.delete(cb)
      if (this.listeners.get(channel)?.size === 0) {
        await this.sub.unsubscribe(channel)
        this.listeners.delete(channel)
      }
    }
  }

  async publish(channel: string, msg: unknown): Promise<void> {
    const v = typeof msg === 'string' ? msg : JSON.stringify(msg)
    await this.pub.publish(channel, v)
  }

  // ===== Queue (BullMQ-lite) =====

  async enqueue(queue: string, data: unknown): Promise<string> {
    const queueKey = QUEUE_PREFIX + queue
    const seq = await this.client.incr(this.queueCounterKey)
    const id = `q${seq}`
    const item: QueueItem = { id, data, enqueuedAt: Date.now() }
    await this.client.rpush(queueKey, JSON.stringify(item))
    return id
  }

  async dequeue(queue: string): Promise<QueueItem | null> {
    const queueKey = QUEUE_PREFIX + queue
    const raw = await this.client.lpop(queueKey)
    if (!raw) return null
    try {
      return JSON.parse(raw) as QueueItem
    } catch {
      return null
    }
  }

  async queueLength(queue: string): Promise<number> {
    return this.client.llen(QUEUE_PREFIX + queue)
  }

  // ===== Live clinic state =====

  async setCurrentToken(clinicId: string, doctorId: string, token: number): Promise<void> {
    await this.client.set(TOKEN_PREFIX + `clinic:${clinicId}:doctor:${doctorId}:current_token`, token)
  }

  async getCurrentToken(clinicId: string, doctorId: string): Promise<number> {
    const val = await this.client.get(TOKEN_PREFIX + `clinic:${clinicId}:doctor:${doctorId}:current_token`)
    return val ? Number(val) : 0
  }

  // ===== Stats =====

  async stats(): Promise<Record<string, unknown>> {
    const info = await this.client.info('keyspace')
    const dbsize = await this.client.dbsize()
    return {
      type: 'redis',
      dbsize,
      info: info?.split('\n').filter((l) => l.startsWith('db')).join(', ') || '',
    }
  }
}

export default RedisStore
