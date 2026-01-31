import { auth } from "@clerk/nextjs/server";
import { cache } from "react";
import prisma from "@/lib/prisma";

export type UserRole = "ADMIN" | "REPRESENTATIVE" | "VIEWER";

export interface AuthUser {
  id: string;
  clerkUserId: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  isActive: boolean;
}

export interface AuthUserWithOrg extends AuthUser {
  organization: {
    id: string;
    clerkOrgId: string;
    name: string;
    slug: string;
  };
}

// Map Clerk organization role to app role
function mapClerkRole(clerkRole: string | null | undefined): UserRole {
  if (clerkRole === "org:admin") return "ADMIN";
  if (clerkRole === "org:representative") return "REPRESENTATIVE";
  return "VIEWER";
}

// Internal: fetch user with org - always includes org data, cached once per request
const fetchUserWithOrg = cache(async (): Promise<AuthUserWithOrg | null> => {
  try {
    const { userId, orgId, orgRole } = await auth();

    if (!userId || !orgId) {
      return null;
    }

    // Get user from database (synced via webhook)
    const dbUser = await prisma.user.findFirst({
      where: {
        clerkUserId: userId,
        organization: {
          clerkOrgId: orgId,
        },
      },
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        isActive: true,
        organization: {
          select: {
            id: true,
            clerkOrgId: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!dbUser || !dbUser.isActive) {
      return null;
    }

    // Use Clerk role as source of truth, falling back to DB role
    const role = mapClerkRole(orgRole) || dbUser.role;

    return {
      ...dbUser,
      role,
    } as AuthUserWithOrg;
  } catch (error) {
    console.error("Error getting auth user:", error);
    return null;
  }
});

// Get basic user info - used by API routes (derives from cached fetchUserWithOrg)
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const user = await fetchUserWithOrg();
  if (!user) return null;

  // Return without org data
  const { organization, ...authUser } = user;
  return authUser;
});

// Get user with organization - used by dashboard layout
export const getAuthUserWithOrg = cache(
  async (): Promise<AuthUserWithOrg | null> => {
    return fetchUserWithOrg();
  }
);

// Helper to require authentication - throws if not authenticated
export const requireAuth = cache(async (): Promise<AuthUser> => {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
});

// Helper to require admin role
export const requireAdmin = cache(async (): Promise<AuthUser> => {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return user;
});
