// Pre-baked bilingual quick replies — clinic staff's most common responses
export const QUICK_REPLIES: { label: string; text: string; category: 'greeting' | 'booking' | 'payment' | 'info' }[] = [
  { label: 'Shukriya', text: 'Ap ko khoob shukriya, agar koi aur sawal ho to bataiye.', category: 'greeting' },
  { label: 'Aap kab aana chahte hain?', text: 'Aap kab aana chahte hain? Doctor ki available timings batata hoon.', category: 'booking' },
  { label: 'Fees info', text: 'Visiting fee PKR 1500 hoga, including consultation.', category: 'payment' },
  { label: 'Location share', text: 'Clinic ka address: <address>. Google Maps link share kar raha hoon.', category: 'info' },
  { label: 'Late ho gaye', text: 'Koi baat nahi, agle slot pe le lete hain. 15 min wait karein.', category: 'booking' },
  { label: 'Cancel karwana', text: 'Appointment cancel kar diya. Refund policy ke mutabiq process karenge.', category: 'booking' },
  { label: 'Payment confirm', text: 'Payment receive ho gayi, appointment confirm hai. Shukriya!', category: 'payment' },
  { label: 'Report le aayein', text: 'Pichli reports aur medicines le aaiye taake doctor review kar sakein.', category: 'info' },
]

export const CATEGORY_COLORS: Record<string, string> = {
  greeting: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  booking: 'bg-brand/10 text-brand border-brand/20',
  payment: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  info: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  general: 'bg-muted text-muted-foreground border-border',
}
