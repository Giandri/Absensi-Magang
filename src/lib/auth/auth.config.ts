import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [], // Providers are defined in src/lib/auth.ts for Node.js runtime

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.phone = user.phone;
        token.address = user.address;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.phone = token.phone as string;
        session.user.address = token.address as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET || "rahasia-banget-ini-mah-12345",
};
