import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "google" && profile) {
        const p = profile as { sub?: string; email?: string; picture?: string };
        token.googleId = p.sub;
        token.picture = p.picture;
        if (p.email) token.email = p.email;
      }
      if (user?.email && !token.email) token.email = user.email;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub as string) ?? "";
        (session.user as { googleId?: string }).googleId = token.googleId as
          | string
          | undefined;
        const email = (token.email as string | undefined) ?? session.user.email;
        if (email) session.user.email = email;
      }
      return session;
    },
  },
  trustHost: true,
});
