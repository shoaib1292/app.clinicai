/**
 * Boot-time blog post backfill.
 * Seeding the two starter marketing posts here (idempotent, upsert by slug)
 * means the landing page's shared-DB blog has content immediately after a
 * fresh deploy without requiring a manual `prisma db push` + seed run.
 */
import { db } from '@/lib/db'

const STARTER_POSTS = [
  {
    slug: 'why-pakistani-clinics-need-an-ai-receptionist',
    title: 'Why Pakistani Clinics Need an AI Receptionist in 2026',
    excerpt:
      'Front-desk staff spend hours on calls and WhatsApp. An AI receptionist handles bookings, reminders, and follow-ups 24/7 — in Urdu and English.',
    contentMarkdown:
      "## The front desk is drowning\n\nClinic receptionists in Pakistan handle a constant stream of calls, WhatsApp messages, and walk-ins. Most of it is repetitive: appointment booking, rescheduling, reminders, and basic FAQs.\n\n## What an AI receptionist does\n\n- **Books appointments** over WhatsApp, 24/7\n- **Sends reminders** to reduce no-shows\n- **Answers FAQs** in Urdu and English\n- **Follows up** after visits for feedback\n\n## Why it matters\n\nNo-shows cost clinics revenue. Manual booking eats staff time. An AI receptionist fixes both — at zero extra headcount.\n\n## Getting started\n\nClinics can go live in minutes. Patients simply message the clinic's existing WhatsApp number.",
    coverImage: null,
    tags: ['AI', 'WhatsApp', 'Clinics'],
    author: 'ClinicAI Team',
    status: 'published',
    seoTitle: 'Why Pakistani Clinics Need an AI Receptionist',
    seoDescription:
      'How an AI receptionist on WhatsApp cuts no-shows and saves front-desk time for Pakistani clinics.',
    publishedAt: '2026-07-10T09:00:00.000Z',
  },
  {
    slug: 'reduce-clinic-no-shows-with-whatsapp-reminders',
    title: 'Reduce Clinic No-Shows with Automated WhatsApp Reminders',
    excerpt:
      'No-shows quietly drain revenue. Automated WhatsApp reminders and confirmations can cut them dramatically.',
    contentMarkdown:
      "## The hidden cost of no-shows\n\nEvery empty slot is lost revenue. For busy clinics, even a 10% no-show rate adds up fast.\n\n## How reminders help\n\n- Send an **appointment confirmation** the moment a slot is booked\n- A **24-hour reminder** the day before\n- A quick **confirm/ reschedule** reply option\n\n## Results\n\nClinics using automated WhatsApp reminders see fewer missed appointments and fuller schedules.\n\n## Try it\n\nSet up takes minutes — no new hardware, no new number required.",
    coverImage: null,
    tags: ['No-shows', 'Reminders', 'Automation'],
    author: 'ClinicAI Team',
    status: 'published',
    seoTitle: 'Reduce Clinic No-Shows with WhatsApp Reminders',
    seoDescription:
      'Cut no-shows with automated WhatsApp appointment reminders and confirmations for your clinic.',
    publishedAt: '2026-07-12T09:00:00.000Z',
  },
]

export async function ensureStarterBlogPosts(): Promise<void> {
  for (const post of STARTER_POSTS) {
    const existing = await db.blogPost.findFirst({ where: { slug: post.slug } })
    if (existing) continue
    await db.blogPost.create({
      data: {
        ...post,
        tags: JSON.stringify(post.tags),
        publishedAt: new Date(post.publishedAt),
      },
    })
  }
}
