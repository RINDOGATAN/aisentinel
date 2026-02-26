import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateImportApiKey } from "@/lib/import-auth";

export async function POST(request: Request) {
  if (!validateImportApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const userEmail = body.userEmail;

  if (!userEmail || typeof userEmail !== "string") {
    return NextResponse.json(
      { error: "userEmail is required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      organizationMemberships: {
        include: { organization: true },
        take: 1,
      },
    },
  });

  if (!user) {
    return NextResponse.json({
      hasAccount: false,
      hasOrg: false,
      orgId: null,
      orgName: null,
    });
  }

  const membership = user.organizationMemberships[0];

  if (!membership) {
    return NextResponse.json({
      hasAccount: true,
      hasOrg: false,
      orgId: null,
      orgName: null,
    });
  }

  return NextResponse.json({
    hasAccount: true,
    hasOrg: true,
    orgId: membership.organization.id,
    orgName: membership.organization.name,
  });
}
