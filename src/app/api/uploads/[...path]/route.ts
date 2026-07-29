import { NextRequest } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'

// Serve files from the local `upload/` directory (payment screenshots, clinic
// logos) in dev / self-hosted setups where Cloudinary is not configured.
//
// Our storage layer writes local-fallback files as `/upload/<name>.png` but
// Next.js only serves the `public/` folder — so these links 404'd and the
// verification screenshots never opened. This route bridges that gap.
//
// `upload/` lives at the project root (cwd), which is outside `public/`, so it
// must be streamed manually. Path is sanitized to prevent traversal.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params
  const rel = segments.join('/')

  // Prevent path traversal: normalize and reject anything escaping the upload dir.
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '')
  if (safe.includes('..') || path.isAbsolute(safe)) {
    return new Response('Not found', { status: 404 })
  }

  const filePath = path.join(process.cwd(), 'upload', safe)
  try {
    const info = await stat(filePath)
    if (!info.isFile()) return new Response('Not found', { status: 404 })
    const buf = await readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const type = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'application/octet-stream'
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
