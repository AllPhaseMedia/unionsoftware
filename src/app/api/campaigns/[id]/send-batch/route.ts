import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { format } from "date-fns";
import nodemailer from "nodemailer";

// Get base URL for tracking links
function getBaseUrl(): string {
  // Use NEXT_PUBLIC_APP_URL if set, otherwise construct from VERCEL_URL or default to localhost
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

// Rewrite links in HTML to go through click tracking
function addClickTracking(html: string, emailId: string, baseUrl: string): string {
  // Match href attributes in anchor tags
  return html.replace(
    /href=["']([^"']+)["']/gi,
    (match, url) => {
      // Skip mailto:, tel:, and anchor links
      if (url.startsWith("mailto:") || url.startsWith("tel:") || url.startsWith("#")) {
        return match;
      }
      // Skip tracking URLs (prevent double-tracking)
      if (url.includes("/api/tracking/")) {
        return match;
      }
      // Encode the original URL
      const encodedUrl = Buffer.from(url).toString("base64");
      const trackingUrl = `${baseUrl}/api/tracking/click/${emailId}?url=${encodeURIComponent(encodedUrl)}`;
      return `href="${trackingUrl}"`;
    }
  );
}

// Add tracking pixel to HTML
function addTrackingPixel(html: string, emailId: string, baseUrl: string): string {
  const trackingPixel = `<img src="${baseUrl}/api/tracking/open/${emailId}" width="1" height="1" style="display:none;width:1px;height:1px;" alt="" />`;

  // Try to insert before closing body tag, or append at end
  if (html.includes("</body>")) {
    return html.replace("</body>", `${trackingPixel}</body>`);
  }
  if (html.includes("</div>")) {
    // Insert before the last closing div
    const lastDivIndex = html.lastIndexOf("</div>");
    return html.slice(0, lastDivIndex) + trackingPixel + html.slice(lastDivIndex);
  }
  return html + trackingPixel;
}

// Template variable replacements
function replaceTemplateVariables(template: string, data: Record<string, unknown>): string {
  let result = template;

  result = result.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split(".");
    let value: unknown = data;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return match;
      }
    }

    if (value instanceof Date) {
      return format(value, "MMMM d, yyyy");
    }

    return String(value ?? "");
  });

  return result;
}

// Get SMTP settings for organization
async function getSmtpSettings(organizationId: string) {
  const settings = await prisma.systemSetting.findMany({
    where: {
      organizationId,
      key: {
        in: [
          "smtp_host",
          "smtp_port",
          "smtp_secure",
          "smtp_user",
          "smtp_password",
          "smtp_from_email",
          "smtp_from_name",
          "smtp_enabled",
        ],
      },
    },
  });

  const settingsMap: Record<string, string> = {};
  for (const setting of settings) {
    settingsMap[setting.key] = setting.value;
  }

  return settingsMap;
}

// Create nodemailer transporter
function createTransporter(settings: Record<string, string>) {
  const port = parseInt(settings.smtp_port || "587", 10);
  const secure = settings.smtp_secure === "ssl";

  const config: nodemailer.TransportOptions = {
    host: settings.smtp_host,
    port,
    secure,
    auth:
      settings.smtp_user && settings.smtp_password
        ? {
            user: settings.smtp_user,
            pass: settings.smtp_password,
          }
        : undefined,
  } as nodemailer.TransportOptions;

  if (!secure && settings.smtp_secure === "tls") {
    (config as Record<string, unknown>).requireTLS = true;
  }

  return nodemailer.createTransport(config);
}

