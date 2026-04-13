import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: "/dashboard/operator/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOperatorRoute = nextUrl.pathname.startsWith(
        "/dashboard/operator"
      );

      if (isOperatorRoute) {
        return isLoggedIn;
      }

      return true;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
