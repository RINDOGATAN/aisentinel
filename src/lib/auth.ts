import { type NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Resend } from "resend";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import { features } from "@/config/features";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const isDev = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";
// Local credentials login: dev mode, and sovereign/self-hosted deployments
// (NEXT_PUBLIC_LOCAL_AUTH_ENABLED=true — no external OAuth/mailer required
// behind the firm's own network).
const devAuthEnabled = features.devAuthEnabled && process.env.DISABLE_DEV_AUTH !== "true";
// Cross-app SSO: share session cookie across *.todo.law subdomains.
// Self-hosted/sovereign deployments set AUTH_COOKIE_DOMAIN="" to fall back to
// NextAuth's defaults (host-only cookie) — the todo.law domain only applies
// to the cloud deployment.
const cookieDomain =
  process.env.AUTH_COOKIE_DOMAIN !== undefined
    ? process.env.AUTH_COOKIE_DOMAIN || undefined
    : isProduction
      ? ".todo.law"
      : undefined;
// Cross-app SSO provider (accepts signed JWTs from sibling *.todo.law apps
// and Google access tokens). This is a CLOUD concern: on a sovereign box it
// would mint local accounts for any valid Google token, so it defaults ON
// only when running on Vercel and OFF everywhere else. CROSS_LOGIN_ENABLED
// overrides in either direction.
const crossLoginEnabled =
  process.env.CROSS_LOGIN_ENABLED !== undefined
    ? process.env.CROSS_LOGIN_ENABLED === "true"
    : Boolean(process.env.VERCEL);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    // Local credentials provider: dev mode, and sovereign/self-hosted
    // deployments (NEXT_PUBLIC_LOCAL_AUTH_ENABLED=true).
    ...(devAuthEnabled
      ? [
          CredentialsProvider({
            id: "dev-credentials",
            name: "Dev Login",
            credentials: {
              email: { label: "Email", type: "email", placeholder: "dev@example.com" },
            },
            async authorize(credentials) {
              // Double-check: never allow on the cloud (Vercel) deployment, and
              // never in a production build unless the sovereign local-auth
              // posture is explicitly enabled.
              if (
                process.env.VERCEL_ENV === "production" ||
                (process.env.NODE_ENV === "production" &&
                  process.env.NEXT_PUBLIC_LOCAL_AUTH_ENABLED !== "true")
              ) {
                console.error("Dev credentials provider blocked in production environment");
                return null;
              }
              if (!credentials?.email) return null;

              let user = await prisma.user.findUnique({
                where: { email: credentials.email },
              });

              if (!user) {
                user = await prisma.user.create({
                  data: {
                    email: credentials.email,
                    name: credentials.email.split("@")[0],
                  },
                });
              }

              return {
                id: user.id,
                email: user.email,
                name: user.name,
              };
            },
          }),
        ]
      : []),
    // Cross-domain SSO from startups.todo.law (cloud only; gated above)
    ...(crossLoginEnabled
      ? [
        CredentialsProvider({
          id: "cross-login",
          name: "Cross Login",
          credentials: {
            token: { type: "text" },
            method: { type: "text" },
          },
          async authorize(credentials) {
            if (!credentials?.token || !credentials?.method) return null;

            let email: string | undefined;
            let name: string | undefined;

            if (credentials.method === "magic-link") {
              const secret = process.env.CROSS_LOGIN_SECRET;
              if (!secret) {
                console.error("CROSS_LOGIN_SECRET is not configured");
                return null;
              }
              try {
                const { payload } = await jwtVerify(
                  credentials.token,
                  new TextEncoder().encode(secret)
                );
                email = payload.email as string | undefined;
                name = payload.name as string | undefined;
              } catch (err) {
                console.error("Cross-login JWT verification failed:", err);
                return null;
              }
            } else if (credentials.method === "google") {
              try {
                const res = await fetch(
                  `https://www.googleapis.com/oauth2/v3/userinfo`,
                  { headers: { Authorization: `Bearer ${credentials.token}` } }
                );
                if (!res.ok) {
                  console.error("Google userinfo request failed:", res.status);
                  return null;
                }
                const profile = await res.json();
                email = profile.email;
                name = profile.name;
              } catch (err) {
                console.error("Cross-login Google token verification failed:", err);
                return null;
              }
            } else {
              return null;
            }

            if (!email) return null;

            let user = await prisma.user.findUnique({
              where: { email },
            });

            if (!user) {
              user = await prisma.user.create({
                data: {
                  email,
                  name: name ?? email.split("@")[0],
                },
              });
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name,
            };
          },
        }),
      ]
      : []),
    // Google OAuth
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            authorization: {
              params: {
                prompt: "select_account",
              },
            },
            checks: ["state"],
          }),
        ]
      : []),
    // Email Magic Link
    ...(process.env.RESEND_API_KEY && resend
      ? [
          EmailProvider({
            from: `AI SENTINEL by TODO.LAW <${process.env.EMAIL_FROM || "noreply@todo.law"}>`,
            sendVerificationRequest: async ({ identifier: email, url }) => {
              try {
                await resend!.emails.send({
                  from: `AI SENTINEL by TODO.LAW <${process.env.EMAIL_FROM || "noreply@todo.law"}>`,
                  to: email,
                  subject: "Sign in to AI SENTINEL",
                  html: `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; overflow: hidden;">
                      <div style="padding: 24px 24px 16px; border-bottom: 1px solid #2a2a2a;">
                        <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 0.05em;">AI SENTINEL</span>
                        <span style="font-size: 13px; color: #a6a6a6; margin-left: 10px;">Cross-border AI Governance</span>
                      </div>
                      <div style="padding: 32px 24px;">
                        <p style="color: #e5e5e5; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">Click the button below to sign in to your AI SENTINEL account:</p>
                        <a href="${url}" style="display: inline-block; background: #f5a623; color: #1a1a1a; padding: 12px 28px; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 24px;">Sign In to AI SENTINEL</a>
                        <p style="color: #a6a6a6; font-size: 13px; line-height: 1.5; margin: 24px 0 0;">If you didn\u2019t request this email, you can safely ignore it.</p>
                      </div>
                      <div style="padding: 16px 24px; border-top: 1px solid #2a2a2a;">
                        <p style="color: #666666; font-size: 11px; margin: 0;">TODO.LAW\u2122 \u00b7 AI SENTINEL \u00b7 <a href="https://aisentinel.todo.law" style="color: #f5a623; text-decoration: none;">aisentinel.todo.law</a></p>
                      </div>
                    </div>
                  `,
                });
              } catch (error) {
                console.error("Failed to send verification email:", error);
                throw new Error("Failed to send verification email");
              }
            },
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      // Auto-join organization by email domain
      try {
        if (user.email) {
          const emailDomain = user.email.split("@")[1];

          const matchingOrg = await prisma.organization.findFirst({
            where: { domain: emailDomain },
          });

          if (matchingOrg) {
            const existingMembership = await prisma.organizationMember.findFirst({
              where: {
                organizationId: matchingOrg.id,
                userId: user.id,
              },
            });

            if (!existingMembership) {
              await prisma.organizationMember.create({
                data: {
                  organizationId: matchingOrg.id,
                  userId: user.id,
                  role: "MEMBER",
                },
              });

              await prisma.auditLog.create({
                data: {
                  organizationId: matchingOrg.id,
                  userId: user.id,
                  entityType: "OrganizationMember",
                  entityId: user.id,
                  action: "AUTO_JOIN",
                  changes: { domain: emailDomain, email: user.email },
                },
              });
            }
          }
        }
      } catch (error) {
        console.error("Auto-join organization failed during sign-in:", error);
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.userType = token.userType ?? null;
      }
      return session;
    },
    async jwt({ token, user, trigger, account, profile }) {
      if (user) {
        token.id = user.id;
      }
      // Fetch userType on sign-in or when session is updated (e.g. after persona selection)
      const userId = token.sub ?? (token.id as string | undefined);
      if ((user || trigger === "update") && userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { userType: true },
        });
        token.userType = dbUser?.userType ?? null;
      }
      // Sync email from OAuth provider on each sign-in (handles email changes)
      if (account?.provider === "google" && profile?.email) {
        token.email = profile.email;
        token.name = profile.name ?? token.name;
        // Update the user record if the email has changed
        try {
          if (token.sub && profile.email !== user?.email) {
            await prisma.user.update({
              where: { id: token.sub },
              data: { email: profile.email, name: profile.name ?? undefined },
            });
          }
        } catch (error) {
          console.error("Failed to sync user email from Google profile:", error);
        }
      }
      return token;
    },
  },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/verify-request",
    error: "/auth-error",
  },
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-aisentinel.session-token" : "aisentinel.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: isProduction,
        ...(cookieDomain && { domain: cookieDomain }),
      },
    },
    callbackUrl: {
      name: isProduction ? "__Secure-aisentinel.callback-url" : "aisentinel.callback-url",
      options: {
        sameSite: "lax" as const,
        path: "/",
        secure: isProduction,
        ...(cookieDomain && { domain: cookieDomain }),
      },
    },
    csrfToken: {
      name: "aisentinel.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: isProduction,
      },
    },
  },
  ...(isDev && {
    debug: true,
  }),
};
