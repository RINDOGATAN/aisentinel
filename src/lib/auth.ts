import { type NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Resend } from "resend";
import prisma from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const isDev = process.env.NODE_ENV === "development";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    // Development-only credentials provider
    ...(isDev
      ? [
          CredentialsProvider({
            id: "dev-credentials",
            name: "Dev Login",
            credentials: {
              email: { label: "Email", type: "email", placeholder: "dev@example.com" },
            },
            async authorize(credentials) {
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

            // Auto-provision all premium entitlements for privacycloud.com domain
            if (emailDomain === "privacycloud.com") {
              await autoProvisionEntitlements(matchingOrg.id, user.email, user.name ?? user.email);
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
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
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
  ...(isDev && {
    debug: true,
  }),
};

/**
 * Auto-provision all premium entitlements for an organization.
 * Used for internal domains (e.g., privacycloud.com) that get full access.
 */
async function autoProvisionEntitlements(
  organizationId: string,
  email: string,
  name: string
) {
  try {
    // Find or create the customer record
    let customer = await prisma.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name,
          email,
          type: "SAAS",
        },
      });
    }

    // Ensure customer-organization link
    await prisma.customerOrganization.upsert({
      where: {
        customerId_organizationId: {
          customerId: customer.id,
          organizationId,
        },
      },
      update: {},
      create: {
        customerId: customer.id,
        organizationId,
      },
    });

    // Get all active premium skill packages
    const skillPackages = await prisma.skillPackage.findMany({
      where: { isActive: true, isPremium: true },
    });

    // Create PERPETUAL entitlements for each (idempotent via upsert)
    for (const pkg of skillPackages) {
      await prisma.skillEntitlement.upsert({
        where: {
          customerId_skillPackageId: {
            customerId: customer.id,
            skillPackageId: pkg.id,
          },
        },
        update: {
          status: "ACTIVE",
          licenseType: "PERPETUAL",
        },
        create: {
          customerId: customer.id,
          skillPackageId: pkg.id,
          licenseType: "PERPETUAL",
          status: "ACTIVE",
          expiresAt: null,
        },
      });
    }

    console.log(`Auto-provisioned all premium entitlements for ${email} (org: ${organizationId})`);
  } catch (error) {
    console.error("Auto-provision entitlements failed:", error);
  }
}