// POST /api/campaigns/[id]/send-batch - Send next batch of emails
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const dbUser = await getAuthUser();

    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const batchSize = Math.min(body.batchSize || 50, 100); // Max 100 per batch

    // Get campaign
    const campaign = await prisma.emailCampaign.findFirst({
      where: {
        id,
        organizationId: dbUser.organizationId,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "SENDING") {
      return NextResponse.json(
        { error: "Campaign must be in SENDING status to send emails" },
        { status: 400 }
      );
    }

    // Get SMTP settings
    const smtpSettings = await getSmtpSettings(dbUser.organizationId);
    const emailEnabled = smtpSettings.smtp_enabled === "true";

    if (!emailEnabled || !smtpSettings.smtp_host) {
      return NextResponse.json(
        { error: "SMTP is not configured. Please configure email settings first." },
        { status: 400 }
      );
    }

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: dbUser.organizationId },
    });

    // Get pending emails for this batch
    const pendingEmails = await prisma.campaignEmail.findMany({
      where: {
        campaignId: id,
        status: "PENDING",
      },
      include: {
        member: {
          include: { department: true },
        },
      },
      take: batchSize,
      orderBy: { createdAt: "asc" },
    });

    if (pendingEmails.length === 0) {
      // No more pending emails - complete the campaign
      await prisma.emailCampaign.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          processed: 0,
          sent: 0,
          failed: 0,
          remaining: 0,
          completed: true,
        },
        message: "Campaign completed - all emails have been processed",
      });
    }

    // Create transporter
    const transporter = createTransporter(smtpSettings);
    const fromName = smtpSettings.smtp_from_name || organization?.name || "UnionSoftware";
    const fromEmail = smtpSettings.smtp_from_email || smtpSettings.smtp_user;

    let sentCount = 0;
    let failedCount = 0;

    // Process each email
    for (const email of pendingEmails) {
      // Mark as sending
      await prisma.campaignEmail.update({
        where: { id: email.id },
        data: { status: "SENDING" },
      });

      try {
        // Build template data for this member
        const templateData: Record<string, unknown> = {
          member: {
            name: `${email.member.firstName} ${email.member.lastName}`,
            first_name: email.member.firstName,
            last_name: email.member.lastName,
            email: email.member.email || "",
            job_title: email.member.jobTitle || "",
            department: email.member.department?.name || "",
            hire_date: email.member.hireDate,
            status: email.member.status,
          },
          organization: {
            name: organization?.name || "",
          },
          current_date: new Date(),
        };

        // Replace variables
        const finalSubject = replaceTemplateVariables(campaign.subject, templateData);
        const finalBody = replaceTemplateVariables(campaign.body, templateData);

        // Convert to HTML
        let htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${finalBody.split("\n").map((line) => (line.trim() ? `<p>${line}</p>` : "<br>")).join("")}
          </div>
        `;

        // Add tracking (click tracking on links, open tracking pixel)
        const baseUrl = getBaseUrl();
        htmlBody = addClickTracking(htmlBody, email.id, baseUrl);
        htmlBody = addTrackingPixel(htmlBody, email.id, baseUrl);

        // Send email
        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: email.recipientEmail,
          subject: finalSubject,
          text: finalBody,
          html: htmlBody,
        });

        // Mark as sent
        await prisma.campaignEmail.update({
          where: { id: email.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
          },
        });

        sentCount++;
      } catch (err) {
        // Mark as failed
        const errorMessage = err instanceof Error ? err.message : "Unknown error";

        await prisma.campaignEmail.update({
          where: { id: email.id },
          data: {
            status: "FAILED",
            errorMessage,
            retryCount: email.retryCount + 1,
          },
        });

        failedCount++;
        console.error(`Failed to send email to ${email.recipientEmail}:`, errorMessage);
      }
    }

    // Update campaign counts
    const updatedCampaign = await prisma.emailCampaign.update({
      where: { id },
      data: {
        sentCount: { increment: sentCount },
        failedCount: { increment: failedCount },
      },
    });

    // Check remaining
    const remaining = await prisma.campaignEmail.count({
      where: {
        campaignId: id,
        status: "PENDING",
      },
    });

    // If no more pending, complete the campaign
    if (remaining === 0) {
      await prisma.emailCampaign.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: pendingEmails.length,
        sent: sentCount,
        failed: failedCount,
        remaining,
        completed: remaining === 0,
        totalSent: updatedCampaign.sentCount,
        totalFailed: updatedCampaign.failedCount,
      },
      message: remaining === 0
        ? "Campaign completed - all emails have been processed"
        : `Sent ${sentCount} emails, ${failedCount} failed, ${remaining} remaining`,
    });
  } catch (error) {
    console.error("Error sending batch:", error);
    return NextResponse.json(
      { error: "Failed to send batch" },
      { status: 500 }
    );
  }
}
