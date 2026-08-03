'use client'

import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import type { BlockProps, DoctorItem } from './types'

export function DoctorsBlock({ clinic, content }: BlockProps) {
  const doctors: DoctorItem[] | undefined = content?.doctors

  return (
    <section className="py-20 px-4" style={{ background: 'var(--website-bg)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <Badge variant="secondary" className="gap-1.5 font-semibold mb-4">Medical Team</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--website-text)', fontFamily: 'var(--website-font-heading)' }}>
            Our Doctors
          </h2>
          <p className="max-w-xl mx-auto text-base text-muted-foreground">
            Experienced specialists dedicated to your health and well-being.
          </p>
        </div>

        {doctors && doctors.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {doctors.map((doc) => (
              <motion.div
                key={doc.id}
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Card className="border text-center h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 flex flex-col items-center">
                    <Avatar className="w-20 h-20 mb-4 ring-2 ring-[var(--website-primary)] ring-offset-2">
                      <AvatarFallback
                        className="text-2xl font-bold text-white"
                        style={{ background: `linear-gradient(135deg, var(--website-primary), color-mix(in srgb, var(--website-primary) 70%, #000))` }}>
                        {doc.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold mb-1" style={{ color: 'var(--website-text)', fontFamily: 'var(--website-font-heading)' }}>
                      {doc.name}
                    </h3>
                    <p className="text-sm mb-2 text-muted-foreground">{doc.speciality}</p>
                    {doc.qualifications && (
                      <Badge variant="secondary" className="text-xs">{doc.qualifications}</Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Visit our{' '}
              <a href="/doctors" className="font-semibold underline" style={{ color: 'var(--website-primary)' }}>
                Doctors page
              </a>{' '}
              to see our full medical team.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
