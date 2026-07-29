import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy · ClinicAI",
  description: "How ClinicAI collects, uses, and protects your data.",
}

const lastUpdated = "July 25, 2026"

export default function PrivacyPage() {
  return (
    <main className="min-h-screen content-container mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-sm font-medium text-muted-foreground">
        <Link href="/" className="hover:text-foreground underline underline-offset-2">
          ClinicAI
        </Link>{" "}
        / Legal
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {lastUpdated}
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/85">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
          <p className="mt-3">
            ClinicAI (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information
            when you use our website (<strong>clinicai.pk</strong>), our web application
            (<strong>app.clinicai.pk</strong>), and all related services (collectively, the &ldquo;Service&rdquo;).
          </p>
          <p className="mt-2">
            By using the Service, you agree to the collection and use of information in accordance
            with this policy. If you do not agree, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>

          <h3 className="mt-4 font-medium">2.1 Information You Provide</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Account Information:</strong> When you sign up, we collect your name, clinic name, email address, phone number, and password.</li>
            <li><strong>Clinic Data:</strong> Information about your clinic, including address, services offered, doctor profiles, staff details, and operating hours.</li>
            <li><strong>Patient Data:</strong> When clinics use our Service, we process patient names, WhatsApp numbers, appointment details, medical notes, and communication history on behalf of the clinic.</li>
            <li><strong>Payment Information:</strong> Billing details and transaction records for payments processed through the Service.</li>
            <li><strong>Communications:</strong> Messages exchanged between clinics and patients via WhatsApp through our platform, and communications with our support team.</li>
          </ul>

          <h3 className="mt-4 font-medium">2.2 Information Collected Automatically</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Usage Data:</strong> Pages visited, features used, time spent, and other diagnostic data.</li>
            <li><strong>Device Information:</strong> Browser type, IP address, device type, operating system.</li>
            <li><strong>Cookies:</strong> We use essential cookies for authentication and session management. We may also use analytics cookies to understand usage patterns.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
          <p className="mt-3">We use the collected information for the following purposes:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>To provide, maintain, and improve the Service.</li>
            <li>To process appointments, send WhatsApp reminders, and facilitate patient communication.</li>
            <li>To manage your account, provide customer support, and send service-related notifications.</li>
            <li>To process payments and maintain billing records.</li>
            <li>To detect, prevent, and address technical issues, fraud, or abuse.</li>
            <li>To comply with legal obligations under Pakistani law.</li>
            <li>To send administrative messages, updates, and security alerts.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Data Sharing and Disclosure</h2>
          <p className="mt-3">We do <strong>not</strong> sell your personal information. We may share data in the following limited circumstances:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Service Providers:</strong> Third-party vendors who help us operate the Service (cloud hosting, WhatsApp messaging via Meta/Evolution API, payment processing, email delivery, AI/LLM providers, speech-to-text services). These providers are contractually bound to protect your data.</li>
            <li><strong>Legal Requirements:</strong> If required by law, court order, or governmental authority in Pakistan.</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your data may be transferred as a business asset.</li>
            <li><strong>With Your Consent:</strong> We may share information for any other purpose with your explicit consent.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. WhatsApp Data and Communications</h2>
          <p className="mt-3">
            ClinicAI integrates with WhatsApp via Meta&rsquo;s Cloud API and Evolution API to enable
            patient communication. When your clinic uses our WhatsApp integration:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Patient messages and clinic responses are processed through our platform and stored for your clinic&rsquo;s records.</li>
            <li>We adhere to Meta&rsquo;s WhatsApp Business Platform policies and data handling requirements.</li>
            <li>Patient WhatsApp numbers and message content are treated as confidential patient data.</li>
            <li>Clinics are responsible for obtaining patient consent for WhatsApp communication.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Data Storage and Security</h2>
          <p className="mt-3">
            We implement appropriate technical and organizational security measures to protect your data,
            including encryption in transit (TLS) and at rest, access controls, and regular security reviews.
            Data is primarily stored on secure cloud infrastructure.
          </p>
          <p className="mt-2">
            While we strive to protect your information, no method of electronic storage or transmission
            is 100% secure. We cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Data Retention</h2>
          <p className="mt-3">
            We retain your account information for as long as your account is active. Patient data and
            communication records are retained for the duration of the clinic&rsquo;s use of the Service plus
            any legally required retention period. You may request deletion of your data by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">8. Your Rights</h2>
          <p className="mt-3">Depending on applicable law, you may have the right to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your data (&ldquo;right to be forgotten&rdquo;).</li>
            <li>Object to or restrict processing of your data.</li>
            <li>Data portability.</li>
            <li>Withdraw consent where processing is based on consent.</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us at{" "}
            <a href="mailto:hello@clinicai.pk" className="underline underline-offset-2">
              hello@clinicai.pk
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">9. Children&rsquo;s Privacy</h2>
          <p className="mt-3">
            The Service is not intended for individuals under the age of 18. We do not knowingly
            collect personal information from children. If we become aware that a child has provided
            us with personal data, we will delete it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">10. Third-Party Services</h2>
          <p className="mt-3">
            Our Service integrates with third-party services including Meta (WhatsApp), OpenAI, AssemblyAI,
            Soniox, Daily.co, Brevo, and cloud hosting providers. Each of these services has its own privacy
            policy, and we encourage you to review them. ClinicAI is not responsible for the privacy practices
            of these third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">11. International Data Transfers</h2>
          <p className="mt-3">
            Your data may be transferred to and processed in countries outside Pakistan where our
            service providers operate. We ensure appropriate safeguards are in place for such transfers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">12. Changes to This Policy</h2>
          <p className="mt-3">
            We may update this Privacy Policy from time to time. We will notify you of material changes
            via email or through the Service. Continued use of the Service after changes constitutes
            acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">13. Contact Us</h2>
          <p className="mt-3">
            If you have questions about this Privacy Policy, please contact us:
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
