import { NextResponse } from 'next/server'
import { listTemplates } from '@/components/website/template-registry'
import { listThemes } from '@/components/website/theme-registry'

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      templates: listTemplates(),
      themes: listThemes(),
    },
  })
}
