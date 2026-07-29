import { redirect } from 'next/navigation'

export const metadata = { title: 'Finance — ClinicAI' }

export default function FinanceRedirectPage() {
  redirect('/dashboard/finance/proofs')
}
