import { db } from '@/lib/db'
import { getOAuth2Client } from '@/lib/google-token-manager'

export interface BusinessProfileData {
  name?: string
  placeId?: string
  formattedAddress?: string
  phoneNumber?: string
  websiteUrl?: string
  rating?: number
  reviewCount?: number
  openingHours?: Record<string, unknown>
}

export async function syncBusinessProfile(
  connectionId: string,
  clinicId: string,
): Promise<BusinessProfileData | null> {
  const auth = await getOAuth2Client(connectionId)
  if (!auth) return null

  try {
    // Use Google My Business Account Management API to get the account
    const res = await auth.request({
      url: 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    })

    const data = res.data as { accounts?: Array<{ name: string; accountName: string }> }
    if (!data.accounts?.length) return null

    const accountName = data.accounts[0].name
    if (!accountName) return null

    // Get locations for the account
    const locRes = await auth.request({
      url: `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,metadata`,
    })

    const locs = locRes.data as { locations?: Array<Record<string, unknown>> }
    if (!locs.locations?.length) return null

    const location = locs.locations[0]
    const address = location.storefrontAddress as Record<string, string> | undefined
    const phones = location.phoneNumbers as Array<{ primaryPhone?: string }> | undefined

    const profile: BusinessProfileData = {
      name: location.title as string | undefined,
      placeId: (location.name as string)?.split('/').pop(),
      formattedAddress: address ? `${address.addressLines?.[0]}, ${address.locality}` : undefined,
      phoneNumber: phones?.[0]?.primaryPhone,
      websiteUrl: location.websiteUri as string | undefined,
      openingHours: location.regularHours as Record<string, unknown> | undefined,
    }

    // Store in DB
    await db.googleBusinessProfile.upsert({
      where: { connectionId },
      update: {
        name: profile.name,
        placeId: profile.placeId,
        formattedAddress: profile.formattedAddress,
        phoneNumber: profile.phoneNumber,
        websiteUrl: profile.websiteUrl,
        rating: profile.rating,
        reviewCount: profile.reviewCount,
        openingHours: profile.openingHours ? JSON.stringify(profile.openingHours) : null,
        syncedAt: new Date(),
      },
      create: {
        connectionId,
        name: profile.name,
        placeId: profile.placeId,
        formattedAddress: profile.formattedAddress,
        phoneNumber: profile.phoneNumber,
        websiteUrl: profile.websiteUrl,
        rating: profile.rating,
        reviewCount: profile.reviewCount,
        openingHours: profile.openingHours ? JSON.stringify(profile.openingHours) : null,
        syncedAt: new Date(),
      },
    })

    await db.googleAuditLog.create({
      data: {
        clinicId,
        connectionId,
        action: 'business_synced',
        metadata: JSON.stringify({ placeId: profile.placeId, name: profile.name }),
      },
    })

    return profile
  } catch (e) {
    console.error('[business-profile] Sync error:', e)
    return null
  }
}
