import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  password: z.string().min(1),
});

const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Operator",
      credentials: {
        password: { label: "Operator Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const operatorPassword = process.env.OPERATOR_PASSWORD;
        if (!operatorPassword) return null;

        if (parsed.data.password === operatorPassword) {
          return { id: "operator", name: "Operator", email: "operator@ipe.city" };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/dashboard/operator/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOperatorRoute = nextUrl.pathname.startsWith("/dashboard/operator");
      const isLoginPage = nextUrl.pathname === "/dashboard/operator/login";

      if (isLoginPage) return true;

      if (isOperatorRoute) {
        return isLoggedIn;
      }

      return true;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
