import NextAuth from 'next-auth';
import Kakao from 'next-auth/providers/kakao';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Kakao],
  callbacks: {
    // JWT에 유저 고유 ID(sub) 유지
    jwt({ token }) {
      return token;
    },
    // 세션에 user.id 노출 → api.ts에서 X-Session-Id로 사용
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
