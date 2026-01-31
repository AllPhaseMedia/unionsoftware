import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("CLERK_WEBHOOK_SECRET is not set");
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Webhook verification failed", { status: 400 });
  }

  try {
    switch (evt.type) {
      case "organization.created": {
        const { id, name, slug } = evt.data;

        // Create Organization record
        const org = await prisma.organization.create({
          data: {
            clerkOrgId: id,
            name: name,
            slug: slug || id,
          },
        });

        // Create default step templates for the organization
        await prisma.stepTemplate.createMany({
          data: [
            {
              organizationId: org.id,
              name: "Verbal Discussion",
              stepNumber: 1,
              defaultDeadlineDays: 7,
            },
            {
              organizationId: org.id,
              name: "Written Grievance",
              stepNumber: 2,
              defaultDeadlineDays: 14,
            },
            {
              organizationId: org.id,
              name: "Formal Hearing",
              stepNumber: 3,
              defaultDeadlineDays: 21,
            },
            {
              organizationId: org.id,
              name: "Arbitration",
              stepNumber: 4,
              defaultDeadlineDays: 30,
            },
          ],
        });

        console.log(`Created organization: ${org.id} (${org.name})`);
        break;
      }

      case "organizationMembership.created": {
        const { organization, public_user_data, role } = evt.data;

        // Find the organization in our database
        const org = await prisma.organization.findUnique({
          where: { clerkOrgId: organization.id },
        });

        if (!org) {
          console.error(
            `Organization not found for clerkOrgId: ${organization.id}`
          );
          return new Response("Organization not found", { status: 404 });
        }

        // Determine role based on Clerk role
        let userRole: "ADMIN" | "REPRESENTATIVE" | "VIEWER" = "REPRESENTATIVE";
        if (role === "org:admin") {
          userRole = "ADMIN";
        } else if (role === "org:viewer") {
          userRole = "VIEWER";
        }

        // Check if user already exists in this org
        const existingUser = await prisma.user.findFirst({
          where: {
            clerkUserId: public_user_data.user_id,
            organizationId: org.id,
          },
        });

        if (existingUser) {
          // Reactivate if inactive
          if (!existingUser.isActive) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { isActive: true, role: userRole },
            });
            console.log(`Reactivated user: ${existingUser.id}`);
          }
        } else {
          // Create new user
          const firstName = public_user_data.first_name || "";
          const lastName = public_user_data.last_name || "";
          const name = `${firstName} ${lastName}`.trim() || "Unknown User";

          await prisma.user.create({
            data: {
              clerkUserId: public_user_data.user_id,
              email: public_user_data.identifier,
              name: name,
              organizationId: org.id,
              role: userRole,
              isActive: true,
            },
          });

          console.log(
            `Created user: ${public_user_data.identifier} in org ${org.name}`
          );
        }
        break;
      }

      case "organizationMembership.updated": {
        const { organization, public_user_data, role } = evt.data;

        // Find the organization
        const org = await prisma.organization.findUnique({
          where: { clerkOrgId: organization.id },
        });

        if (!org) {
          console.error(
            `Organization not found for clerkOrgId: ${organization.id}`
          );
          return new Response("Organization not found", { status: 404 });
        }

        // Determine role
        let userRole: "ADMIN" | "REPRESENTATIVE" | "VIEWER" = "REPRESENTATIVE";
        if (role === "org:admin") {
          userRole = "ADMIN";
        } else if (role === "org:viewer") {
          userRole = "VIEWER";
        }

        // Update user role
        await prisma.user.updateMany({
          where: {
            clerkUserId: public_user_data.user_id,
            organizationId: org.id,
          },
          data: { role: userRole },
        });

        console.log(
          `Updated user role: ${public_user_data.identifier} to ${userRole}`
        );
        break;
      }

      case "organizationMembership.deleted": {
        const { organization, public_user_data } = evt.data;

        // Find the organization
        const org = await prisma.organization.findUnique({
          where: { clerkOrgId: organization.id },
        });

        if (!org) {
          console.error(
            `Organization not found for clerkOrgId: ${organization.id}`
          );
          return new Response("Organization not found", { status: 404 });
        }

        // Deactivate user instead of deleting (preserve data integrity)
        await prisma.user.updateMany({
          where: {
            clerkUserId: public_user_data.user_id,
            organizationId: org.id,
          },
          data: { isActive: false },
        });

        console.log(`Deactivated user: ${public_user_data.identifier}`);
        break;
      }

      case "organization.updated": {
        const { id, name, slug } = evt.data;

        await prisma.organization.update({
          where: { clerkOrgId: id },
          data: {
            name: name,
            slug: slug || id,
          },
        });

        console.log(`Updated organization: ${id} (${name})`);
        break;
      }

      case "organization.deleted": {
        const { id } = evt.data;

        // Soft delete - just mark all users as inactive
        const org = await prisma.organization.findUnique({
          where: { clerkOrgId: id },
        });

        if (org) {
          await prisma.user.updateMany({
            where: { organizationId: org.id },
            data: { isActive: false },
          });
          console.log(`Deactivated all users in organization: ${id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${evt.type}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
