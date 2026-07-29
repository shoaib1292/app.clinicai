/**
 * Structured JSON logger for ClinicAI.
 * Replaces console.log/error throughout the codebase.
 * Outputs JSON lines for log aggregation (Loki, CloudWatch, etc.).
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  ts: string
  msg: string
  module?: string
  clinicId?: string
  userId?: string
  [key: string]: unknown
}

function log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    ts: new Date().toISOString(),
    msg,
    ...meta,
  }
  const line = JSON.stringify(entry)
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG) {
      log('debug', msg, meta)
    }
  },
}
