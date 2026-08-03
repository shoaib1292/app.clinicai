export function GradientBlob({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`absolute -z-10 transform-gpu overflow-hidden blur-3xl ${className || ''}`}>
      <div className="aspect-[1155/678] w-[36.125rem] max-w-none opacity-20 sm:w-[72.1875rem]"
        style={{
          background: `radial-gradient(circle at 50% 50%, var(--website-primary), var(--website-primary-light))`,
        }} />
    </div>
  )
}
