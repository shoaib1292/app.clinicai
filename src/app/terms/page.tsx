import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service · ClinicAI",
  description: "Terms and conditions for using ClinicAI.",
}

const lastUpdated = "July 25, 2026"

export default function TermsPage() {
  return (
    <main className="min-h-screen content-container mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-sm font-medium text-muted-foreground">
        <Link href="/" className="hover:text-foreground underline underline-offset-2">
          ClinicAI
        </Link>{" "}
        / Legal
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {lastUpdated}
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/85">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p className="mt-3">
            By accessing or using ClinicAI (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;)
            services, including our website (<strong>clinicai.pk</strong>), web application
            (<strong>app.clinicai.pk</strong>), and all related services (collectively, the
            &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service.
            If you do not agree, do not use the Service.
          </p>
          <p className="mt-2">
            These Terms apply to all users of the Service, including clinic administrators,
            doctors, receptionists, finance staff, platform administrators, and patients.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
          <p className="mt-3">
            ClinicAI is a SaaS platform that provides AI-powered clinic management tools,
            including but not limited to:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>WhatsApp-based AI receptionist for patient booking and communication.</li>
            <li>Appointment scheduling, reminders, and follow-ups.</li>
            <li>Patient records and conversation management.</li>
            <li>Billing, payments, and financial tracking.</li>
            <li>Analytics, doctor performance, and feedback collection.</li>
            <li>Video consultations via integrated telemedicine tools.</li>
          </ul>
          <p className="mt-2">
            We reserve the right to modify, suspend, or discontinue any aspect of the Service
            at any time with reasonable notice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Account Registration</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>You must provide accurate, complete, and current information during registration.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You are responsible for all activities that occur under your account.</li>
            <li>You must notify us immediately of any unauthorized use of your account.</li>
            <li>You must be at least 18 years old to create an account.</li>
            <li>Each clinic may only maintain one account unless otherwise authorized.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Pricing and Payment</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>The core Service is <strong>free for clinics and hospitals</strong>.</li>
            <li>A fee of <strong>PKR 50 per appointment</strong> is charged to patients at the time of booking.</li>
            <li>Platform Admin sets all pricing rules (markup, markup ranges, default pricing). Clinics cannot modify pricing.</li>
            <li>New clinics receive <strong>PKR 1,000 in free credits</strong> upon signup.</li>
            <li>ClinicAI may change pricing with 30 days&rsquo; notice. Continued use after the change constitutes acceptance.</li>
            <li>All fees are non-refundable unless otherwise stated or required by applicable law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Acceptable Use</h2>
          <p className="mt-3">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Use the Service for any unlawful purpose or in violation of Pakistani law.</li>
            <li>Send spam, unsolicited messages, or engage in harassment through the platform.</li>
            <li>Upload or transmit viruses, malware, or any malicious code.</li>
            <li>Attempt to gain unauthorized access to any part of the Service or its systems.</li>
            <li>Use the Service to store or transmit protected health information (PHI) in violation of applicable healthcare regulations.</li>
            <li>Resell, sublicense, or commercially exploit the Service without authorization.</li>
            <li>Use automated means (bots, scrapers) to access the Service without permission.</li>
            <li>Misuse WhatsApp Business Platform features in violation of Meta&rsquo;s policies.</li>
            <li>Impersonate any person or entity, or falsely state your affiliation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. WhatsApp and Communication Compliance</h2>
          <p className="mt-3">
            Clinics using WhatsApp messaging features must:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Comply with Meta&rsquo;s WhatsApp Business Platform policies, including opt-in requirements.</li>
            <li>Only message patients who have consented to receive WhatsApp communications.</li>
            <li>Honor opt-out requests promptly.</li>
            <li>Not use the Service for prohibited content categories as defined by Meta (e.g., sale of prescription drugs, gambling, adult content).</li>
          </ul>
          <p className="mt-2">
            ClinicAI may suspend WhatsApp messaging features if a clinic violates these policies.
            Clinics are solely responsible for content sent through the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Data Ownership and Responsibility</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Clinics retain ownership of all patient data, appointment records, and communications uploaded to or generated through the Service.</li>
            <li>Clinics are responsible for the accuracy, legality, and appropriateness of all data they input.</li>
            <li>Clinics must obtain necessary patient consents for data collection and WhatsApp communication.</li>
            <li>ClinicAI acts as a data processor on behalf of clinics. Our data handling practices are detailed in our Privacy Policy.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">8. Intellectual Property</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>The Service, including its code, design, branding, logos, and content, is owned by ClinicAI and protected by copyright, trademark, and other intellectual property laws.</li>
            <li>You may not copy, modify, distribute, or create derivative works of the Service without our written permission.</li>
            <li>Feedback and suggestions you provide may be used by ClinicAI without obligation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">9. Third-Party Services</h2>
          <p className="mt-3">
            The Service integrates with third-party services including but not limited to Meta
            (WhatsApp), OpenAI (LLM), AssemblyAI/Soniox (speech-to-text), Daily.co (video),
            Brevo (email), and cloud infrastructure providers. ClinicAI is not responsible for
            the availability, accuracy, or practices of these third-party services. Use of
            third-party services may be subject to additional terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">10. Disclaimer of Warranties</h2>
          <p className="mt-3">
            THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
            WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
            IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
            NON-INFRINGEMENT.
          </p>
          <p className="mt-2">
            ClinicAI does not warrant that the Service will be uninterrupted, error-free, secure,
            or free of viruses or harmful components. AI-generated responses may contain errors;
            clinics should verify critical information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">11. Limitation of Liability</h2>
          <p className="mt-3">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CLINICAI SHALL NOT BE LIABLE FOR
            ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
            LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR RELATED TO THE SERVICE,
            WHETHER BASED ON WARRANTY, CONTRACT, TORT, OR ANY OTHER LEGAL THEORY.
          </p>
          <p className="mt-2">
            Our total liability for any claim arising from the Service shall not exceed the
            amount paid by you to ClinicAI in the twelve (12) months preceding the claim,
            or PKR 10,000, whichever is greater.
          </p>
          <p className="mt-2">
            ClinicAI is not liable for medical decisions made based on platform data. The Service
            is an administrative tool, not a medical device.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">12. Indemnification</h2>
          <p className="mt-3">
            You agree to indemnify and hold harmless ClinicAI, its affiliates, officers, and
            employees from any claims, damages, losses, or expenses (including legal fees)
            arising from your use of the Service, your violation of these Terms, or your
            violation of any third-party rights.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">13. Termination</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>You may stop using the Service at any time by closing your account.</li>
            <li>We may suspend or terminate your account for violation of these Terms with notice where practicable.</li>
            <li>Upon termination, your right to use the Service ceases immediately. We may retain data as required by law.</li>
            <li>Provisions that by their nature should survive termination (including ownership, disclaimers, liability, and indemnification) will survive.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">14. Governing Law</h2>
          <p className="mt-3">
            These Terms are governed by the laws of the Islamic Republic of Pakistan. Any disputes
            arising from these Terms shall be subject to the exclusive jurisdiction of the courts
            in Islamabad, Pakistan.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">15. Changes to Terms</h2>
          <p className="mt-3">
            We may update these Terms from time to time. We will notify you of material changes
            by email or through the Service. Continued use after the effective date of changes
            constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">16. Contact</h2>
          <p className="mt-3">
            For questions about these Terms, please contact:
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              Email:{" "}
              <a href="mailto:hello@clinicai.pk" className="underline underline-offset-2">
                hello@clinicai.pk
              </a>
            </li>
            <li>Phone: +92 309 129 2786</li>
            <li>Address: F-8 Markaz, Islamabad, Pakistan</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
