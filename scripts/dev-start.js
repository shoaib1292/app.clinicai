/**
 * ClinicAI Dev Setup — Auto-starts PostgreSQL + Redis then runs Prisma migrate + dev
 * Usage: node scripts/dev-start.js
 */
const { execSync, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const PGDATA = path.join(ROOT, '.pgsql', 'data')
const PGBIN = path.join(ROOT, 'node_modules', '@embedded-postgres', 'windows-x64', 'native', 'bin')
const REDIS_BIN = path.join(process.env.USERPROFILE, 'redis', 'Redis-8.8.0-Windows-x64-msys2')
const REDIS_CONF = path.join(ROOT, 'scripts', 'redis.conf')

// Config matching .env
const DB_USER = 'clinicsai'
const DB_PASS = 'changeme'
const DB_NAME = 'clinicsai'
const DB_PORT = 5433
const REDIS_PASS = 'changeme'

function setupRedisConf() {
  fs.writeFileSync(REDIS_CONF, `
port 6379
requirepass ${REDIS_PASS}
appendonly yes
appendfsync everysec
save 300 1
maxmemory 2gb
maxmemory-policy allkeys-lru
logfile ""
dir "${path.join(ROOT, '.redis')}"
`.trim())
}

function ensurePGRunning() {
  const pgReady = (() => {
    try { execSync(`"${path.join(PGBIN, 'pg_isready.exe')}" -h 127.0.0.1 -p ${DB_PORT} -q`, { stdio: 'ignore' }); return true }
    catch { return false }
  })()

  if (pgReady) {
    console.log('[pg] Already running on port', DB_PORT)
    return
  }

  if (!fs.existsSync(PGDATA)) {
    console.log('[pg] Creating data directory...')
    fs.mkdirSync(PGDATA, { recursive: true })
    execSync(`"${path.join(PGBIN, 'initdb.exe')}" -D "${PGDATA}" -U ${DB_USER} --encoding=UTF8 --locale=C --no-instructions`, {
      cwd: ROOT,
      env: { ...process.env, PGLIB: path.join(ROOT, 'node_modules', '@embedded-postgres', 'windows-x64', 'native', 'lib') },
      stdio: 'pipe',
    })
    console.log('[pg] Data directory initialized.')
  }

  console.log('[pg] Starting PostgreSQL on port', DB_PORT, '...')
  spawn(
    `"${path.join(PGBIN, 'pg_ctl.exe')}"`,
    ['start', '-D', PGDATA, '-l', path.join(ROOT, '.pgsql', 'pg.log'), '-o', `-p ${DB_PORT}`],
    {
      cwd: ROOT,
      env: { ...process.env, PGLIB: path.join(ROOT, 'node_modules', '@embedded-postgres', 'windows-x64', 'native', 'lib') },
      shell: true,
      stdio: 'ignore',
      detached: false,
    },
  )

  // Wait for PG to be ready
  let attempts = 0
  while (attempts < 20) {
    try {
      execSync(`"${path.join(PGBIN, 'pg_isready.exe')}" -h 127.0.0.1 -p ${DB_PORT} -q`, { stdio: 'ignore' })
      console.log('[pg] Ready.')
      break
    } catch {
      attempts++
      if (attempts >= 20) {
        console.error('[pg] Failed to start after 20 attempts.')
        process.exit(1)
      }
    }
  }

  // Create database if not exists
  try {
    execSync(`"${path.join(PGBIN, 'createdb.exe')}" -h 127.0.0.1 -p ${DB_PORT} -U ${DB_USER} ${DB_NAME}`, {
      env: { ...process.env, PGUSER: DB_USER, PGPASSWORD: DB_PASS },
      stdio: 'pipe',
    })
  } catch { /* database already exists */ }
}

function ensureRedisRunning() {
  let redisReady = false
  try { execSync(`"${path.join(REDIS_BIN, 'redis-cli.exe')}" -a "${REDIS_PASS}" --no-auth-warning ping`, { stdio: 'pipe' }); redisReady = true }
  catch { /* not running */ }

  if (redisReady) {
    console.log('[redis] Already running.')
    return
  }

  setupRedisConf()

  console.log('[redis] Starting Redis...')
  spawn(
    `"${path.join(REDIS_BIN, 'redis-server.exe')}" "${REDIS_CONF}"`,
    [],
    {
      cwd: ROOT,
      shell: true,
      stdio: 'ignore',
      detached: false,
    },
  )

  // Wait for Redis to be ready
  let attempts = 0
  while (attempts < 10) {
    try {
      execSync(`"${path.join(REDIS_BIN, 'redis-cli.exe')}" -a "${REDIS_PASS}" --no-auth-warning ping`, { stdio: 'pipe' })
      console.log('[redis] Ready.')
      break
    } catch {
      attempts++
      if (attempts >= 10) {
        console.error('[redis] Failed to start.')
        process.exit(1)
      }
    }
  }
}

function runPrismaMigrate() {
  console.log('[prisma] Running migrate...')
  execSync('npx prisma migrate deploy', { cwd: ROOT, stdio: 'inherit' })
  console.log('[prisma] Done.')
}

// --- Main ---
console.log('=== ClinicAI Dev Setup ===')
ensurePGRunning()
ensureRedisRunning()
runPrismaMigrate()
console.log('=== Ready! Run: npm run dev ===')
