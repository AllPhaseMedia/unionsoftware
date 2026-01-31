import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export interface AuthUser {
  id: string;
  supabaseUserId: string;
  email: string;
  name: string;
  role: "ADMIN" | "REPRESENTATIVE" | "VIEWER";
  organizationId: string;
  isActive: boolean;
}

export interface AuthUserWithOrg extends AuthUser {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

// Cached Supabase auth check - shared by all auth functions
// This ensures we only call Supabase once per request
// Using getSession() instead of getUser() for speed - session is read from cookie
// The middleware already validates the session, so this is safe
const getSupabaseUserId = cache(async (): Promise<string | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.user?.id || null;
  } catch (error) {
    console.error("Error getting Supabase session:", error);
    return null;
  }
});

// Internal: fetch user with org - always includes org data, cached once per request
const fetchUserWithOrg = cache(async (): Promise<AuthUserWithOrg | null> => {
  try {
    const supabaseUserId = await getSupabaseUserId();

    if (!supabaseUserId) {
      return null;
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseUserId },
      select: {
        id: true,
        supabaseUserId: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        isActive: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!dbUser) {
      return null;
    }

    return dbUser as AuthUserWithOrg;
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
export const getAuthUserWithOrg = cache(async (): Promise<AuthUserWithOrg | null> => {
  return fetchUserWithOrg();
});

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
