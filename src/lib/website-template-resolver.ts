import type { ClinicWebsiteData } from '@/components/website/blocks/types'

export function resolveTemplate(template: string, clinic: ClinicWebsiteData): string {
  let stats: Record<string, string> = {}
  if (clinic.clinicStats) {
    try { stats = JSON.parse(clinic.clinicStats) } catch { /* ignore */ }
  }

  const vars: Record<string, string> = {
    '{{clinic.name}}': clinic.name || '',
    '{{clinic.city}}': clinic.city || '',
    '{{clinic.phone}}': clinic.phone || '',
    '{{clinic.whatsapp}}': clinic.whatsappNumber || '',
    '{{clinic.address}}': clinic.address || '',
    '{{clinic.description}}': clinic.description || '',
    '{{clinic.tagline}}': clinic.tagline || '',
    '{{doctor.primary.name}}': clinic.doctors?.[0]?.name || '',
    '{{doctor.primary.speciality}}': clinic.doctors?.[0]?.speciality || '',
    '{{yearsOfExperience}}': stats.yearsOfExperience || '0',
    '{{totalPatients}}': stats.totalPatients || '0',
    '{{totalDoctors}}': stats.totalDoctors || '0',
  }

  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value)
  }
  return result
}

export function getDefaultHeading(clinic: ClinicWebsiteData): string {
  return `Your Health, Our Priority at {{clinic.name}}`
}
