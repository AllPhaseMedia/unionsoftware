import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

// Super admin is identified by their Clerk user ID stored in env
const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_USER_IDS || "").split(",").filter(Boolean);

export async function isSuperAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;
  return SUPER_ADMIN_IDS.includes(userId);
}

export async function requireSuperAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  if (!SUPER_ADMIN_IDS.includes(userId)) {
    throw new Error("Forbidden: Super admin access required");
  }
  return userId;
}

// Generate an impersonation token for a user
export async function createImpersonationToken(targetUserId: string): Promise<string> {
  const superAdminId = await requireSuperAdmin();

  const client = await clerkClient();

  // Create an actor token that allows the super admin to act as the target user
  const token = await client.actorTokens.create({
    userId: targetUserId,
    actor: {
      sub: superAdminId,
    },
    expiresInSeconds: 3600, // 1 hour
  });

  return token.token;
}

// Get all organizations (for super admin)
export async function getAllOrganizations() {
  await requireSuperAdmin();

  const client = await clerkClient();
  const orgs = await client.organizations.getOrganizationList({ limit: 100 });

  return orgs.data;
}

// Get all users across all organizations (for super admin)
export async function getAllUsers() {
  await requireSuperAdmin();

  const client = await clerkClient();
  const users = await client.users.getUserList({ limit: 100 });

  return users.data;
}

// Get users in a specific organization
export async function getOrganizationMembers(organizationId: string) {
  await requireSuperAdmin();

  const client = await clerkClient();
  const members = await client.organizations.getOrganizationMembershipList({
    organizationId,
    limit: 100,
  });

  return members.data;
}
