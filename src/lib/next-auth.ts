import { type NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { db } from './db'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as NextAuthOptions['adapter'],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid profile email',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('[NextAuth signIn] user:', user?.email, 'provider:', account?.provider)
      if (account?.provider === 'google') {
        const email = user.email
        if (!email) {
          console.error('[NextAuth signIn] No email from Google')
          return false
        }
        try {
          await linkExistingUser(email, user.id)
        } catch (e) {
          console.error('[NextAuth signIn] linkExistingUser error:', e)
        }
      }
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        ;(session.user as { id?: string }).id = user.id
      }
      return session
    },
  },
  events: {
    async signIn({ user, account }) {
      console.log('[NextAuth event signIn] user:', user?.email, 'provider:', account?.provider)
    },
    async signOut() {
      console.log('[NextAuth event signOut]')
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'database' as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}

async function linkExistingUser(email: string, userId: string) {
  const tables: Array<{
    name: string
    update: () => Promise<unknown>
  }> = [
    {
      name: 'platformAdmin',
      update: () =>
        db.platformAdmin.updateMany({
          where: { email, userId: null },
          data: { userId },
        }),
    },
    {
      name: 'platformStaff',
      update: () =>
        db.platformStaff.updateMany({
          where: { email, userId: null },
          data: { userId },
        }),
    },
    {
      name: 'clinicAdmin',
      update: () =>
        db.clinicAdmin.updateMany({
          where: { email, userId: null },
          data: { userId },
        }),
    },
    {
      name: 'receptionist',
      update: () =>
        db.receptionist.updateMany({
          where: { email, userId: null },
          data: { userId },
        }),
    },
    {
      name: 'doctor',
      update: () =>
        db.doctor.updateMany({
          where: { email, userId: null },
          data: { userId },
        }),
    },
  ]

  for (const table of tables) {
    try {
      await table.update()
    } catch {
      // Table might not exist yet during setup
    }
  }
}
